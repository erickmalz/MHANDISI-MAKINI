import type { ReactNode } from "react";
import { notFound } from "next/navigation";

import { ProjectBar } from "@/components/ProjectBar";
import { getProjectIdentity } from "@/lib/data/project-identity";

/**
 * The frame every screen inside one project shares: who the project is, its
 * sections as tabs, and the rarely used project actions in one menu. It keeps
 * the engineer oriented — the tab bar shows where they are — and leaves each
 * page's header for that page's title and its one primary action.
 *
 * The identity lookup is deliberately light (name, code, client, site); the
 * full financial overview stays with the Overview page.
 */
export default async function ProjectLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProjectIdentity(id);
  if (!project) notFound();

  return (
    <>
      <ProjectBar project={project} />
      {children}
    </>
  );
}
