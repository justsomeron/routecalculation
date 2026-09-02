-- AlterTable
-- Erst nullable Spalte hinzufügen, bestehende Zeilen mit der bisherigen
-- Gesamtstrecke befüllen (vor dieser Funktion war die komplette Strecke
-- implizit "Patiententransport"), dann erst NOT NULL setzen. So funktioniert
-- die Migration auch, wenn "RouteRequest" bereits Einträge enthält.
ALTER TABLE "RouteRequest" ADD COLUMN     "patientDistanceM" DOUBLE PRECISION;

UPDATE "RouteRequest" SET "patientDistanceM" = "totalPatientRouteDistanceM"
WHERE "patientDistanceM" IS NULL;

ALTER TABLE "RouteRequest" ALTER COLUMN "patientDistanceM" SET NOT NULL;
