-- AlterTable
ALTER TABLE "images" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'APPROVED';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "preferences" JSONB DEFAULT '{}';

-- CreateTable
CREATE TABLE "album_settings" (
    "album_id" UUID NOT NULL,
    "is_event" BOOLEAN NOT NULL DEFAULT false,
    "requires_approval" BOOLEAN NOT NULL DEFAULT true,
    "tagging_policy" TEXT NOT NULL DEFAULT 'HOST_ONLY',
    "expires_at" TIMESTAMPTZ(6),
    "allow_guest_uploads" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "album_settings_pkey" PRIMARY KEY ("album_id")
);

-- CreateTable
CREATE TABLE "user_storage_configs" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "access_key_id" TEXT NOT NULL,
    "secret_access_key" TEXT NOT NULL,
    "bucket" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "region" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_storage_configs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "album_settings" ADD CONSTRAINT "album_settings_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "albums"("album_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_storage_configs" ADD CONSTRAINT "user_storage_configs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
