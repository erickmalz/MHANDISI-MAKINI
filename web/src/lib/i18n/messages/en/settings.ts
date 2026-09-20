export const settings = {
  pageTitle: "Settings",
  title: "Settings",
  crumbProjects: "Projects",
  loading: "Loading settings",
  profile: {
    title: "Profile",
    email: "Email",
    emailHint: "Your sign-in email. Contact support to change it.",
    fullName: "Full name",
    phone: "Phone",
    saving: "Saving…",
    save: "Save changes",
  },
  logo: {
    title: "Letterhead logo",
    intro:
      "Shown on every Funding Request, Fee Invoice and Purchase Order you issue. PNG or JPEG, up to 1MB.",
    alt: "Current letterhead logo",
    replace: "Replace logo",
    upload: "Upload logo",
    uploading: "Uploading…",
    remove: "Remove logo",
  },
  export: {
    title: "Export your data",
    intro:
      "Download every Project, financial record and document your account owns as a single JSON file.",
    button: "Export my data",
  },
  deletion: {
    scheduledTitle: "Account deletion scheduled",
    scheduledBody:
      "Your account and everything in it will be permanently deleted on {date}. Sign back in at any time before then to cancel.",
    dangerTitle: "Danger zone",
    dangerBody:
      "Deleting your account schedules a permanent, irreversible deletion of every Project, financial record and document you own, 30 days from now. Export your data first if you want a copy.",
    delete: "Delete my account",
    currentPassword: "Current password",
    confirmLabel: 'Type "{email}" to confirm',
    scheduling: "Scheduling…",
    confirm: "Permanently delete my account",
    cancel: "Cancel",
  },
  language: {
    title: "Language",
    hint: "The language of buttons, labels and messages. Saved on this device.",
  },
} as const;
