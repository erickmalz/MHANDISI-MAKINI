import type { reportFilters as enreportFilters } from "../en/reportFilters";
import type { Widen } from "../../types";

export const reportFilters: Widen<typeof enreportFilters> = {
  dimension: {
    stage: "Hatua",
    project: "Mradi",
    supplier: "Msambazaji",
    subcontractor: "Mkandarasi msaidizi",
    status: "Hali",
    kind: "Aina ya ombi",
    funding: "Hali ya ufadhili",
    dates: "Tarehe",
  },
  all: {
    stage: "Hatua zote",
    project: "Miradi yote",
    supplier: "Wasambazaji wote",
    subcontractor: "Wakandarasi wasaidizi wote",
    status: "Hali zote",
    kind: "Aina zote za maombi",
    funding: "Hali yoyote ya ufadhili",
  },
  kind: {
    base: "Ombi la msingi",
    additional: "Ombi la ziada",
  },
  range: {
    issued: "Imetumwa {range}",
    requested: "Imeombwa {range}",
    dated: "Tarehe {range}",
    from: "kuanzia {date}",
    until: "hadi {date}",
    fromLabel: "Kuanzia",
    toLabel: "Hadi",
  },
};
