-- AlterTable
ALTER TABLE "people" ADD COLUMN     "user_id" UUID;

-- AddForeignKey
ALTER TABLE "people" ADD CONSTRAINT "people_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
