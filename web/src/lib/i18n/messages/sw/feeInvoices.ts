import type { feeInvoices as enFeeInvoices } from "../en/feeInvoices";
import type { Widen } from "../../types";

export const feeInvoices: Widen<typeof enFeeInvoices> = {
  pageTitle: "Ankara za ada",
  detailPageTitle: "Ankara ya ada",
  loading: "Inapakia ankara za ada",
  status: {
    issued: "Imetumwa",
    paid: "Imelipwa",
  },
  list: {
    subtitle:
      "Daftari la ada ya usimamizi — kila Ankara ya Ada iliyotolewa kwenye mradi huu, inayolipwa tofauti na amana za mteja.",
    empty:
      "Hakuna Ankara za Ada bado. Moja inatolewa kiotomatiki ombi la fedha la hatua linapotumwa.",
    delta: "Nyongeza",
    forRequest: "{stage} · {number}",
  },
  detail: {
    stage: "Hatua",
    fundingRequest: "Ombi la fedha",
    amount: "Kiasi cha ada",
    basis: "Msingi wa ada",
    basisFixed: "Ada maalum ya usimamizi kwa hatua hii",
    basisPercent: "{percent}% ya thamani ya hatua",
    stageValue: "Thamani ya hatua",
    issuedOn: "Imetumwa {date}",
    paidOn: "Imelipwa {date}",
    delta:
      "Ankara ya nyongeza — imetolewa kwa ada iliyoongezwa baada ya ile ya awali kulipwa.",
    paymentInstructions: "Maelekezo ya malipo",
    document: "Ankara ya Ada {number}",
    backToAll: "Rudi kwenye ankara zote za ada",
    markPaid: {
      title: "Weka kama imelipwa",
      body: "Rekodi kuwa ada ya Ankara hii ya Ada imepokelewa. Hili haliwezi kutenduliwa.",
      action: "Weka kama imelipwa",
    },
  },
};
