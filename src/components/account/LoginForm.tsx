"use client";

import { useFormState, useFormStatus } from "react-dom";
import { signInAction, type AccountAuthState } from "@/app/(site)/account/login/actions";
import { Field, Input } from "@/components/ui/form";
import { Button } from "@/components/ui/Button";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="gold" size="lg" disabled={pending} className="w-full">
      {pending ? "Signing in…" : "Sign in"}
    </Button>
  );
}

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const [state, formAction] = useFormState<AccountAuthState, FormData>(signInAction, {});

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="redirect" value={redirectTo} />
      <Field label="Email" htmlFor="login-email" required>
        <Input id="login-email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label="Password" htmlFor="login-password" required>
        <Input
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </Field>

      {state.error ? <p className="text-xs text-red-400">{state.error}</p> : null}

      <SubmitButton />
    </form>
  );
}
