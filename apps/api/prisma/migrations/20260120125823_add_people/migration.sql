-- AlterTable
ALTER TABLE "faces" ADD COLUMN     "person_id" UUID;

-- CreateTable
CREATE TABLE "people" (
    "person_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "people_pkey" PRIMARY KEY ("person_id")
);

-- AddForeignKey
ALTER TABLE "faces" ADD CONSTRAINT "faces_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "people"("person_id") ON DELETE SET NULL ON UPDATE CASCADE;
