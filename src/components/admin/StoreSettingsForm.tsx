"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { Check, AlertCircle, Plus, Trash2, Upload } from "lucide-react";
import { saveSiteContentAction, saveCommerceSettingsAction, uploadLogoAction } from "@/app/admin/actions";
import { Panel } from "./ui";
import { AdminButton } from "./controls";
import { Field, Input, Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/Button";
import type { SiteContent } from "@/lib/types";
import type { CommerceSettings } from "@/lib/commerce";

export function StoreSettingsForm({
  site,
  commerce,
}: {
  site: SiteContent;
  commerce: CommerceSettings;
}) {
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ tone: "ok" | "error"; message: string } | null>(null);

  const [brandName, setBrandName] = useState(site.brandName);
  const [logoUrl, setLogoUrl] = useState(site.logoUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [phone, setPhone] = useState(site.contact.phone);
  const [whatsapp, setWhatsapp] = useState(site.contact.whatsapp ?? "");
  const [email, setEmail] = useState(site.contact.email);
  const [addressLines, setAddressLines] = useState(site.contact.addressLines.join("\n"));
  const [hours, setHours] = useState(site.contact.hours);

  const [social, setSocial] = useState(site.social);

  const [shippingFee, setShippingFee] = useState(commerce.shippingFeeCents);
  const [freeShippingThreshold, setFreeShippingThreshold] = useState(commerce.freeShippingThresholdCents);
  const [codEnabled, setCodEnabled] = useState(commerce.codEnabled);

  async function handleLogoFile(file: File) {
    setUploading(true);
    const fd = new FormData();
    fd.set("file", file);
    const res = await uploadLogoAction(fd);
    setUploading(false);
    if (res.ok && res.id) {
      setLogoUrl(res.id); // ActionResult.id doubles as the uploaded URL here
    } else {
      setStatus({ tone: "error", message: res.message });
    }
  }

  function save() {
    setStatus(null);
    startTransition(async () => {
      const [siteRes, commerceRes] = await Promise.all([
        saveSiteContentAction({
          ...site,
          brandName: brandName.trim() || site.brandName,
          logoUrl: logoUrl.trim() || null,
          contact: {
            email: email.trim(),
            phone: phone.trim(),
            whatsapp: whatsapp.trim() || undefined,
            addressLines: addressLines
              .split("\n")
              .map((l) => l.trim())
              .filter(Boolean),
            hours: hours.trim(),
          },
          social: social.filter((s) => s.label.trim() && s.href.trim()),
        }),
        saveCommerceSettingsAction({
          shippingFeeCents: Math.max(0, Math.trunc(Number(shippingFee) || 0)),
          freeShippingThresholdCents: Math.max(0, Math.trunc(Number(freeShippingThreshold) || 0)),
          codEnabled,
        }),
      ]);
      const ok = siteRes.ok && commerceRes.ok;
      setStatus({
        tone: ok ? "ok" : "error",
        message: ok ? "Store settings published." : siteRes.message || commerceRes.message,
      });
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-serif text-2xl">Store settings</h2>
        <div className="flex items-center gap-4">
          {status ? (
            <span
              className={`flex items-center gap-2 text-xs ${
                status.tone === "ok" ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {status.tone === "ok" ? <Check size={14} /> : <AlertCircle size={14} />}
              {status.message}
            </span>
          ) : null}
          <Button type="button" size="sm" disabled={pending} onClick={save}>
            {pending ? "Publishing…" : "Publish changes"}
          </Button>
        </div>
      </div>

      <Panel title="Brand identity">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Brand name" htmlFor="ss-brand" required>
            <Input id="ss-brand" value={brandName} onChange={(e) => setBrandName(e.target.value)} />
          </Field>
          <Field label="Logo" htmlFor="ss-logo" hint="Shown in the header and footer in place of the text brand name">
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-sm bg-ink-soft ring-1 ring-inset ring-bone/10">
                  <Image src={logoUrl} alt="Logo preview" fill sizes="40px" className="object-contain" />
                </span>
              ) : null}
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleLogoFile(file);
                }}
              />
              <AdminButton
                type="button"
                variant="outline"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                <Upload size={13} /> {uploading ? "Uploading…" : logoUrl ? "Replace" : "Upload"}
              </AdminButton>
              {logoUrl ? (
                <AdminButton type="button" variant="ghost" size="xs" onClick={() => setLogoUrl("")}>
                  Remove
                </AdminButton>
              ) : null}
            </div>
          </Field>
        </div>
      </Panel>

      <Panel title="Contact">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Phone" htmlFor="ss-phone">
            <Input id="ss-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
          <Field label="WhatsApp" htmlFor="ss-whatsapp" hint="Number customers can message — shown if set">
            <Input
              id="ss-whatsapp"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="+92 3XX XXXXXXX"
            />
          </Field>
          <Field label="Email" htmlFor="ss-email">
            <Input id="ss-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Hours" htmlFor="ss-hours">
            <Input id="ss-hours" value={hours} onChange={(e) => setHours(e.target.value)} />
          </Field>
          <Field label="Address" htmlFor="ss-address" hint="One line per row">
            <Textarea
              id="ss-address"
              rows={3}
              value={addressLines}
              onChange={(e) => setAddressLines(e.target.value)}
            />
          </Field>
        </div>
      </Panel>

      <Panel title="Shipping & payment">
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Shipping fee (Rs)" htmlFor="ss-shipfee" hint="Flat nationwide courier fee">
            <Input
              id="ss-shipfee"
              type="number"
              min={0}
              value={shippingFee}
              onChange={(e) => setShippingFee(Number(e.target.value))}
            />
          </Field>
          <Field label="Free shipping threshold (Rs)" htmlFor="ss-freeship" hint="Orders at or above this ship free">
            <Input
              id="ss-freeship"
              type="number"
              min={0}
              value={freeShippingThreshold}
              onChange={(e) => setFreeShippingThreshold(Number(e.target.value))}
            />
          </Field>
          <label className="flex items-center gap-3 pt-6 text-sm text-bone/70">
            <input
              type="checkbox"
              checked={codEnabled}
              onChange={(e) => setCodEnabled(e.target.checked)}
              className="accent-gold"
            />
            Cash on Delivery enabled
          </label>
        </div>
        {!codEnabled ? (
          <p className="mt-3 border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
            No other payment method is live yet — turning this off makes
            checkout temporarily unavailable to customers.
          </p>
        ) : null}
      </Panel>

      <Panel
        title="Social links"
        action={
          <AdminButton
            type="button"
            variant="outline"
            size="xs"
            onClick={() => setSocial((s) => [...s, { label: "", href: "" }])}
          >
            <Plus size={13} /> Add link
          </AdminButton>
        }
      >
        {social.length === 0 ? (
          <p className="text-sm text-bone/40">No social links yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {social.map((s, i) => (
              <div key={i} className="grid grid-cols-[1fr_2fr_auto] items-end gap-3">
                <Field label="Label" htmlFor={`ss-social-label-${i}`}>
                  <Input
                    id={`ss-social-label-${i}`}
                    value={s.label}
                    onChange={(e) =>
                      setSocial((arr) => arr.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))
                    }
                  />
                </Field>
                <Field label="URL" htmlFor={`ss-social-href-${i}`}>
                  <Input
                    id={`ss-social-href-${i}`}
                    value={s.href}
                    onChange={(e) =>
                      setSocial((arr) => arr.map((x, j) => (j === i ? { ...x, href: e.target.value } : x)))
                    }
                  />
                </Field>
                <AdminButton
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => setSocial((arr) => arr.filter((_, j) => j !== i))}
                >
                  <Trash2 size={13} />
                </AdminButton>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <p className="text-xs text-bone/35">
        These settings drive the header, footer, contact page and checkout
        across the whole storefront — no code changes needed.
      </p>
    </div>
  );
}
