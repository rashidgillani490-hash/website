"use client";

import { useState, useTransition } from "react";
import { updateProfileAction, changePasswordAction } from "@/app/(site)/account/actions";
import { Field, Input } from "@/components/ui/form";
import { Button } from "@/components/ui/Button";
import type { CustomerSession } from "@/lib/customer/types";

export function AccountSettingsForm({ session }: { session: CustomerSession }) {
  const [fullName, setFullName] = useState(session.fullName);
  const [phone, setPhone] = useState(session.phone ?? "");
  const [marketingOptIn, setMarketingOptIn] = useState(session.marketingOptIn);
  const [profilePending, startProfile] = useTransition();
  const [profileMsg, setProfileMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordPending, startPassword] = useTransition();
  const [passwordMsg, setPasswordMsg] = useState<{ ok: boolean; text: string } | null>(null);

  return (
    <div className="flex flex-col gap-12">
      <section className="flex flex-col gap-6">
        <h2 className="font-serif text-2xl">Profile</h2>
        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="Full name" htmlFor="name">
            <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </Field>
          <Field label="Email" htmlFor="email" hint="Contact support to change your email">
            <Input id="email" type="email" value={session.email} disabled />
          </Field>
          <Field label="Mobile number" htmlFor="phone">
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
        </div>
        <label className="flex items-center gap-3 text-sm text-bone/70">
          <input
            type="checkbox"
            checked={marketingOptIn}
            onChange={(e) => setMarketingOptIn(e.target.checked)}
            className="accent-gold"
          />
          Send me the Maison journal and new release previews.
        </label>
        <div className="flex items-center gap-4">
          <Button
            size="md"
            disabled={profilePending}
            onClick={() =>
              startProfile(async () => {
                setProfileMsg(null);
                const res = await updateProfileAction({ fullName, phone: phone || null, marketingOptIn });
                setProfileMsg({ ok: res.ok, text: res.message });
              })
            }
            className="self-start"
          >
            {profilePending ? "Saving…" : "Save changes"}
          </Button>
          {profileMsg ? (
            <span className={`text-xs ${profileMsg.ok ? "text-emerald-400" : "text-red-400"}`}>
              {profileMsg.text}
            </span>
          ) : null}
        </div>
      </section>

      <section className="flex flex-col gap-4 border-t border-bone/10 pt-10">
        <h2 className="font-serif text-2xl">Password</h2>
        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="Current password" htmlFor="pw-current">
            <Input
              id="pw-current"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </Field>
          <div />
          <Field label="New password" htmlFor="pw-new" hint="At least 8 characters">
            <Input
              id="pw-new"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </Field>
          <Field label="Confirm new password" htmlFor="pw-confirm">
            <Input
              id="pw-confirm"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </Field>
        </div>
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="md"
            disabled={passwordPending || !currentPassword || !newPassword}
            onClick={() =>
              startPassword(async () => {
                setPasswordMsg(null);
                if (newPassword !== confirmPassword) {
                  setPasswordMsg({ ok: false, text: "New passwords don't match." });
                  return;
                }
                const res = await changePasswordAction({ currentPassword, newPassword });
                setPasswordMsg({ ok: res.ok, text: res.message });
                if (res.ok) {
                  setCurrentPassword("");
                  setNewPassword("");
                  setConfirmPassword("");
                }
              })
            }
            className="self-start"
          >
            {passwordPending ? "Updating…" : "Update password"}
          </Button>
          {passwordMsg ? (
            <span className={`text-xs ${passwordMsg.ok ? "text-emerald-400" : "text-red-400"}`}>
              {passwordMsg.text}
            </span>
          ) : null}
        </div>
      </section>
    </div>
  );
}
