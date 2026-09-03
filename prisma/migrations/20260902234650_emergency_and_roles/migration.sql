-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'BUSINESS_DEVELOPMENT';

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "isHighPerformance" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "RouteRequest" ADD COLUMN     "isEmergency" BOOLEAN NOT NULL DEFAULT false;
