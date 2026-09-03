import "server-only";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { geocodeAddress } from "@/lib/geocode";
import type { OrganizationType } from "@prisma/client";

// Angenommene Spaltenüberschriften des Excel-Exports aus dem CRM.
// Sobald die tatsächliche Struktur vorliegt, hier die Spaltennamen anpassen.
const COLUMNS = {
  externalRef: ["ID", "CRM-ID", "Kürzel"],
  name: ["Name", "Verband", "Organisation"],
  type: ["Typ", "Art"],
  street: ["Straße", "Strasse", "Adresse"],
  postalCode: ["PLZ", "Postleitzahl"],
  city: ["Ort", "Stadt"],
  country: ["Land"],
  lat: ["Breitengrad", "Latitude", "Lat"],
  lng: ["Längengrad", "Longitude", "Lng", "Lon"],
  pkw: ["PKW"],
  van: ["VAN"],
  ktw: ["KTW"],
  nKtw: ["N-KTW", "NKTW", "N KTW"],
  rtw: ["RTW"],
  itw: ["ITW"],
  doctor: ["Ärzte", "Arzt"],
  temperingMattress: ["Tempurmatratze", "Tempur-Matratze", "Temperiermatratze"],
  highPerformance: ["Leistungsstark", "Leistungsfähig"],
  customers: ["Kunden", "Kunde"],
  contactName: ["Kontakt Name", "Ansprechpartner"],
  contactPhone: ["Kontakt Telefon", "Telefon"],
  contactEmail: ["Kontakt E-Mail", "E-Mail"],
  active: ["Aktiv"],
  notes: ["Notizen", "Bemerkung"],
} as const;

type RawRow = Record<string, unknown>;

function pick(row: RawRow, keys: readonly string[]): string | undefined {
  for (const key of keys) {
    const match = Object.keys(row).find(
      (k) => k.trim().toLowerCase() === key.trim().toLowerCase(),
    );
    if (match !== undefined) {
      const value = row[match];
      if (value === undefined || value === null) continue;
      const str = String(value).trim();
      if (str !== "") return str;
    }
  }
  return undefined;
}

function parseBool(value: string | undefined): boolean {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  return ["ja", "yes", "true", "1", "x", "wahr"].includes(v);
}

function parseType(value: string | undefined): OrganizationType {
  const v = (value ?? "").trim().toLowerCase();
  if (v.startsWith("kreisverband")) return "KREISVERBAND";
  if (v.startsWith("ortsverein")) return "ORTSVEREIN";
  return "EXTERN";
}

export type ImportRowResult = {
  row: number;
  name: string;
  status: "created" | "updated" | "error";
  message?: string;
};

export async function importOrganizationsFromBuffer(
  buffer: Buffer,
): Promise<ImportRowResult[]> {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: RawRow[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  const results: ImportRowResult[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 2; // +1 für 0-Index, +1 für Header-Zeile
    const name = pick(row, COLUMNS.name);

    if (!name) {
      results.push({
        row: rowNumber,
        name: "(ohne Namen)",
        status: "error",
        message: "Spalte 'Name' fehlt oder ist leer.",
      });
      continue;
    }

    try {
      const externalRef = pick(row, COLUMNS.externalRef);
      const street = pick(row, COLUMNS.street);
      const postalCode = pick(row, COLUMNS.postalCode);
      const city = pick(row, COLUMNS.city);
      const country = pick(row, COLUMNS.country) ?? "Deutschland";

      let lat = parseFloat(pick(row, COLUMNS.lat) ?? "");
      let lng = parseFloat(pick(row, COLUMNS.lng) ?? "");

      if ((isNaN(lat) || isNaN(lng)) && (street || city)) {
        const address = [street, postalCode, city, country]
          .filter(Boolean)
          .join(", ");
        const geo = await geocodeAddress(address);
        if (geo) {
          lat = geo.lat;
          lng = geo.lng;
        }
      }

      if (isNaN(lat) || isNaN(lng)) {
        results.push({
          row: rowNumber,
          name,
          status: "error",
          message:
            "Keine Koordinaten vorhanden und Adresse konnte nicht geokodiert werden.",
        });
        continue;
      }

      const customerNames = (pick(row, COLUMNS.customers) ?? "")
        .split(/[,;]/)
        .map((s) => s.trim())
        .filter(Boolean);

      const data = {
        name,
        externalRef: externalRef || null,
        type: parseType(pick(row, COLUMNS.type)),
        street: street ?? null,
        postalCode: postalCode ?? null,
        city: city ?? null,
        country,
        lat,
        lng,
        hasPkw: parseBool(pick(row, COLUMNS.pkw)),
        hasVan: parseBool(pick(row, COLUMNS.van)),
        hasKtw: parseBool(pick(row, COLUMNS.ktw)),
        hasNKtw: parseBool(pick(row, COLUMNS.nKtw)),
        hasRtw: parseBool(pick(row, COLUMNS.rtw)),
        hasItw: parseBool(pick(row, COLUMNS.itw)),
        hasDoctor: parseBool(pick(row, COLUMNS.doctor)),
        hasTemperingMattress: parseBool(pick(row, COLUMNS.temperingMattress)),
        isHighPerformance: parseBool(pick(row, COLUMNS.highPerformance)),
        contactName: pick(row, COLUMNS.contactName) ?? null,
        contactPhone: pick(row, COLUMNS.contactPhone) ?? null,
        contactEmail: pick(row, COLUMNS.contactEmail) ?? null,
        notes: pick(row, COLUMNS.notes) ?? null,
        active:
          pick(row, COLUMNS.active) === undefined
            ? true
            : parseBool(pick(row, COLUMNS.active)),
      };

      const existing = await prisma.organization.findFirst({
        where: externalRef ? { externalRef } : { name },
      });

      const org = existing
        ? await prisma.organization.update({
            where: { id: existing.id },
            data,
          })
        : await prisma.organization.create({ data });

      if (customerNames.length > 0) {
        const customers = await Promise.all(
          customerNames.map((cn) =>
            prisma.customer.upsert({
              where: { name: cn },
              update: {},
              create: { name: cn },
            }),
          ),
        );
        await prisma.organizationCustomer.deleteMany({
          where: { organizationId: org.id },
        });
        await prisma.organizationCustomer.createMany({
          data: customers.map((c) => ({
            organizationId: org.id,
            customerId: c.id,
          })),
          skipDuplicates: true,
        });
      }

      results.push({
        row: rowNumber,
        name,
        status: existing ? "updated" : "created",
      });
    } catch (err) {
      results.push({
        row: rowNumber,
        name,
        status: "error",
        message: err instanceof Error ? err.message : "Unbekannter Fehler",
      });
    }
  }

  return results;
}
