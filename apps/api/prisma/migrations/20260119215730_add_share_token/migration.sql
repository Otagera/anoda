/*
  Warnings:

  - A unique constraint covering the columns `[share_token]` on the table `albums` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "albums" ADD COLUMN     "share_token" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "albums_share_token_key" ON "albums"("share_token");
