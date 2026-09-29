import type { reportExport as enReportExport } from "../en/reportExport";
import type { Widen } from "../../types";

export const reportExport: Widen<typeof enReportExport> = {
  asOf: "Hadi {date}",
  filtered: "Imechujwa",
  figuresAsOfToday: "takwimu hadi leo",
  footer: "Takwimu hai za wakati ulioonyeshwa. Si ankara wala ombi la malipo.",
  totalFiltered: "Jumla (iliyochujwa)",
  project: "Mradi",
  client: "Mteja",
  site: "Eneo",
  statementFor: "Taarifa ya {name}",
  supplierStatement: "Taarifa ya msambazaji",
  subcontractorStatement: "Taarifa ya fundi mkandarasi",
  contact: "Mawasiliano",
  noRows: "Hakuna cha kuonyesha kwa vichujio hivi.",
  outstandingFiltered: "Kinachodaiwa (kilichochujwa)",
  columns: {
    status: "Hali",
    kind: "Aina",
    type: "Aina",
    date: "Tarehe",
    project: "Mradi",
    stage: "Hatua",
    reference: "Kumbukumbu",
    description: "Maelezo",
    amount: "Kiasi",
    charged: "Kilichotozwa",
    paid: "Kilicholipwa",
  },
  ledger: {
    order: "Oda",
    agreement: "Makubaliano",
    payment: "Malipo",
    cancelled: "{type} (imefutwa)",
    total: "Jumla",
    outstanding: "Salio linalodaiwa",
  },
  kind: {
    base: "Msingi",
    additional: "Nyongeza",
  },
};
