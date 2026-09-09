"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // A later phase forwards this to an error-reporting service.
    console.error(error);
  }, [error]);

  return (
    <div className="container-luxe flex min-h-[70vh] flex-col items-center justify-center gap-6 text-center">
      <span className="eyebrow">Something interrupted the composition</span>
      <h1 className="max-w-lg text-3xl sm:text-4xl">
        An unexpected error occurred
      </h1>
      <p className="max-w-md text-sm text-bone/50">
        The atelier has been notified. You can try again, or return to the
        homepage.
      </p>
      {error.digest ? (
        <p className="text-[11px] text-bone/25">Reference: {error.digest}</p>
      ) : null}
      <div className="mt-2 flex gap-3">
        <Button onClick={reset} variant="primary" size="md">
          Try again
        </Button>
        <Button href="/" variant="outline" size="md">
          Back to home
        </Button>
      </div>
    </div>
  );
}
