/**
 * Versions of the global legal pages. Recorded on `accounts` at signup with a
 * timestamp (ticket 02). Bump when the Privacy Policy / Terms text changes so
 * re-acceptance can be prompted.
 *
 * The page content itself lands in Phase 4 (`/legal/privacy`, `/legal/terms`) —
 * launch-blocking per ticket 03.
 */
export const TERMS_VERSION = "1.0-draft";
export const PRIVACY_VERSION = "1.0-draft";

/** What the signup checkbox accepts, stored as one string. */
export const ACCEPTED_LEGAL_VERSION = `terms@${TERMS_VERSION};privacy@${PRIVACY_VERSION}`;
