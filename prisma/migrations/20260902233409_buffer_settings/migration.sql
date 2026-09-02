/*
  Warnings:

  - Added the required column `totalRoundTripWithBufferM` to the `RouteRequestCandidate` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "BufferMode" AS ENUM ('DEFAULT', 'CUSTOM', 'NONE');

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "bufferMode" "BufferMode" NOT NULL DEFAULT 'DEFAULT';

-- AlterTable
-- Nullable hinzufügen, mit dem bisherigen (ungepufferten) Wert befüllen -
-- vor dieser Funktion gab es keinen Puffer, "mit Puffer" = "ohne Puffer" -
-- dann erst NOT NULL setzen. So funktioniert die Migration auch, wenn
-- "RouteRequestCandidate" bereits Einträge enthält.
ALTER TABLE "RouteRequestCandidate" ADD COLUMN     "totalRoundTripWithBufferM" DOUBLE PRECISION;

UPDATE "RouteRequestCandidate" SET "totalRoundTripWithBufferM" = "totalRoundTripM"
WHERE "totalRoundTripWithBufferM" IS NULL;

ALTER TABLE "RouteRequestCandidate" ALTER COLUMN "totalRoundTripWithBufferM" SET NOT NULL;

-- CreateTable
CREATE TABLE "BufferTier" (
    "id" TEXT NOT NULL,
    "customerId" TEXT,
    "minKm" DOUBLE PRECISION NOT NULL,
    "maxKm" DOUBLE PRECISION,
    "bufferKm" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BufferTier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BufferTier_customerId_idx" ON "BufferTier"("customerId");

-- AddForeignKey
ALTER TABLE "BufferTier" ADD CONSTRAINT "BufferTier_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
