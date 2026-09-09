"use client";

import { useFormState, useFormStatus } from "react-dom";
import { registerAction } from "@/app/(site)/account/register/actions";
import type { AccountAuthState } from "@/app/(site)/account/login/actions";
import { Field, Input } from "@/components/ui/form";
import { Button } from "@/components/ui/Button";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="gold" size="lg" disabled={pending} className="w-full">
      {pending ? "Creating your account…" : "Create account"}
    </Button>
  );
}

export function RegisterForm() {
  const [state, formAction] = useFormState<AccountAuthState, FormData>(registerAction, {});

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <Field label="Full name" htmlFor="reg-name" required>
        <Input id="reg-name" name="fullName" autoComplete="name" required />
      </Field>
      <Field label="Email" htmlFor="reg-email" required>
        <Input id="reg-email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label="Mobile number" htmlFor="reg-phone" hint="Optional — used for delivery updates">
        <Input id="reg-phone" name="phone" inputMode="tel" autoComplete="tel" />
      </Field>
      <Field label="Password" htmlFor="reg-password" required hint="At least 8 characters">
        <Input
          id="reg-password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </Field>

      <label className="flex items-start gap-3 text-xs text-bone/60">
        <input type="checkbox" name="marketingOptIn" className="mt-0.5 accent-gold" />
        Send me the Maison journal and new release previews.
      </label>

      {state.error ? <p className="text-xs text-red-400">{state.error}</p> : null}

      <SubmitButton />
    </form>
  );
}
