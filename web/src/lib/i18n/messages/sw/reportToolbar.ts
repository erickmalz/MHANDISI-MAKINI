import type { reportToolbar as enreportToolbar } from "../en/reportToolbar";
import type { Widen } from "../../types";

export const reportToolbar: Widen<typeof enreportToolbar> = {
  label: "Vitendo vya ripoti",
  filters: "Vichujio",
  filtersCount: "Vichujio ({count})",
  more: "Zaidi",
  exportPdf: "Hamisha PDF",
  exportPdfHint: "Bora kwa ripoti ndefu",
  exportJpg: "Hamisha picha (JPG)",
  exportCsv: "Hamisha CSV (lahajedwali)",
  print: "Chapisha",
  shareFormats: {
    pdf: "Hati ya PDF",
    jpg: "Picha (JPG)",
    csv: "CSV (lahajedwali)",
  },
  sheet: {
    title: "Chuja ripoti hii",
    close: "Funga vichujio",
    all: "Zote",
    apply: "Tumia vichujio",
    clear: "Futa vichujio",
    empty: "Hakuna cha kuchuja bado.",
  },
  dimensions: {
    stage: "Hatua",
    project: "Mradi",
    supplier: "Msambazaji",
    subcontractor: "Mkandarasi msaidizi",
    status: "Hali",
    kind: "Aina",
    funding: "Hali ya fedha",
    from: "Kuanzia",
    to: "Hadi",
  },
  dateRange: {
    issued: "Imetumwa kati ya",
    requested: "Imeombwa kati ya",
    dated: "Tarehe kati ya",
  },
  filtered: "Imechujwa:",
  asOfToday: "takwimu ni za leo",
  clear: "Futa vichujio",
  removeFilter: "Ondoa kichujio: {label}",
  filteredTotals: "Jumla zinahusu safu zilizochujwa pekee.",
  noMatch: "Hakuna kinacholingana na vichujio hivi.",
};
