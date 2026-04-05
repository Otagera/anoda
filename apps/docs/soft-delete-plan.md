# Soft Delete with 30-Day Retention Plan

## Overview

Implement soft delete with 30-day retention using BullMQ workers. Users can restore deleted albums/images within 30 days, after which they are permanently purged.

---

## Architecture

### Data Flow

```
User Delete → Soft Delete (deleted_at set) → 30-day grace period → Hard Delete (purge)
                                      ↑                              ↓
                                 Restore                Worker processes in chunks
```

### Key Components

1. **Database Schema** - Add `deleted_at` columns
2. **Query Filters** - Exclude soft-deleted by default
3. **Soft Delete Conversions** - Convert hard deletes to soft deletes
4. **Restore Functionality** - Allow restoring within 30 days
5. **Purge Worker** - Daily job to permanently delete records older than 30 days
6. **Usage Tracking** - Adjust usage on soft delete, restore on restore

---

## Implementation Details

### Phase 1: Database Schema Changes

#### Add `deleted_at` Columns

```prisma
model albums {
  // ... existing fields
  deleted_at DateTime? @db.Timestamptz(6)
}

model images {
  // ... existing fields
  deleted_at DateTime? @db.Timestamptz(6)
}
```

**Migration:** Generate and apply Prisma migration

---

### Phase 2: Update Query Functions

#### albums.model.ts

All fetch functions add `deleted_at: null` to where clause:

- `fetchAlbums` → add filter
- `fetchAlbum` → add filter  
- `getAlbums` → add filter
- `getAlbum` → add filter

#### images.model.ts

All fetch functions add `deleted_at: null` to where clause:

- `fetchImages` → add filter
- `fetchImage` → add filter
- `fetchImagesByIds` → add filter
- `fetchAllImages` → add filter

#### API Routes

Update routes that query albums/images to handle soft-deleted records:

- `pictures.route.ts` - exclude deleted images
- `albums.route.ts` - exclude deleted albums
- `public.route.ts` - public access should also filter deleted

---

### Phase 3: Convert Hard Deletes to Soft Delete

#### albums.model.ts

| Function | Current | New |
|----------|---------|-----|
| `deleteAlbumById` | Hard delete cascade | `UPDATE albums SET deleted_at = NOW()` |
| `deleteAlbumsByIds` | Hard delete | Soft delete all |
| `deleteAlbumsByUserId` | Hard delete | Soft delete all |

#### images.model.ts

| Function | Current | New |
|----------|---------|-----|
| `deleteImage` | Hard delete | Soft delete |
| `deleteImageById` | Hard delete | Soft delete |
| `deleteImagesByIds` | Hard delete | Soft delete all |
| `deleteImagesByUserId` | Hard delete | Soft delete all |
| `deleteAllImages` | Hard delete | Soft delete all |
| `deleteImagesWithLogging` | Hard delete | Soft delete |

**Key Change:** Replace `prisma.images.delete()` with:
```javascript
await prisma.images.update({
  where: { image_id: id },
  data: { deleted_at: new Date() }
});
```

**File Cleanup Decision:** Either:
- A) Clean up files immediately (current behavior)
- B) Defer file cleanup to purge worker

Recommendation: Option B - defer file cleanup to purge worker for consistency.

---

### Phase 4: Add Restore Functionality

#### albums.model.ts

```typescript
export const restoreAlbum = async (albumId, userId) => {
  return await prisma.albums.update({
    where: { album_id: albumId, created_by: userId, deleted_at: { not: null } },
    data: { deleted_at: null }
  });
};
```

#### images.model.ts

```typescript
export const restoreImage = async (imageId) => {
  return await prisma.images.update({
    where: { image_id: imageId, deleted_at: { not: null } },
    data: { deleted_at: null }
  });
};
```

#### API Endpoints

Add new routes:
- `POST /api/v1/albums/:albumId/restore` - Restore deleted album
- `POST /api/v1/images/:imageId/restore` - Restore deleted image

---

### Phase 5: Create Purge Worker

#### New Worker File

`apps/worker/src/queue/workers/purge.worker.js`

