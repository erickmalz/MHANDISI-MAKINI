import type { settings as enSettings } from "../en/settings";
import type { Widen } from "../../types";

export const settings: Widen<typeof enSettings> = {
  pageTitle: "Mipangilio",
  title: "Mipangilio",
  crumbProjects: "Miradi",
  loading: "Inapakia mipangilio",
  profile: {
    title: "Wasifu",
    email: "Barua pepe",
    emailHint: "Barua pepe unayotumia kuingia. Wasiliana na msaada ili kuibadilisha.",
    fullName: "Jina kamili",
    phone: "Simu",
    saving: "Inahifadhi…",
    save: "Hifadhi mabadiliko",
  },
  logo: {
    title: "Nembo ya kichwa cha barua",
    intro:
      "Huonekana kwenye kila Ombi la fedha, Ankara ya ada na Oda ya ununuzi unayotuma. PNG au JPEG, hadi 1MB.",
    alt: "Nembo ya sasa ya kichwa cha barua",
    replace: "Badilisha nembo",
    upload: "Pakia nembo",
    uploading: "Inapakia…",
    remove: "Ondoa nembo",
  },
  export: {
    title: "Hamisha data yako",
    intro:
      "Pakua kila Mradi, rekodi ya fedha na hati inayomilikiwa na akaunti yako kama faili moja la JSON.",
    button: "Hamisha data yangu",
  },
  deletion: {
    scheduledTitle: "Kufuta akaunti kumepangwa",
    scheduledBody:
      "Akaunti yako na kila kitu ndani yake vitafutwa kabisa tarehe {date}. Ingia tena wakati wowote kabla ya hapo ili kughairi.",
    dangerTitle: "Eneo la hatari",
    dangerBody:
      "Kufuta akaunti yako kunapanga ufutaji wa kudumu, usioweza kurudishwa, wa kila Mradi, rekodi ya fedha na hati unayomiliki, siku 30 kuanzia sasa. Hamisha data yako kwanza ikiwa unataka nakala.",
    delete: "Futa akaunti yangu",
    currentPassword: "Nywila ya sasa",
    confirmLabel: 'Andika "{email}" ili kuthibitisha',
    scheduling: "Inapanga…",
    confirm: "Futa akaunti yangu kabisa",
    cancel: "Ghairi",
  },
  language: {
    title: "Lugha",
    hint: "Lugha ya vitufe, maelezo na ujumbe. Huhifadhiwa kwenye kifaa hiki.",
  },
};
