import type { feeInvoices as enFeeInvoices } from "../en/feeInvoices";
import type { Widen } from "../../types";

export const feeInvoices: Widen<typeof enFeeInvoices> = {
  pageTitle: "Ankara za ada",
  detailPageTitle: "Ankara ya ada",
  loading: "Inapakia ankara za ada",
  status: {
    issued: "Imetumwa",
    paid: "Imelipwa",
    partiallyPaid: "Imelipwa kiasi",
    void: "Imebatilishwa",
  },
  list: {
    subtitle:
      "Daftari la ada ya usimamizi — kila Ankara ya Ada iliyotolewa kwenye mradi huu, inayolipwa tofauti na amana za mteja.",
    empty:
      "Hakuna Ankara za Ada bado. Moja inatolewa kiotomatiki ombi la fedha la hatua linapotumwa.",
    delta: "Nyongeza",
    forRequest: "{stage} · {number}",
    balance: "{amount} bado inadaiwa",
  },
  detail: {
    stage: "Hatua",
    fundingRequest: "Ombi la fedha",
    amount: "Kiasi cha ada",
    received: "Kilichopokelewa",
    balance: "Salio linalodaiwa",
    basis: "Msingi wa ada",
    basisFixed: "Ada maalum ya usimamizi kwa hatua hii",
    basisPercent: "{percent}% ya thamani ya hatua",
    stageValue: "Thamani ya hatua",
    issuedOn: "Imetumwa {date}",
    paidOn: "Imelipwa {date}",
    voidedOn: "Imebatilishwa {date}:",
    correctedOn: "Kiasi kimerekebishwa {date} (kilikuwa {amount}):",
    delta:
      "Ankara ya nyongeza — imetolewa kwa ada iliyoongezwa baada ya ile ya awali kulipwa.",
    paymentInstructions: "Maelekezo ya malipo",
    document: "Ankara ya Ada {number}",
    backToAll: "Rudi kwenye ankara zote za ada",
    payments: {
      title: "Malipo yaliyopokelewa",
      marked: "Imewekwa kama imelipwa",
    },
    recordPayment: {
      title: "Rekodi malipo",
      body: "Weka salio lote ili ankara iwe imelipwa, au kiasi kidogo kwa malipo ya sehemu — kinachobaki kinaendelea kudaiwa. Malipo yakisharekodiwa, ankara haiwezi tena kurekebishwa wala kubatilishwa.",
      amount: "Kiasi kilichopokelewa",
      receivedOn: "Tarehe ya kupokea",
      method: "Njia",
      reference: "Kumbukumbu",
      action: "Rekodi malipo",
      submitting: "Inarekodi…",
    },
    correct: {
      title: "Rekebisha kiasi",
      body: "Rekebisha ada isiyo sahihi kwa namba ileile ya ankara. Sababu inahifadhiwa na kuchapishwa kwenye ankara.",
      amount: "Kiasi sahihi cha ada",
      reason: "Sababu ya marekebisho",
      action: "Hifadhi marekebisho",
      submitting: "Inahifadhi…",
    },
    void: {
      title: "Batilisha ankara hii",
      body: "Kwa ankara iliyotolewa kimakosa. Inabaki kwenye kumbukumbu, imegongwa muhuri BATILI, na haihesabiwi tena kama ada inayodaiwa. Hili haliwezi kutenduliwa.",
      reason: "Sababu ya kubatilisha",
      action: "Batilisha ankara",
      submitting: "Inabatilisha…",
    },
  },
};
