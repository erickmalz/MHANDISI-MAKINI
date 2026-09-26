import type { chrome as enChrome } from "../en/chrome";
import type { Widen } from "../../types";

export const chrome: Widen<typeof enChrome> = {
  brand: {
    name: "Mhandisi Makini",
    tagline: "Let's build together",
  },
  metadata: {
    title: "Mhandisi Makini — Usimamizi wa miradi ya ujenzi",
    description: "Usimamizi wa miradi ya ujenzi kwa mhandisi wa eneo la kazi. Fedha za mteja, manunuzi na fundi, kufuatiliwa mradi kwa mradi.",
  },
  skipToMain: "Ruka hadi maudhui makuu",
  homeLink: "Mhandisi Makini — chagua mradi",
  header: {
    projects: "Miradi",
    switchProject: "Badilisha mradi",
    settings: "Mipangilio",
    openMenu: "Fungua menyu",
    closeMenu: "Funga menyu",
    signOut: {
      idle: "Toka",
      pending: "Inatoka…",
      failed: "Jaribu kutoka tena",
    },
  },
  registers: {
    suppliers: "Orodha ya wasambazaji",
    subcontractors: "Orodha ya wakandarasi wasaidizi",
    stageTemplates: "Violezo vya hatua",
  },
  language: {
    switchTo: "Badilisha lugha iwe {language}",
  },
  theme: {
    light: "Mandhari nyepesi",
    dark: "Mandhari nyeusi",
    switchTo: "Badilisha kuwa {theme}",
  },
  project: {
    actions: "Vitendo vya mradi",
    edit: "Hariri mradi",
    saveAsTemplate: "Hifadhi kama kiolezo",
    closeout: "Kufunga mradi",
    sections: "Sehemu za mradi",
    tabs: {
      overview: "Muhtasari",
      funding: "Maombi ya fedha",
      feeInvoices: "Ankara za ada",
      procurement: "Oda za ununuzi",
      materialStock: "Akiba ya vifaa",
      reports: "Ripoti",
      activity: "Historia ya shughuli",
    },
  },
  verifyBanner: {
    title: "Thibitisha barua pepe yako",
    default: "Tumetuma kiungo kwa {email}. Kuthibitisha kunakuwezesha kuweka upya nywila na kubadilisha barua pepe yako.",
    sent: "Imetumwa. Angalia kikasha chako kupata kiungo.",
    failed: "Kiungo hakikutumwa. Jaribu tena baada ya dakika moja.",
    resend: "Tuma kiungo tena",
    sending: "Inatuma…",
  },
  verifyGate: {
    title: "Thibitisha barua pepe yako ili uendelee",
    body: "Fungua kiungo tulichotuma kwa {email}. Zimepita zaidi ya siku 7, kwa hiyo sehemu nyingine za programu zimefungwa hadi utakapothibitisha. Hakuna kilichofutwa.",
    resend: "Tuma kiungo tena",
    resendAgain: "Kiungo kimetumwa — tuma tena",
    sending: "Inatuma…",
    sent: "Imetumwa. Angalia kikasha chako (na barua taka).",
    failed: "Kiungo hakikutumwa. Jaribu tena baada ya dakika moja.",
    wrongAccount: "Akaunti isiyo sahihi?",
    stuck: "Umekwama? Tuma barua pepe kwa {support}.",
  },
  error: {
    title: "Ukurasa huu haujapakia",
    body: "Jaribu tena. Tatizo likiendelea, chagua mradi kisha ufungue ukurasa huu kutoka hapo.",
    reference: "Marejeleo: {digest}",
    retry: "Jaribu tena",
    chooseProject: "Chagua mradi",
  },
  notFound: {
    title: "Ukurasa haupatikani",
    body: "Ukurasa huu umehamishwa au haujawahi kuwepo. Chagua mradi ili uendelee.",
    action: "Chagua mradi",
  },
  loader: {
    site: "Inapakia eneo lako la kazi",
    workspace: "Inaandaa nafasi yako ya kazi",
    wait: "{label}. Tafadhali subiri.",
  },
};
