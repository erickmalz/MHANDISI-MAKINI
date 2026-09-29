import type { share as enShare } from "../en/share";
import type { Widen } from "../../types";

export const share: Widen<typeof enShare> = {
  action: "Shiriki",
  menuLabel: "Shiriki kama",
  formats: {
    pdf: "Faili la PDF",
    jpg: "Picha (JPG)",
    csv: "Jedwali (CSV)",
  },
  hints: {
    pdf: "Bora kwa ripoti ndefu",
    jpg: "Huonekana moja kwa moja kwenye gumzo",
    csv: "Hufunguka kwenye Excel au Sheets",
  },
  preparing: "Inaandaliwa…",
  ready: "Tayari: gusa kushiriki",
  retry: "Imeshindwa kuandaa faili. Gusa kujaribu tena.",
  downloaded: "Imehifadhiwa kwenye vipakuliwa vyako. Iambatishe kwenye WhatsApp kutoka hapo.",
};
