-- AlterTable
ALTER TABLE "albums" ADD COLUMN     "storage_config_id" UUID;

-- AddForeignKey
ALTER TABLE "albums" ADD CONSTRAINT "albums_storage_config_id_fkey" FOREIGN KEY ("storage_config_id") REFERENCES "user_storage_configs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
