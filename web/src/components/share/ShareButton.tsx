"use client";

/**
 * Share a Report Export to the phone's share sheet (ticket "What 'share'
 * means for a report"). CONTRACT STUB — the share builder replaces the body;
 * the props are fixed.
 */
export interface ShareFile {
  format: "pdf" | "jpg" | "csv";
  /** Menu label, e.g. "PDF". */
  label: string;
  href: string;
  filename: string;
}

export function ShareButton({
  files,
  title,
  variant = "primary",
}: {
  files: ShareFile[];
  /** Sent as the share `title` only (no text), e.g. "Procurement — PRJ-2026-001". */
  title: string;
  variant?: "primary" | "secondary";
}) {
  void files;
  void title;
  void variant;
  return null;
}