```javascript
const run = async (jobData) => {
  const THIRTY_DAYS_AGO = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const BATCH_SIZE = 500;

  // Step 1: Purge old images
  let purgedCount = 0;
  do {
    const oldImages = await prisma.images.findMany({
      where: { deleted_at: { lt: THIRTY_DAYS_AGO } },
      take: BATCH_SIZE
    });

    if (oldImages.length === 0) break;

    const imageIds = oldImages.map(img => img.image_id);

    // Delete faces (and embeddings)
    await prisma.faces.deleteMany({ where: { image_id: { in: imageIds } } });

    // Delete album_image links
    await prisma.album_images.deleteMany({ where: { image_id: { in: imageIds } } });

    // Delete files (local + R2)
    for (const img of oldImages) {
      await deleteFile(img.image_path);
      if (img.optimized_path) await deleteFile(img.optimized_path);
    }

    // Hard delete images
    await prisma.images.deleteMany({ where: { image_id: { in: imageIds } } });

    purgedCount += oldImages.length;
  } while (true);

  // Step 2: Purge old albums
  let albumPurgedCount = 0;
  do {
    const oldAlbums = await prisma.albums.findMany({
      where: { deleted_at: { lt: THIRTY_DAYS_AGO } },
      take: BATCH_SIZE
    });

    if (oldAlbums.length === 0) break;

    const albumIds = oldAlbums.map(album => album.album_id);

    // Delete album_settings
    await prisma.album_settings.deleteMany({ where: { album_id: { in: albumIds } } });

    // Hard delete albums
    await prisma.albums.deleteMany({ where: { album_id: { in: albumIds } } });

    albumPurgedCount += oldAlbums.length;
  } while (true);

  return {
    status: 'success',
    imagesPurged: purgedCount,
    albumsPurged: albumPurgedCount
  };
};
```

#### Register Worker

```javascript
// apps/worker/src/index.js
new QueueWorkersHandler(BULL_QUEUE_NAMES.PURGE_DELETED);
```

#### Add Queue

```typescript
// packages/utils/src/constants.util.ts
PURGE_DELETED: "purge_deleted",
```

#### Schedule Daily

In API or worker startup:

```javascript
await queueServices.purgeQueueLib.addJob(
  'purge-deleted',
  {},
  { repeat: { pattern: '0 3 * * *' } } // Daily at 3am
);
```

---

### Phase 6: Usage Tracking

#### On Soft Delete (immediate)

```typescript
// Already implemented in delete functions - usage reduced on soft delete
await logUsage(userId, 'storage', 'delete', -image.size);
await logUsage(userId, 'compute_unit', 'delete', -1);
```

#### On Restore

```typescript
// Add to restore functions
await logUsage(userId, 'storage', 'restore', image.size);
await logUsage(userId, 'compute_unit', 'restore', 1);
```

---

## File Changes Summary

| File | Changes |
|------|---------|
| `apps/api/prisma/schema.prisma` | Add `deleted_at` columns |
| `packages/models/src/albums.model.ts` | Add filters, convert to soft delete, add restore |
| `packages/models/src/images.model.ts` | Add filters, convert to soft delete, add restore |
| `apps/api/src/routes/albums.route.ts` | Add restore endpoint |
| `apps/api/src/routes/pictures.route.ts` | Add restore endpoint |
| `packages/utils/src/constants.util.ts` | Add `PURGE_DELETED` queue name |
| `apps/worker/src/queue/queue.service.ts` | Add purge queue |
| `apps/worker/src/queue/workers/purge.worker.js` | New file - purge logic |
| `apps/worker/src/index.js` | Register purge worker |

---

## Implementation Order

1. **Database** - Add schema + generate migration
2. **Query Filters** - Update all fetch functions (non-breaking)
3. **Soft Delete** - Convert delete functions (user-facing changes)
4. **Usage** - Ensure usage reduced on soft delete (already done)
5. **Restore** - Add restore functionality
6. **Purge Worker** - Create worker + schedule
7. **Testing** - Verify full flow

---

## Backward Compatibility Considerations

- Existing deleted data won't have `deleted_at` - set to `null` for existing records
- First purge run will need to handle records without `deleted_at` if they should be excluded

---

## Testing Checklist

- [ ] Soft delete sets `deleted_at` correctly
- [ ] Queries exclude soft-deleted records
- [ ] Restore clears `deleted_at` and restores usage
- [ ] Purge worker deletes records older than 30 days
- [ ] Purge worker cleans up files (local + R2)
- [ ] Usage logging works on soft delete and restore
- [ ] Orphan prevention (album_images cleanup) still works

---

## Questions for Future

- Should `deleted_at` apply to `users` table for account deletion?
- Should we add soft delete to other entities (e.g., `people`, `album_settings`)?