import type { common as enCommon } from "../en/common";
import type { Widen } from "../../types";

export const common: Widen<typeof enCommon> = {
  required: "(inahitajika)",
  language: "Lugha",
  loading: "Inapakia",
  total: "Jumla",
  breadcrumb: "Njia ya kurasa",
  steps: "Hatua",
  health: {
    comfortable: "Hali nzuri",
    tight: "Finyu",
    underfunded: "Fedha hazitoshi",
    pending: "Fedha zinasubiriwa",
  },
  documents: {
    title: "Nyaraka",
    note: "Hutengenezwa upya kutoka kwenye rekodi iliyotumwa kila mara. PDF ndiyo nakala rasmi; JPG huonekana moja kwa moja inaposhirikishwa kwenye WhatsApp.",
    pdf: "PDF",
    jpg: "JPG",
  },
};
