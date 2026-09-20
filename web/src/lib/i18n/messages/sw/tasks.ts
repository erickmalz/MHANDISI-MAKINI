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
};
