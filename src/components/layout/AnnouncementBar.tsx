"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

export function AnnouncementBar({ message }: { message: string }) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(sessionStorage.getItem("ml-announce") === "off");
  }, []);

  if (dismissed) return null;

  return (
    <div className="relative bg-ink-soft text-center text-[11px] tracking-wide2 text-bone/70">
      <div className="container-luxe flex items-center justify-center gap-4 py-2.5">
        <p className="uppercase">{message}</p>
        <button
          aria-label="Dismiss announcement"
          onClick={() => {
            sessionStorage.setItem("ml-announce", "off");
            setDismissed(true);
          }}
          className="absolute right-6 text-bone/40 transition-colors hover:text-bone"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
