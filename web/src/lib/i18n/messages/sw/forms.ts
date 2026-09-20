import type { forms as enForms } from "../en/forms";
import type { Widen } from "../../types";

export const forms: Widen<typeof enForms> = {
  common: {
    saving: "Inahifadhi…",
    cancel: "Ghairi",
    status: "Hali",
    notes: "Maelezo",
    startedOn: "Ilianza tarehe",
    completedOn: "Ilikamilika tarehe",
    progressPercent: "Maendeleo (%)",
  },
  project: {
    numberLabel: "Namba ya mradi",
    numberNote: "hupewa wakati wa kuundwa na haibadiliki.",
    name: "Jina la mradi",
    clientName: "Jina la mteja",
    site: "Eneo la kazi",
    clientPhone: "Simu ya mteja",
    clientEmail: "Barua pepe ya mteja",
    template: {
      label: "Anza kwa kiolezo",
      hint: "Si lazima — kiolezo ni mahali pa kuanzia. Ondoa tiki kwenye chochote usichokitaka; bado unaweza kuongeza hatua na kazi mwenyewe baadaye.",
      none: "Hakuna — anza na mradi mtupu",
    },
    estimateModel: {
      label: "Mfumo wa makadirio",
      budget: "Bajeti — mteja hulipa gharama halisi ya vifaa",
      fixedPrice: "Bei maalum — mteja hulipa makadirio",
    },
    expectedCompletion: "Kukamilika kunakotarajiwa",
  },
  stage: {
    seqNote: "Hatua ya {seq} katika mfuatano wa mradi.",
    name: "Jina la hatua",
    feeBasis: {
      label: "Msingi wa ada ya usimamizi",
      notSet: "Haijawekwa bado",
      fixed: "Kiasi maalum",
      percent: "Asilimia ya gharama ya hatua",
    },
    fixedFee: "Ada maalum (TZS)",
    feePercent: "Asilimia ya ada",
  },
  task: {
    seqNote: "Kazi ya {seq} katika hatua hii.",
    description: "Maelezo ya kazi",
    descriptionPlaceholder: "mf. Ujenzi wa kuta za ghorofa ya chini hadi boriti ya juu",
    subcontractor: "Mkandarasi msaidizi",
    unassigned: "Hajapangiwa",
    labourAgreement: "Makubaliano ya vibarua (TZS)",
    labourHintLocked:
      "Imefungwa — Ombi la fedha la hatua hii limetumwa. Mabadiliko halisi hufanywa kwa kulibadilisha ombi hilo badala yake.",
    labourHintOriginal:
      "Bei iliyokubaliwa kwa kazi ya mkandarasi msaidizi huyu. Inapunguza fedha zinazopatikana ikishawekwa. Awali: {amount}.",
    labourHint:
      "Bei iliyokubaliwa kwa kazi ya mkandarasi msaidizi huyu. Inapunguza fedha zinazopatikana ikishawekwa.",
    takeOff: {
      title: "Orodha ya vifaa vinavyohitajika",
      introLocked:
        "Imefungwa — Ombi la fedha la hatua hii limetumwa, kwa hiyo jina la kipengee na kipimo vimegandishwa kama makadirio yaliyoidhinishwa. Badilisha kiasi au bei ili kurekodi marekebisho, ondoa mstari ili kuuacha, au ongeza mpya.",
      intro:
        "Makadirio yako ya vifaa kwa kazi hii. Si lazima sasa — yanalisha tofauti ya vifaa wakati wa kufunga na yanajaza awali oda za ununuzi.",
    },
    item: "Kipengee",
    quantity: "Kiasi",
    unit: "Kipimo",
    unitCost: "Bei ya kipimo (TZS)",
    ariaItem: "Kipengee cha kifaa, mstari {n}",
    ariaQuantity: "Kiasi, mstari {n}",
    ariaUnit: "Kipimo, mstari {n}",
    ariaUnitCost: "Bei ya kipimo (TZS), mstari {n}",
    ariaRemove: "Ondoa mstari wa kifaa {n}",
    original: "Awali: {qty} {unit} kwa bei ya",
    onSite: "Kwenye eneo la kazi: {qty} {unit}",
    applyFromStock: "Tumia kutoka akibani",
    ariaApplyFromStock: "Tumia kutoka akibani, mstari {n}",
    noLines: "Hakuna mistari ya vifaa bado.",
    addLine: "Ongeza mstari wa kifaa",
    estimatedCost: "Gharama inayokadiriwa ya vifaa",
    variationPlus:
      "Pamoja na {amount} kutoka kwa mabadiliko ya kazi yaliyoidhinishwa (yamerekodiwa tofauti — angalia badiliko husika).",
  },
  diary: {
    date: "Tarehe",
    weather: "Hali ya hewa",
    workersOnSite: "Wafanyakazi eneo la kazi",
    activities: "Shughuli kuu",
    materials: "Vifaa vilivyopokelewa / vilivyotumika",
    materialsHint: "Vifaa vilivyopokelewa na vifaa vikuu vilivyotumika, kwa pamoja kama maelezo moja.",
    equipment: "Mitambo iliyotumika",
    delays: "Ucheleweshaji",
    issues: "Matatizo",
    instructions: "Maagizo yaliyotolewa",
    visitors: "Wageni",
  },
};
