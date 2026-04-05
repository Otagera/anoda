# Plan: Persistent Guest Sessions for Moderation Visibility

## Objective
Currently, when a guest uploads photos to an album that requires moderation, their pending photos are only visible to them *locally* in their current browser session (via the `UploadContext` state). If they close the tab or refresh the page, they lose visibility of their pending uploads until the host approves them.

The goal is to implement persistent guest tracking so that guests can return to the shared album link days later and still see their own `PENDING` photos (with the "Up for moderation" badge), while still preventing them from seeing other guests' pending photos.

## Proposed Solution

### 1. Database Updates
We need a way to link an uploaded image to a specific anonymous guest device/browser.
- **`images` table:** Add a new optional column, e.g., `guest_session_id` (String/UUID).

### 2. Backend Updates (API)
- **Guest Session Middleware/Hook:** Create a mechanism (e.g., in `apps/api/src/routes/public.route.ts`) that checks for a `guest_session_id` cookie on incoming requests to the public shared album routes. If one doesn't exist, generate a new UUID and set it as a long-lived, HTTP-only cookie.
- **Upload Route (`POST /public/albums/:token/upload`):** When a guest uploads an image, the backend should read their `guest_session_id` cookie and save it to the new `guest_session_id` column for those newly created images.
- **Fetch Album Route (`GET /public/albums/:token`):** Update the logic that retrieves the shared album. Currently, it only fetches `APPROVED` images. It needs to be updated to fetch:
  - All `APPROVED` images.
  - AND any `PENDING` images where the image's `guest_session_id` matches the `guest_session_id` cookie of the current request.
  - *Crucial:* The API must attach a flag to the response payload for these specific pending images (e.g., `isPending: true`) so the frontend knows how to style them.

### 3. Frontend Updates (Client)
- **Remove Local Hack:** Remove the logic in `apps/client/app/routes/sharedAlbum.tsx` that manually injects completed, pending upload tasks into the `displayedImages` array.
- **Rely on Server State:** Update the grid rendering logic to look for the `isPending` flag provided by the backend response, rather than the local `tasks` array. The "Up for moderation" badge will now be driven by server truth.
- **Ensure Credentials:** Ensure that requests to the `/public` endpoints are configured to send and receive cookies (e.g., `withCredentials: true` in Axios) so the `guest_session_id` cookie is properly exchanged.

## Security Considerations
- The `guest_session_id` cookie must be `HttpOnly` to prevent XSS exfiltration.
- The backend must strictly enforce that a guest can *only* ever see `PENDING` images that match their exact `guest_session_id` cookie. Under no circumstances should they be able to view another guest's pending uploads by guessing or omitting the cookie.

## Migration Path
When implementing this, existing `PENDING` images in the database won't have a `guest_session_id`. They will remain invisible to the guests who uploaded them (as they are now) until approved by the host. Only new guest uploads after the feature is deployed will benefit from persistent visibility.