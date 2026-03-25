-- CreateTable
CREATE TABLE "ignored_faces" (
    "id" SERIAL NOT NULL,
    "person_id" UUID NOT NULL,
    "face_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ignored_faces_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ignored_faces_person_id_face_id_key" ON "ignored_faces"("person_id", "face_id");

-- AddForeignKey
ALTER TABLE "ignored_faces" ADD CONSTRAINT "ignored_faces_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "people"("person_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ignored_faces" ADD CONSTRAINT "ignored_faces_face_id_fkey" FOREIGN KEY ("face_id") REFERENCES "faces"("face_id") ON DELETE CASCADE ON UPDATE CASCADE;
