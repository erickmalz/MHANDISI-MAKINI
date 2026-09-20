import type { status as enStatus } from "../en/status";
import type { Widen } from "../../types";

export const status: Widen<typeof enStatus> = {
  stage: {
    planned: "Imepangwa",
    active: "Inaendelea",
    awaitingFunding: "Inasubiri fedha",
    onHold: "Imesimamishwa",
    readyForCloseout: "Tayari kufungwa",
    completed: "Imekamilika",
    cancelled: "Imeghairiwa",
  },
  task: {
    planned: "Imepangwa",
    active: "Inaendelea",
    onHold: "Imesimamishwa",
    completed: "Imekamilika",
    cancelled: "Imeghairiwa",
  },
  project: {
    active: "Inaendelea",
    onHold: "Imesimamishwa",
    completed: "Imekamilika",
    archived: "Imewekwa kumbukumbu",
  },
};
