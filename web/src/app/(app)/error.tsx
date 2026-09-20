"use client";

import { ErrorScreen } from "@/components/ErrorScreen";

export default function ErrorBoundary(props: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return <ErrorScreen {...props} />;
}
