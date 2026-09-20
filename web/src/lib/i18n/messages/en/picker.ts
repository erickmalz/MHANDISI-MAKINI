export const picker = {
  pageTitle: "Choose a project",
  title: "Choose a project",
  subtitle: "Open one project to work on it. You can switch project at any time.",
  newProject: "New project",
  empty: {
    title: "No projects yet",
    body: "Your account starts empty. Create your first project to begin tracking its stages, funding and costs.",
    action: "Create your first project",
  },
  filter: {
    label: "Filter projects",
    hint: "Search by name, code, client or site.",
    clear: "Clear filter",
    showing: "Showing {shown} of {total} projects.",
  },
  noMatch: {
    title: "No project matches “{query}”.",
    body: "Check the spelling, or clear the filter to see all {count} projects.",
  },
  groups: {
    attention: "Needs attention",
    other: "Other projects",
    all: "Projects",
  },
  row: {
    noStage: "No stage yet",
    alerts: { one: "{count} alert", other: "{count} alerts" },
  },
} as const;
