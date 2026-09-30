import type { tasks as enTasks } from "../en/tasks";
import type { Widen } from "../../types";

export const tasks: Widen<typeof enTasks> = {
  new: {
    pageTitle: "Ongeza kazi",
    title: "Ongeza kazi",
    subtitle: "Hii itakuwa kazi ya {seq} katika {stage}.",
    submit: "Ongeza kazi",
  },
  edit: {
    pageTitle: "Hariri kazi",
    title: "Hariri kazi",
    submit: "Hifadhi mabadiliko",
    cannotDelete:
      "Kazi hii ina malipo ya fundi yaliyorekodiwa, kwa hiyo haiwezi kufutwa — weka hali yake iwe {cancelled} badala yake.",
    delete: "Futa kazi hii",
    deleteNote:
      "Inaondoa kazi na orodha yake ya vifaa. Makubaliano yake ya fundi yanaacha kuhesabiwa dhidi ya hatua.",
  },
  labour: {
    title: "Malipo ya fundi",
    outstanding: "Kilichobaki kulipwa",
    none: "Hakuna malipo yaliyorekodiwa bado.",
    voided: "Imebatilishwa",
    voidedWithReason: "Imebatilishwa — {reason}",
    voidPayment: "Batilisha malipo",
    needAgreement: "Weka kiasi cha makubaliano ya fundi hapo juu kabla ya kurekodi malipo.",
    record: {
      title: "Rekodi malipo",
      amount: "Kiasi (TZS)",
      paidOn: "Yalilipwa tarehe",
      method: "Njia ya malipo",
      reference: "Kumbukumbu",
      notes: "Maelezo",
      submit: "Rekodi malipo",
      submitting: "Inarekodi…",
    },
    methods: {
      bankTransfer: "Uhamisho wa benki",
      mobileMoney: "Pesa za simu",
      cheque: "Hundi",
      cash: "Fedha taslimu",
      other: "Nyingine",
    },
    void: {
      reason: "Sababu ya kubatilisha",
      aria: "Sababu ya kubatilisha malipo haya",
    },
  },
  sourced: {
    fundingNote:
      "Imetokana na kazi. Mistari yake ya vifaa na ufundi husasishwa kila unapohifadhi kazi — ibadilishe huko, si hapa.",
    poNote:
      "Imetokana na kazi. Mistari yake husasishwa kila unapohifadhi kazi — badilisha idadi huko. Chagua msambazaji hapa kabla ya kutoa oda.",
    viewTask: "Fungua kazi",
    linkedTitle: "Nyaraka zilizounganishwa",
    linkedBody:
      "Kuhifadhi kazi hii huweka ombi lake la fedha la rasimu na oda ya ununuzi iliyopangwa sambamba na ufundi na vifaa vyake. Zikishatolewa, hazibadiliki tena.",
    noneYet: "Bado hakuna — ongeza mistari ya ufundi au vifaa ili kuandaa rasimu.",
    fundingRequest: "Ombi la fedha",
    purchaseOrder: "Oda ya ununuzi",
    draft: "Rasimu",
    noSupplier: "Msambazaji hajachaguliwa",
  },
};
