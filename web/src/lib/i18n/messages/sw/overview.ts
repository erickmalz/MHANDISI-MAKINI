import type { overview as enOverview } from "../en/overview";
import type { Widen } from "../../types";

export const overview: Widen<typeof enOverview> = {
  pageTitle: "Muhtasari wa mradi",
  title: "Muhtasari",
  createFundingRequest: "Andaa ombi la fedha",
  empty: {
    title: "Hakuna hatua bado",
    body: "Mradi huu hauna hatua, kwa hiyo hakuna takwimu za kuonyesha bado. Ongeza hatua ya kwanza ili uanze kufuatilia fedha na gharama zake.",
    action: "Ongeza hatua ya kwanza",
  },
  status: {
    label: "Hali ya mradi",
    sentence: {
      pending: "Ombi la fedha liko kwa mteja.",
      pendingShortfall: "Ombi la fedha liko kwa mteja. Upungufu unaotabiriwa ni {amount}.",
      overCommitted: "Ahadi za malipo zinazidi amana ya mteja kwa {amount}.",
      underfunded: "Fedha hazitoshi kwa {amount}. Kazi iliyosalia inagharimu zaidi ya fedha zinazopatikana.",
      tight: "Fedha zinazopatikana zinatosha kazi iliyosalia, lakini zinabaki chini ya {margin}% za ziada.",
      comfortable: "Fedha zinazopatikana zinatosha kazi iliyosalia na zinabaki angalau {margin}% za ziada.",
    },
  },
  alerts: {
    title: "Ya kufanya",
    summary: {
      one: "{count} haijashughulikiwa · za dharura kwanza",
      other: "{count} hazijashughulikiwa · za dharura kwanza",
    },
    none: "Hakuna tahadhari ambazo hazijashughulikiwa katika mradi huu.",
    view: "Angalia",
    severity: {
      critical: "Hatua inahitajika",
      warning: "Angalizo",
      info: "Maelezo",
    },
  },
  position: {
    title: "Hali ya kifedha ya mradi",
    subtitle: "Hatua zote, fedha za mteja pekee. Haziwezi kuhamishwa kati ya hatua — shughulikia nyongeza ya kila hatua.",
    float: "Fedha zinazopatikana",
    deposited: "Amana ya mteja",
    commitments: "Ahadi za malipo",
    remaining: "Gharama zilizosalia",
  },
  breakdown: {
    title: "Mchanganuo",
    current: "{name}, hatua ya sasa",
    materials: "Vifaa",
    labour: "Fundi",
    rows: {
      paid: "Kilicholipwa",
      committed: "Ahadi, hakijalipwa",
      remaining: "Kilichosalia kufanywa",
    },
    forecast: {
      remainingCost: "Gharama zilizosalia zinazotarajiwa",
      float: "Fedha zinazopatikana",
      surplus: "Ziada ya fedha",
      requirement: "Fedha zinazohitajika",
    },
  },
  fee: {
    title: "Ada ya msimamizi",
    intro: "Hesabu tofauti na fedha za mradi zilizo juu. Inatozwa kwa mteja kupitia ankara yake ya ada; haitumii amana za mteja kamwe.",
    recorded: "Ada iliyorekodiwa",
    invoiced: "Ada iliyotozwa",
    received: "Ada iliyopokelewa",
    outstanding: "Ada iliyobaki kulipwa",
    separate: "Hesabu tofauti",
    invoices: "Nenda kwenye ankara za ada",
    earned: "Ada iliyopatikana ni sawa na ada iliyopokelewa.",
    remaining: "Ada iliyosalia ya mradi huu:",
    remainingNote: "Bado inahesabiwa katika fedha zinazohitajika za mradi zinazotabiriwa, kwa sababu mteja ndiye anayeigharamia mwishowe.",
  },
  stages: {
    title: "Hatua",
    add: "Ongeza hatua",
    current: "Ya sasa",
    columns: {
      stage: "Hatua",
      progress: "Maendeleo",
      funding: "Fedha",
      topUp: "Nyongeza inayohitajika",
    },
    topUpNone: "Hakuna",
    topUpLink: "{name} inahitaji nyongeza ya {amount}. Fungua ukaguzi wake wa fedha.",
    tasks: "Kazi",
    edit: "Hariri",
    work: "Fanyia kazi hatua hii",
    progress: "Maendeleo ya {name}",
  },
};
