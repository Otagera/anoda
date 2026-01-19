/*
  Warnings:

  - You are about to drop the column `creation_date` on the `images` table. All the data in the column will be lost.
  - You are about to drop the column `upload_time` on the `images` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "images" DROP COLUMN "creation_date",
DROP COLUMN "upload_time",
ADD COLUMN     "upload_date" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP;
