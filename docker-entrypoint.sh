#!/bin/sh
set -e

echo "Warte auf Datenbank und wende Migrationen an..."
./node_modules/.bin/prisma migrate deploy

echo "Starte Anwendung..."
exec "$@"
