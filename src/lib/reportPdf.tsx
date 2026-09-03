import "server-only";
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Svg,
  Rect,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { ReportData } from "@/lib/reportData";

const COLORS = {
  primary: "#2563eb",
  dark: "#0f172a",
  muted: "#64748b",
  border: "#e2e8f0",
  bg: "#f8fafc",
  red: "#dc2626",
};

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: COLORS.dark,
  },
  title: { fontSize: 20, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  subtitle: { fontSize: 10, color: COLORS.muted, marginBottom: 20 },
  kpiRow: { flexDirection: "row", gap: 10, marginBottom: 24 },
  kpiBox: {
    flex: 1,
    backgroundColor: COLORS.bg,
    borderRadius: 6,
    padding: 12,
  },
  kpiValue: { fontSize: 20, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  kpiLabel: { fontSize: 8, color: COLORS.muted, textTransform: "uppercase" },
  sectionTitle: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    marginTop: 18,
    marginBottom: 10,
  },
  tableHeaderRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.dark,
    paddingBottom: 4,
    marginBottom: 4,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
    paddingVertical: 4,
  },
  th: { fontFamily: "Helvetica-Bold", fontSize: 9, color: COLORS.muted },
  td: { fontSize: 9 },
  colLabel: { flex: 3 },
  colCount: { flex: 1, textAlign: "right" },
  barRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  barLabel: { width: 90, fontSize: 9 },
  barCount: { width: 30, fontSize: 9, textAlign: "right", marginLeft: 6 },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    fontSize: 8,
    color: COLORS.muted,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  empty: { fontSize: 9, color: COLORS.muted, fontStyle: "italic" },
});

function formatDate(d: Date) {
  return new Intl.DateTimeFormat("de-DE", { dateStyle: "medium" }).format(d);
}

function BarChart({ rows }: { rows: { label: string; count: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  const barMaxWidth = 300;
  return (
    <View>
      {rows.map((r, i) => (
        <View key={i} style={styles.barRow}>
          <Text style={styles.barLabel}>{r.label}</Text>
          <Svg width={barMaxWidth} height={12}>
            <Rect
              x={0}
              y={0}
              width={Math.max(2, (r.count / max) * barMaxWidth)}
              height={12}
              fill={COLORS.primary}
              rx={2}
            />
          </Svg>
          <Text style={styles.barCount}>{r.count}</Text>
        </View>
      ))}
      {rows.length === 0 && <Text style={styles.empty}>Keine Daten im Zeitraum.</Text>}
    </View>
  );
}

function Table({ rows }: { rows: { label: string; count: number }[] }) {
  return (
    <View>
      <View style={styles.tableHeaderRow}>
        <Text style={[styles.th, styles.colLabel]}>Name</Text>
        <Text style={[styles.th, styles.colCount]}>Anfragen</Text>
      </View>
      {rows.map((r, i) => (
        <View key={i} style={styles.tableRow}>
          <Text style={[styles.td, styles.colLabel]}>{r.label}</Text>
          <Text style={[styles.td, styles.colCount]}>{r.count}</Text>
        </View>
      ))}
      {rows.length === 0 && <Text style={styles.empty}>Keine Daten im Zeitraum.</Text>}
    </View>
  );
}

function ReportDocument({ data, title }: { data: ReportData; title: string }) {
  return (
    <Document title={`${title} – Medical Operations Center`}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Medical Operations Center</Text>
        <Text style={styles.subtitle}>
          {title} · Zeitraum {formatDate(data.range.from)} – {formatDate(data.range.to)}
          {"  ·  "}erstellt am {formatDate(new Date())}
        </Text>

        <View style={styles.kpiRow}>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiValue}>{data.total}</Text>
            <Text style={styles.kpiLabel}>Anfragen gesamt</Text>
          </View>
          <View style={styles.kpiBox}>
            <Text
              style={[
                styles.kpiValue,
                data.emergencyCount > 0 ? { color: COLORS.red } : {},
              ]}
            >
              {data.emergencyCount}
            </Text>
            <Text style={styles.kpiLabel}>davon Notfalltransporte</Text>
          </View>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiValue}>
              {data.avgRoundTripKm !== null ? `${data.avgRoundTripKm} km` : "—"}
            </Text>
            <Text style={styles.kpiLabel}>Ø Gesamtumlauf (bester Transp.)</Text>
          </View>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiValue}>{data.activeDispatchers}</Text>
            <Text style={styles.kpiLabel}>aktive Disponenten</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Anfragen nach Fahrzeugtyp</Text>
        <BarChart rows={data.byVehicle} />

        <Text style={styles.sectionTitle}>Top 10 wirtschaftlichste Transporteure</Text>
        <Text style={[styles.subtitle, { marginBottom: 6 }]}>
          Anzahl der Anfragen, bei denen dieser Transporteur auf Platz 1 lag
        </Text>
        <Table rows={data.topOrganizations} />

        <Text style={styles.sectionTitle}>Anfragen nach Kunde</Text>
        <Table rows={data.byCustomer} />

        <Text style={styles.sectionTitle}>Anfragen je Disponent</Text>
        <Table rows={data.byDispatcher} />

        <View style={styles.footer} fixed>
          <Text>Medical Operations Center · Routenkalkulation</Text>
          <Text
            render={({ pageNumber, totalPages }) => `Seite ${pageNumber} / ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}

export async function renderReportPdf(data: ReportData, title: string): Promise<Buffer> {
  return renderToBuffer(<ReportDocument data={data} title={title} />);
}
