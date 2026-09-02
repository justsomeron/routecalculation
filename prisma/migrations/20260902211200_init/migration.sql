-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'DISPATCHER');

-- CreateEnum
CREATE TYPE "TokenPurpose" AS ENUM ('INVITE', 'PASSWORD_RESET');

-- CreateEnum
CREATE TYPE "OrganizationType" AS ENUM ('KREISVERBAND', 'ORTSVEREIN', 'EXTERN');

-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('PKW', 'VAN', 'KTW', 'N_KTW', 'RTW', 'ITW');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT,
    "role" "Role" NOT NULL DEFAULT 'DISPATCHER',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "invitedById" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Token" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "purpose" "TokenPurpose" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "OrganizationType" NOT NULL,
    "externalRef" TEXT,
    "street" TEXT,
    "postalCode" TEXT,
    "city" TEXT,
    "country" TEXT NOT NULL DEFAULT 'Deutschland',
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "hasPkw" BOOLEAN NOT NULL DEFAULT false,
    "hasVan" BOOLEAN NOT NULL DEFAULT false,
    "hasKtw" BOOLEAN NOT NULL DEFAULT false,
    "hasNKtw" BOOLEAN NOT NULL DEFAULT false,
    "hasRtw" BOOLEAN NOT NULL DEFAULT false,
    "hasItw" BOOLEAN NOT NULL DEFAULT false,
    "hasDoctor" BOOLEAN NOT NULL DEFAULT false,
    "hasTemperingMattress" BOOLEAN NOT NULL DEFAULT false,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationCustomer" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,

    CONSTRAINT "OrganizationCustomer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RouteRequest" (
    "id" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "customerId" TEXT,
    "vehicleType" "VehicleType" NOT NULL,
    "needsDoctor" BOOLEAN NOT NULL DEFAULT false,
    "needsTemperingMattress" BOOLEAN NOT NULL DEFAULT false,
    "startAddress" TEXT NOT NULL,
    "startLat" DOUBLE PRECISION NOT NULL,
    "startLng" DOUBLE PRECISION NOT NULL,
    "destinationAddress" TEXT NOT NULL,
    "destLat" DOUBLE PRECISION NOT NULL,
    "destLng" DOUBLE PRECISION NOT NULL,
    "totalPatientRouteDistanceM" DOUBLE PRECISION NOT NULL,
    "routeGeoJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RouteRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RouteRequestStop" (
    "id" TEXT NOT NULL,
    "routeRequestId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "address" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "RouteRequestStop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RouteRequestCandidate" (
    "id" TEXT NOT NULL,
    "routeRequestId" TEXT NOT NULL,
    "organizationId" TEXT,
    "organizationName" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "toStartDistanceM" DOUBLE PRECISION NOT NULL,
    "fromDestDistanceM" DOUBLE PRECISION NOT NULL,
    "totalRoundTripM" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "RouteRequestCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Token_tokenHash_key" ON "Token"("tokenHash");

-- CreateIndex
CREATE INDEX "Token_userId_idx" ON "Token"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_externalRef_key" ON "Organization"("externalRef");

-- CreateIndex
CREATE INDEX "Organization_lat_lng_idx" ON "Organization"("lat", "lng");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_name_key" ON "Customer"("name");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationCustomer_organizationId_customerId_key" ON "OrganizationCustomer"("organizationId", "customerId");

-- CreateIndex
CREATE INDEX "RouteRequest_requestedById_idx" ON "RouteRequest"("requestedById");

-- CreateIndex
CREATE INDEX "RouteRequest_createdAt_idx" ON "RouteRequest"("createdAt");

-- CreateIndex
CREATE INDEX "RouteRequestCandidate_routeRequestId_idx" ON "RouteRequestCandidate"("routeRequestId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Token" ADD CONSTRAINT "Token_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationCustomer" ADD CONSTRAINT "OrganizationCustomer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationCustomer" ADD CONSTRAINT "OrganizationCustomer_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteRequest" ADD CONSTRAINT "RouteRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteRequest" ADD CONSTRAINT "RouteRequest_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteRequestStop" ADD CONSTRAINT "RouteRequestStop_routeRequestId_fkey" FOREIGN KEY ("routeRequestId") REFERENCES "RouteRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteRequestCandidate" ADD CONSTRAINT "RouteRequestCandidate_routeRequestId_fkey" FOREIGN KEY ("routeRequestId") REFERENCES "RouteRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteRequestCandidate" ADD CONSTRAINT "RouteRequestCandidate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
