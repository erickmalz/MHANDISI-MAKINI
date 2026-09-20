import { common } from "./common";
import { auth } from "./auth";
import { chrome } from "./chrome";
import { picker } from "./picker";
import { overview } from "./overview";
import { project } from "./project";
import { stages } from "./stages";
import { tasks } from "./tasks";
import { forms } from "./forms";
import { funding } from "./funding";
import { procurement } from "./procurement";
import { variations } from "./variations";
import { reports } from "./reports";
import { materialStock } from "./materialStock";
import { activity } from "./activity";
import { settings } from "./settings";
import { suppliers } from "./suppliers";
import { subcontractors } from "./subcontractors";
import { stageTemplates } from "./stageTemplates";
import { financialCheck } from "./financialCheck";
import { closeout } from "./closeout";
import { status } from "./status";

/** English is the source catalogue: keys are defined here, other languages must match. */
export const en = {
  common,
  auth,
  chrome,
  picker,
  overview,
  project,
  stages,
  tasks,
  forms,
  funding,
  procurement,
  variations,
  reports,
  materialStock,
  activity,
  settings,
  suppliers,
  subcontractors,
  stageTemplates,
  financialCheck,
  closeout,
  status,
} as const;
