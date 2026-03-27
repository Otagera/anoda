-- CreateTable
CREATE TABLE "usage_logs" (
    "id" SERIAL NOT NULL,
    "user_id" UUID NOT NULL,
    "resource" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "timestamp" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_logs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "usage_logs" ADD CONSTRAINT "usage_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
