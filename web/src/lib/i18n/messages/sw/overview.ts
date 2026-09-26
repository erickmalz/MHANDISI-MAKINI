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
    noAlerts: "Hakuna tahadhari ambazo hazijashughulikiwa katika mradi huu.",
    moreAlerts: { one: "Tahadhari {count} nyingine", other: "Tahadhari {count} nyingine" },
    view: "Angalia",
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
    title: "Tahadhari",
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
    subtitle:
      "Fedha za mradi za mteja pekee, zikijumlishwa katika hatua zote. Haziwezi kuhamishwa kati ya hatua — angalia hapa chini kwa nambari ya kutenda nayo.",
    float: "Fedha zinazopatikana",
    deposited: "Amana ya mteja",
    commitments: "Ahadi za malipo",
    remaining: "Gharama zilizosalia",
    allFunded: "Kila hatua iko ndani ya fedha zake — hakuna inayohitaji nyongeza kwa sasa.",
    needsTopUp: { one: "Hatua 1 inahitaji nyongeza", other: "Hatua {count} zinahitaji nyongeza" },
    viewStage: "Angalia hatua",
  },
  breakdown: {
    title: "Mchanganuo",
    hint: "Vifaa, fundi na makadirio",
    materials: {
      title: "Vifaa",
      paid: "Kilicholipwa",
      open: "Ahadi za malipo zilizo wazi",
      toProcure: "Vilivyosalia kununuliwa",
    },
    labour: {
      title: "Fundi",
      paid: "Kilicholipwa",
      outstanding: "Kilichobaki kulipwa (kimesainiwa, hakijalipwa)",
      remainingWork: "Kazi iliyosalia",
    },
    forecast: {
      title: "Makadirio",
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
    earned: "Ada iliyopatikana ni sawa na ada iliyopokelewa.",
    remaining: "Ada iliyosalia ya hatua hii:",
    remainingNote: "Bado inahesabiwa katika fedha zinazohitajika za mradi zinazotabiriwa, kwa sababu mteja ndiye anayeigharamia mwishowe.",
  },
  stages: {
    title: "Hatua",
    add: "Ongeza hatua",
    current: "hatua ya sasa",
    tasks: "Kazi",
    edit: "Hariri",
    work: "Fanyia kazi hatua hii",
    progress: "Maendeleo ya {name}",
  },
};
