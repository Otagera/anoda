-- CreateTable
CREATE TABLE "album_images" (
    "album_images_id" UUID NOT NULL,
    "image_id" UUID,
    "album_id" UUID,

    CONSTRAINT "album_images_pkey" PRIMARY KEY ("album_images_id")
);

-- CreateTable
CREATE TABLE "albums" (
    "album_id" UUID NOT NULL,
    "album_name" TEXT,
    "created_by" UUID,
    "creation_date" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "shared_link" TEXT,

    CONSTRAINT "albums_pkey" PRIMARY KEY ("album_id")
);

-- CreateTable
CREATE TABLE "faces" (
    "face_id" SERIAL NOT NULL,
    "image_id" UUID,
    "embedding" REAL[],
    "bounding_box" JSONB,
    "processed_time" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "faces_pkey" PRIMARY KEY ("face_id")
);

-- CreateTable
CREATE TABLE "images" (
    "image_id" UUID NOT NULL,
    "image_path" TEXT NOT NULL,
    "upload_time" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "creation_date" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "update_date" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "images_pkey" PRIMARY KEY ("image_id")
);

-- CreateTable
CREATE TABLE "users" (
    "user_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
);

-- AddForeignKey
ALTER TABLE "album_images" ADD CONSTRAINT "album_images_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "albums"("album_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "album_images" ADD CONSTRAINT "album_images_image_id_fkey" FOREIGN KEY ("image_id") REFERENCES "images"("image_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "albums" ADD CONSTRAINT "albums_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "faces" ADD CONSTRAINT "faces_image_id_fkey" FOREIGN KEY ("image_id") REFERENCES "images"("image_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

