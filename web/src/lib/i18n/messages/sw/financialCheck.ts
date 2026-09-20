import type { financialCheck as enFinancialCheck } from "../en/financialCheck";
import type { Widen } from "../../types";

export const financialCheck: Widen<typeof enFinancialCheck> = {
  pageTitle: "Ukaguzi wa fedha",
  crumbOverview: "Muhtasari",
  title: "Fanya ukaguzi wa fedha",
  subtitle: "Ukaguzi wa moja kwa moja dhidi ya ukaguzi wa ulinganisho wa hesabu unaopendekezwa na miongozo — hukokotolewa upya kila mara, hakuna kinachohifadhiwa. Huongezea mtiririko wa Tahadhari; haubadilishi.",
  tiles: {
    score: "Alama ya ulinganisho wa hesabu",
    passed: "Zilizopita",
    warnings: "Maonyo",
    critical: "Matatizo makubwa",
  },
  sections: {
    critical: "Matatizo makubwa ({count})",
    warnings: "Maonyo ({count})",
    passed: "Zilizopita ({count})",
  },
  nothingPassed: "Hakuna kilichopita bila tatizo katika ukaguzi huu.",
  checks: {
    "unallocated-deposit": "Amana za mteja zinalingana na maombi ya fedha; fedha za mteja ambazo hazijagawiwa zinatambuliwa (ukaguzi wa mwongozo 1 na 15)",
    "labour-exceeds-agreement": "Malipo ya fundi hayazidi kiasi cha fundi kilichoidhinishwa (ukaguzi wa mwongozo 7)",
    "float-negative": "Fedha zinazopatikana zilizo hasi zinaonyeshwa wazi (ukaguzi wa mwongozo 9)",
    "po-missing-receipt": "Risiti zinazokosekana zinatambuliwa (ukaguzi wa mwongozo 10)",
    "po-missing-delivery-note": "Hati za uwasilishaji zinazokosekana zinatambuliwa (ukaguzi wa mwongozo 11)",
    "po-outstanding": "Oda za ununuzi ambazo bado hazijakamilika zinatambuliwa (ukaguzi wa mwongozo 14)",
    "material-not-ordered": "Manunuzi yameanzishwa kwa vifaa vilivyokadiriwa",
    "funding-request-pending": "Ombi la fedha limetumwa na linasubiri amana",
    "additional-funding-required": "Fedha za ziada zinahitajika",
    "fee-outstanding": "Ankara ya ada ya usimamizi bado haijalipwa",
    "float-below-upcoming-commitments": "Fedha zinazopatikana zinatosha ahadi za malipo zilizo wazi",
    "stage-complete-labour-outstanding": "Hatua iliyokamilika haina ahadi za fundi zilizobaki",
    "labour-final-payment-incomplete": "Malipo ya mwisho ya fundi hurekodiwa tu kazi inapokamilika",
    "over-payment-visibility": "Malipo yanayozidi Oda ya ununuzi yana sababu iliyorekodiwa (ukaguzi wa mwongozo 5)",
    "completed-task-labour-balance": "Kazi zilizokamilika hazina salio la fundi lisilo na maelezo (ukaguzi wa mwongozo 8)",
    "duplicate-payment-reference": "Marejeo ya malipo yanayorudiwa yanawekewa alama (ukaguzi wa mwongozo 13)",
    "procurement-vs-material-requirement": "Manunuzi hayazidi mahitaji ya vifaa bila maelezo (ukaguzi wa mwongozo 6)",
    "stale-draft-variations": "Mabadiliko ya kazi yasiyo na uamuzi yanatambuliwa (ukaguzi wa mwongozo 16)",
  },
};
