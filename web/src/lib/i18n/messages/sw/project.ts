import type { project as enProject } from "../en/project";
import type { Widen } from "../../types";

export const project: Widen<typeof enProject> = {
  crumbs: {
    projects: "Miradi",
    overview: "Muhtasari",
  },
  new: {
    pageTitle: "Mradi mpya",
    title: "Mradi mpya",
    subtitle: "Namba ya mradi hupewa kiotomatiki. Unaweza kuongeza hatua mara mradi utakapoundwa.",
    submit: "Andaa mradi",
  },
  edit: {
    pageTitle: "Hariri mradi",
    title: "Hariri mradi",
    submit: "Hifadhi mabadiliko",
  },
};
