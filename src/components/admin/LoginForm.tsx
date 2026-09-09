"use client";

import { useFormState, useFormStatus } from "react-dom";
import { signInAction, type LoginState } from "@/app/admin/login/actions";
import { Field, Input } from "@/components/ui/form";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-11 w-full bg-bone text-[11px] font-medium uppercase tracking-wide2 text-ink transition-opacity disabled:opacity-50"
    >
      {pending ? "Signing in…" : "Sign in"}
    </button>
  );
}

export function LoginForm({ configured }: { configured: boolean }) {
  const [state, formAction] = useFormState<LoginState, FormData>(signInAction, {});

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {!configured ? (
        <p className="border border-bone/15 bg-bone/[0.03] px-4 py-3 text-xs text-bone/50">
          Supabase is not configured. Set the Supabase environment variables to
          enable sign-in, or use <code className="text-bone/70">ADMIN_DEV_BYPASS=true</code>{" "}
          for local development.
        </p>
      ) : null}

      <Field label="Email" htmlFor="email" required>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label="Password" htmlFor="password" required>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </Field>

      {state.error ? (
        <p className="text-xs text-red-400">{state.error}</p>
      ) : null}

      <SubmitButton />
    </form>
  );
}
