import "server-only";

import { cache } from "react";
import { eq } from "drizzle-orm";

import { projects } from "./schema";
import { withAccount } from "./with-account";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ProjectIdentity = {
  id: string;
  code: string;
  name: string;
  clientName: string;
  site: string;
};

/**
 * Who a project is — name, code, client, site — and nothing else.
 *
 * The project layout needs this on every project screen, so it must not run
 * the full financial projection that `getProjectOverview` does. Wrapped in
 * React `cache` so the layout and a page asking in the same request share one
 * query. RLS-scoped through `withAccount` like every other read; returns
 * `null` when the project is not in the signed-in Account.
 */
export const getProjectIdentity = cache(
  async (projectId: string): Promise<ProjectIdentity | null> => {
    if (!UUID.test(projectId)) return null;
    return withAccount(async (tx) => {
      const [row] = await tx
        .select({
          id: projects.id,
          code: projects.projectCode,
          name: projects.name,
          clientName: projects.clientName,
          site: projects.site,
        })
        .from(projects)
        .where(eq(projects.id, projectId))
        .limit(1);
      return row ?? null;
    });
  },
);
