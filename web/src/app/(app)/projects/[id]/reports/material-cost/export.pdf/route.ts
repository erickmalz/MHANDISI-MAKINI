import { reportExportRoute } from "@/lib/documents/report-export/route";

/** Report Export (PDF) — see `reportExportRoute`. */
export const GET = reportExportRoute("material-cost", "pdf");
