import type { subcontractors as enSubcontractors } from "../en/subcontractors";
import type { Widen } from "../../types";

export const subcontractors: Widen<typeof enSubcontractors> = {
  pageTitle: "Wakandarasi wasaidizi",
  register: "Orodha ya wakandarasi wasaidizi",
  crumbProjects: "Miradi",
  crumbRegister: "Wakandarasi wasaidizi",
  list: {
    subtitle: "Vikundi vya vibarua na mafundi unaowapa kazi. Hutumika katika kila mradi.",
    add: "Ongeza mkandarasi msaidizi",
    empty: "Hakuna wakandarasi wasaidizi bado. Ongeza wa kwanza — unaweza pia kuongeza unapokabidhi kazi.",
    inactive: "Haitumiki",
    noContact: "Hakuna mawasiliano",
    edit: "Hariri",
    loading: "Inapakia wakandarasi wasaidizi",
  },
  new: {
    pageTitle: "Mkandarasi msaidizi mpya",
    title: "Ongeza mkandarasi msaidizi",
    subtitle: "Jina pekee ndilo linalohitajika. Mengine yote unaweza kujaza baadaye.",
    submit: "Ongeza mkandarasi msaidizi",
  },
  edit: {
    pageTitle: "Hariri mkandarasi msaidizi",
    title: "Hariri {name}",
    submit: "Hifadhi mabadiliko",
  },
  statement: {
    pageTitle: "Mkandarasi msaidizi",
    subtitle: "Taarifa ya akaunti, kila mradi",
    editDetails: "Hariri maelezo",
    outstanding: "Salio lililobaki kulipwa",
    agreedLabour: "Kiasi cha fundi kilichokubaliwa",
    noTasks: "Hajapewa Kazi yoyote bado.",
    payments: "Malipo",
    noPayments: "Hakuna malipo yaliyorekodiwa bado.",
  },
  form: {
    name: "Jina la mkandarasi msaidizi",
    trade: "Ufundi",
    tradeHint: "Mwashi, seremala, fundi wa chuma, fundi umeme…",
    phone: "Simu",
    email: "Barua pepe",
    address: "Anwani",
    status: "Hali",
    active: "Inatumika",
    inactive: "Haitumiki — ficha kwenye ukabidhi wa kazi mpya",
    notes: "Maelezo",
    saving: "Inahifadhi…",
    cancel: "Ghairi",
  },
};
