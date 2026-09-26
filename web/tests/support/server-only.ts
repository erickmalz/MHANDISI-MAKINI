// Stand-in for the `server-only` package under Vitest. The real package throws
// on import outside Next's `react-server` condition; the DAL modules the
// financials suite exercises import it only as a build-time guard.
export {};
