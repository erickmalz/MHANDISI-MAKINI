import type { stageTemplates as enStageTemplates } from "../en/stageTemplates";
import type { Widen } from "../../types";

export const stageTemplates: Widen<typeof enStageTemplates> = {
  pageTitle: "Violezo vya hatua",
  crumbProjects: "Miradi",
  crumbRegister: "Violezo vya hatua",
  list: {
    subtitle: "Orodha za Hatua → Kazi → Vifaa zinazoweza kutumika tena. Tumia moja unapoanzisha mradi, au tengeneza mpya kuanzia mwanzo.",
    new: "Kiolezo kipya",
    empty: "Hakuna violezo bado. Tengeneza kimoja kuanzia mwanzo, au fungua mradi na utumie “Hifadhi kama kiolezo” kunakili hatua na kazi zake.",
    stages: {
      one: "Hatua {count}",
      other: "Hatua {count}",
    },
    tasks: {
      one: "Kazi {count}",
      other: "Kazi {count}",
    },
    edit: "Hariri",
    delete: "Futa",
    loading: "Inapakia violezo vya hatua",
  },
  new: {
    pageTitle: "Kiolezo kipya cha hatua",
    title: "Kiolezo kipya",
    subtitle: "Majina na vipimo pekee — hakuna kiasi, bei wala gharama. Hivyo hujazwa kwa kila mradi baada ya kutumia kiolezo.",
    submit: "Hifadhi kiolezo",
  },
  edit: {
    pageTitle: "Hariri kiolezo cha hatua",
    title: "Hariri {name}",
    subtitle: "Mabadiliko hapa hayaathiri kamwe mradi uliokwisha kuanzishwa kwa kiolezo hiki.",
    submit: "Hifadhi mabadiliko",
  },
  form: {
    name: "Jina la kiolezo",
    namePlaceholder: "mf. Nyumba ya kawaida ya vyumba 3 vya kulala",
    stageName: "Jina la hatua ya {n}",
    stagePlaceholder: "mf. Msingi",
    removeStage: "Ondoa hatua ya {n}",
    taskName: "Jina la kazi",
    taskAria: "Jina la kazi (hatua ya {stage}, kazi ya {task})",
    taskPlaceholder: "mf. Uchimbaji",
    removeTask: "Ondoa kazi ya {n}",
    material: "Kifaa",
    materialAria: "Jina la kifaa cha {n}",
    materialPlaceholder: "mf. Saruji",
    unit: "Kipimo",
    unitAria: "Kipimo cha kifaa cha {n}",
    unitPlaceholder: "mf. mfuko",
    removeMaterial: "Ondoa kifaa cha {n}",
    addMaterial: "Ongeza kifaa",
    addTask: "Ongeza kazi",
    addStage: "Ongeza hatua",
    saving: "Inahifadhi…",
    cancel: "Ghairi",
  },
};
