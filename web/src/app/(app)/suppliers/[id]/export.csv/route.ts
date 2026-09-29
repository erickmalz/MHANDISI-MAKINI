import { reportExportRoute } from "@/lib/documents/report-export/route";

/** Report Export (CSV) — see `reportExportRoute`. */
export const GET = reportExportRoute("supplier-statement", "csv");
