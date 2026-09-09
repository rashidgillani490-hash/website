"use client";

import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "done" | "error">("idle");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setState("error");
      return;
    }
    // Demo only — a later phase wires this to Supabase / an ESP.
    setState("done");
    setEmail("");
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <label className="text-[11px] uppercase tracking-luxe text-bone/40">
        The Maison journal
      </label>
      {state === "done" ? (
        <p className="flex items-center gap-2 text-sm text-gold">
          <Check size={14} /> Thank you — check your inbox.
        </p>
      ) : (
        <div className="flex max-w-sm items-center border-b border-bone/20 focus-within:border-gold">
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setState("idle");
            }}
            placeholder="Email address"
            className="w-full bg-transparent py-3 text-sm text-bone placeholder:text-bone/30 focus:outline-none"
          />
          <button type="submit" aria-label="Subscribe" className="text-bone/60 hover:text-gold">
            <ArrowRight size={16} />
          </button>
        </div>
      )}
      {state === "error" ? (
        <p className="text-xs text-red-400">Please enter a valid email address.</p>
      ) : null}
    </form>
  );
}
