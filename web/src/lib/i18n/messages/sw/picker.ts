import type { picker as enPicker } from "../en/picker";
import type { Widen } from "../../types";

export const picker: Widen<typeof enPicker> = {
  pageTitle: "Chagua mradi",
  title: "Chagua mradi",
  subtitle: "Fungua mradi mmoja ili uufanyie kazi. Unaweza kubadilisha mradi wakati wowote.",
  newProject: "Mradi mpya",
  empty: {
    title: "Hakuna miradi bado",
    body: "Akaunti yako haina kitu bado. Andaa mradi wako wa kwanza ili uanze kufuatilia hatua, fedha na gharama zake.",
    action: "Andaa mradi wako wa kwanza",
  },
  filter: {
    label: "Chuja miradi",
    hint: "Tafuta kwa jina, msimbo, mteja au eneo la kazi.",
    clear: "Futa kichujio",
    showing: "Inaonyesha miradi {shown} kati ya {total}.",
  },
  noMatch: {
    title: "Hakuna mradi unaolingana na “{query}”.",
    body: "Angalia tahajia, au futa kichujio ili uone miradi yote {count}.",
  },
  groups: {
    attention: "Inahitaji uangalizi",
    other: "Miradi mingine",
    all: "Miradi",
  },
  row: {
    noStage: "Hakuna hatua bado",
    alerts: { one: "Tahadhari {count}", other: "Tahadhari {count}" },
  },
};
