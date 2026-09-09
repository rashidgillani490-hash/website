"use client";

import { useState } from "react";
import { Field, Input, Textarea, Select } from "@/components/ui/form";
import { Button } from "@/components/ui/Button";
import { Check } from "lucide-react";

type Status = "idle" | "submitting" | "success" | "error";

const TOPICS = [
  "Choosing a fragrance",
  "An existing order",
  "Atelier visit",
  "Press",
  "Wholesale",
  "Something else",
];

export function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const next: Record<string, string> = {};
    if (!form.get("name")) next.name = "Please tell us your name.";
    const email = String(form.get("email") ?? "");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
      next.email = "Please enter a valid email address.";
    if (String(form.get("message") ?? "").length < 10)
      next.message = "A little more detail helps us help you.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setStatus("submitting");
    // Demo only — a later phase posts this to Supabase / an email service.
    await new Promise((r) => setTimeout(r, 900));
    setStatus("success");
  }

  if (status === "success") {
    return (
      <div className="flex flex-col items-start gap-4 border border-gold/30 bg-gold/5 p-8">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gold/15 text-gold">
          <Check size={18} />
        </span>
        <h2 className="font-serif text-2xl">Message received</h2>
        <p className="text-sm text-bone/60">
          Thank you. A member of the atelier will reply within one business day.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
      <h2 className="font-serif text-2xl">Send a message</h2>
      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Name" htmlFor="name" required error={errors.name}>
          <Input id="name" name="name" autoComplete="name" />
        </Field>
        <Field label="Email" htmlFor="email" required error={errors.email}>
          <Input id="email" name="email" type="email" autoComplete="email" />
        </Field>
      </div>
      <Field label="Topic" htmlFor="topic">
        <Select id="topic" name="topic" defaultValue={TOPICS[0]}>
          {TOPICS.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </Select>
      </Field>
      <Field label="Message" htmlFor="message" required error={errors.message}>
        <Textarea id="message" name="message" rows={6} />
      </Field>
      <Button type="submit" size="lg" disabled={status === "submitting"}>
        {status === "submitting" ? "Sending…" : "Send message"}
      </Button>
    </form>
  );
}
