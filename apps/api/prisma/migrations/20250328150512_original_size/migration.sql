/*
  Warnings:

  - Added the required column `original_height` to the `images` table without a default value. This is not possible if the table is not empty.
  - Added the required column `original_width` to the `images` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "images" ADD COLUMN     "original_height" INTEGER NOT NULL,
ADD COLUMN     "original_width" INTEGER NOT NULL;
