import { exportAccountData } from "@/lib/data";
import { NotAuthenticatedError } from "@/lib/data/account-context";

function notFound(): Response {
  return new Response("Not found.", {
    status: 404,
    headers: { "Content-Type": "text/plain" },
  });
}

/**
 * "Export my data" (Slice 2.8 Part 3 / ticket 02) — a single JSON file of
 * every row the caller's Account owns. Same DAL function backs the
 * standalone button here and step one of the deletion flow.
 *
 * Route Handlers don't run the `(app)` layout, so — same pattern as
 * `../logo/route.ts` and the issued-document routes — the session gate is the
 * DAL itself: no session, or the (unreachable in practice) missing-row case,
 * is a flat 404.
 */
export async function GET(): Promise<Response> {
  let data;
  try {
    data = await exportAccountData();
  } catch (err) {
    if (err instanceof NotAuthenticatedError) return notFound();
    throw err;
  }
  if (!data) return notFound();

  const filename = `mhandisi-makini-export-${new Date().toISOString().slice(0, 10)}.json`;

  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
