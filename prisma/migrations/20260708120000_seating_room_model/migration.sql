-- AlterTable
ALTER TABLE "tables" DROP COLUMN "rotation",
ADD COLUMN     "locationHint" TEXT,
ADD COLUMN     "orientation" TEXT NOT NULL DEFAULT 'horizontal',
DROP COLUMN "shape",
ADD COLUMN     "shape" TEXT NOT NULL DEFAULT 'round';

-- DropEnum
DROP TYPE "TableShape";

-- CreateTable
CREATE TABLE "venue_features" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "width" DOUBLE PRECISION NOT NULL,
    "height" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "venue_features_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "venue_features_eventId_idx" ON "venue_features"("eventId");

-- AddForeignKey
ALTER TABLE "venue_features" ADD CONSTRAINT "venue_features_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
