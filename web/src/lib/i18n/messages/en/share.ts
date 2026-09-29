export const share = {
  action: "Share",
  menuLabel: "Share as",
  formats: {
    pdf: "PDF",
    jpg: "Image (JPG)",
    csv: "Spreadsheet (CSV)",
  },
  hints: {
    pdf: "Best for long reports",
    jpg: "Previews in the chat",
    csv: "Opens in Excel or Sheets",
  },
  preparing: "Preparing…",
  ready: "Ready: tap to share",
  retry: "Couldn't prepare the file. Tap to try again.",
  downloaded: "Saved to your downloads. Attach it in WhatsApp from there.",
} as const;
