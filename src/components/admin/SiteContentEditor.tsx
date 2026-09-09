"use client";

import { useState, useTransition } from "react";
import { Check, AlertCircle } from "lucide-react";
import type { SiteContent } from "@/lib/types";
import { Field, Input, Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/Button";
import { Panel } from "./ui";
import { saveSiteContentAction } from "@/app/admin/actions";

const lines = (v: FormDataEntryValue | null) =>
  String(v ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

export function SiteContentEditor({ site }: { site: SiteContent }) {
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<
    { tone: "ok" | "error"; message: string } | null
  >(null);

  function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    // Build the full SiteContent object, merging edits over the current record
    // so nested fields that have no input here are preserved.
    const next: SiteContent = {
      ...site,
      tagline: String(fd.get("tagline") ?? site.tagline),
      announcement: String(fd.get("announcement") ?? site.announcement),
      hero: {
        ...site.hero,
        kicker: String(fd.get("hero.kicker") ?? site.hero.kicker),
        title: String(fd.get("hero.title") ?? site.hero.title),
        subtitle: String(fd.get("hero.subtitle") ?? site.hero.subtitle),
        ctaPrimary: {
          label: String(fd.get("hero.ctaPrimary.label") ?? site.hero.ctaPrimary.label),
          href: String(fd.get("hero.ctaPrimary.href") ?? site.hero.ctaPrimary.href),
        },
      },
      intro: {
        heading: String(fd.get("intro.heading") ?? site.intro.heading),
        body: lines(fd.get("intro.body")),
      },
      story: {
        ...site.story,
        heading: String(fd.get("story.heading") ?? site.story.heading),
        body: lines(fd.get("story.body")),
        stats: lines(fd.get("story.stats")).map((row) => {
          const [label, value] = row.split("|").map((s) => s.trim());
          return { label: label ?? "", value: value ?? "" };
        }),
      },
      values: site.values.map((v, i) => ({
        ...v,
        title: String(fd.get(`values.${i}.title`) ?? v.title),
        description: String(fd.get(`values.${i}.description`) ?? v.description),
      })),
      // Brand name, logo, contact details and social links are business/
      // operational settings, not marketing copy — edited on Admin → Settings
      // (`StoreSettingsForm`) instead. Preserved here via the `...site` spread.
    };

    startTransition(async () => {
      const result = await saveSiteContentAction(next);
      setStatus({
        tone: result.ok ? "ok" : "error",
        message: result.message,
      });
    });
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-serif text-2xl">Site content</h2>
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
          <Button type="submit" variant="primary" size="sm" disabled={pending}>
            {pending ? "Publishing…" : "Publish changes"}
          </Button>
        </div>
      </div>

      <Panel title="Brand">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Tagline" htmlFor="tagline">
            <Input id="tagline" name="tagline" defaultValue={site.tagline} />
          </Field>
          <Field label="Announcement bar" htmlFor="announcement">
            <Input id="announcement" name="announcement" defaultValue={site.announcement} />
          </Field>
        </div>
        <p className="mt-3 text-xs text-bone/35">
          Brand name, logo, contact details and social links live on{" "}
          <span className="text-bone/50">Admin → Settings</span>.
        </p>
      </Panel>

      <Panel title="Hero">
        <div className="grid gap-5">
          <Field label="Kicker" htmlFor="hero.kicker">
            <Input id="hero.kicker" name="hero.kicker" defaultValue={site.hero.kicker} />
          </Field>
          <Field label="Title" htmlFor="hero.title">
            <Input id="hero.title" name="hero.title" defaultValue={site.hero.title} />
          </Field>
          <Field label="Subtitle" htmlFor="hero.subtitle">
            <Textarea id="hero.subtitle" name="hero.subtitle" rows={3} defaultValue={site.hero.subtitle} />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Primary CTA label" htmlFor="hero.ctaPrimary.label">
              <Input
                id="hero.ctaPrimary.label"
                name="hero.ctaPrimary.label"
                defaultValue={site.hero.ctaPrimary.label}
              />
            </Field>
            <Field label="Primary CTA link" htmlFor="hero.ctaPrimary.href">
              <Input
                id="hero.ctaPrimary.href"
                name="hero.ctaPrimary.href"
                defaultValue={site.hero.ctaPrimary.href}
              />
            </Field>
          </div>
        </div>
      </Panel>

      <Panel title="Brand introduction">
        <div className="grid gap-5">
          <Field label="Heading" htmlFor="intro.heading">
            <Input id="intro.heading" name="intro.heading" defaultValue={site.intro.heading} />
          </Field>
          <Field label="Body" htmlFor="intro.body" hint="One paragraph per line">
            <Textarea id="intro.body" name="intro.body" rows={5} defaultValue={site.intro.body.join("\n")} />
          </Field>
        </div>
      </Panel>

      <Panel title="Story">
        <div className="grid gap-5">
          <Field label="Heading" htmlFor="story.heading">
            <Input id="story.heading" name="story.heading" defaultValue={site.story.heading} />
          </Field>
          <Field label="Body" htmlFor="story.body" hint="One paragraph per line">
            <Textarea id="story.body" name="story.body" rows={5} defaultValue={site.story.body.join("\n")} />
          </Field>
          <Field label="Stats" htmlFor="story.stats" hint="label | value per line">
            <Textarea
              id="story.stats"
              name="story.stats"
              rows={4}
              defaultValue={site.story.stats.map((s) => `${s.label} | ${s.value}`).join("\n")}
            />
          </Field>
        </div>
      </Panel>

      <Panel title="Values / why choose us">
        <div className="grid gap-3">
          {site.values.map((v, i) => (
            <div key={i} className="grid gap-3 sm:grid-cols-[1fr_2fr]">
              <Field label={`Value ${i + 1} title`} htmlFor={`values.${i}.title`}>
                <Input id={`values.${i}.title`} name={`values.${i}.title`} defaultValue={v.title} />
              </Field>
              <Field label="Description" htmlFor={`values.${i}.description`}>
                <Input
                  id={`values.${i}.description`}
                  name={`values.${i}.description`}
                  defaultValue={v.description}
                />
              </Field>
            </div>
          ))}
        </div>
      </Panel>

      <p className="text-xs text-bone/35">
        Publishing writes to <code className="text-bone/50">store_settings.site_content</code> in
        Supabase and revalidates the storefront. Without a service-role key the
        change is previewed only.
      </p>
    </form>
  );
}
