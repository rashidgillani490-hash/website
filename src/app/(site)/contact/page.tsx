import type { Metadata } from "next";
import { getSiteContent } from "@/lib/cms";
import { Container } from "@/components/ui/primitives";
import { Accordion } from "@/components/ui/Accordion";
import { ContactForm } from "@/components/contact/ContactForm";
import { Mail, Phone, MapPin, Clock, MessageCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Reach the Maison Lumière atelier — client care, press, wholesale and atelier visits.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  const site = await getSiteContent();
  const { contact } = site;

  return (
    <div className="pb-28">
      <header className="border-b border-bone/10 py-16 sm:py-20">
        <Container>
          <span className="eyebrow">We are listening</span>
          <h1 className="mt-4 text-4xl sm:text-5xl lg:text-6xl">Contact the maison</h1>
          <p className="mt-5 max-w-xl text-sm leading-relaxed text-bone/55">
            Advice on choosing a signature, order questions, press and wholesale
            enquiries, or a request to visit the atelier in Grasse.
          </p>
        </Container>
      </header>

      <Container className="grid gap-16 pt-16 lg:grid-cols-[1fr_1.1fr] lg:gap-24">
        <div className="flex flex-col gap-10">
          <div className="flex flex-col gap-6">
            <ContactRow icon={<Mail size={16} />} label="Email">
              <a href={`mailto:${contact.email}`} className="link-underline">
                {contact.email}
              </a>
            </ContactRow>
            <ContactRow icon={<Phone size={16} />} label="Telephone">
              <a href={`tel:${contact.phone.replace(/\s/g, "")}`} className="link-underline">
                {contact.phone}
              </a>
            </ContactRow>
            {contact.whatsapp ? (
              <ContactRow icon={<MessageCircle size={16} />} label="WhatsApp">
                <a
                  href={`https://wa.me/${contact.whatsapp.replace(/[^\d]/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="link-underline"
                >
                  {contact.whatsapp}
                </a>
              </ContactRow>
            ) : null}
            <ContactRow icon={<MapPin size={16} />} label="Atelier">
              <span className="not-italic">
                {contact.addressLines.map((l) => (
                  <span key={l} className="block">
                    {l}
                  </span>
                ))}
              </span>
            </ContactRow>
            <ContactRow icon={<Clock size={16} />} label="Hours">
              {contact.hours}
            </ContactRow>
          </div>

          <div className="relative aspect-[4/3] overflow-hidden border border-bone/10 bg-ink-soft">
            <div className="absolute inset-0 grid place-items-center text-[11px] uppercase tracking-luxe text-bone/30">
              Map — 06130 Grasse
            </div>
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(200,168,102,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(200,168,102,0.4) 1px, transparent 1px)",
                backgroundSize: "40px 40px",
              }}
            />
          </div>
        </div>

        <div className="flex flex-col gap-12">
          <ContactForm />

          <div>
            <h2 className="mb-4 font-serif text-2xl">Frequently asked</h2>
            <Accordion
              items={[
                {
                  id: "q1",
                  title: "How do I choose between concentrations?",
                  content:
                    "Eau de Toilette is lighter and closer to the skin; Eau de Parfum is our standard richness; Extrait is the most concentrated and longest-lasting. Our advisors can recommend a starting point.",
                },
                {
                  id: "q2",
                  title: "Do you ship internationally?",
                  content:
                    "Yes — to most countries, carbon-neutral. Duties and taxes are calculated at checkout for a landed-cost total with no surprises on delivery.",
                },
                {
                  id: "q3",
                  title: "How does the refill programme work?",
                  content:
                    "Every order includes a prepaid label. Send your empty flacon back and we clean, re-engrave and refill it at 20% below a new bottle.",
                },
                {
                  id: "q4",
                  title: "Can I visit the atelier?",
                  content:
                    "Atelier visits run Tuesday to Saturday by appointment. Use the form above and mention your preferred dates.",
                },
              ]}
            />
          </div>
        </div>
      </Container>
    </div>
  );
}

function ContactRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4">
      <span className="mt-0.5 text-gold">{icon}</span>
      <div className="flex flex-col gap-1">
        <span className="text-[10px] uppercase tracking-luxe text-bone/40">
          {label}
        </span>
        <div className="text-sm text-bone/75">{children}</div>
      </div>
    </div>
  );
}
