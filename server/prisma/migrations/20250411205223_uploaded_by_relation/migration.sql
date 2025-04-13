-- DropForeignKey
ALTER TABLE "album_images" DROP CONSTRAINT "album_images_album_id_fkey";

-- DropForeignKey
ALTER TABLE "album_images" DROP CONSTRAINT "album_images_image_id_fkey";

-- DropForeignKey
ALTER TABLE "albums" DROP CONSTRAINT "albums_created_by_fkey";

-- DropForeignKey
ALTER TABLE "faces" DROP CONSTRAINT "faces_image_id_fkey";

-- AlterTable
ALTER TABLE "images" ADD COLUMN     "uploaded_by" UUID;

-- AddForeignKey
ALTER TABLE "album_images" ADD CONSTRAINT "album_images_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "albums"("album_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "album_images" ADD CONSTRAINT "album_images_image_id_fkey" FOREIGN KEY ("image_id") REFERENCES "images"("image_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "albums" ADD CONSTRAINT "albums_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faces" ADD CONSTRAINT "faces_image_id_fkey" FOREIGN KEY ("image_id") REFERENCES "images"("image_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "images" ADD CONSTRAINT "images_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
