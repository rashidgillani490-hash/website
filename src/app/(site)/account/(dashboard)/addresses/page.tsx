import { demoAddresses } from "@/lib/data/account";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/primitives";

export default function AddressesPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-2xl">Saved addresses</h2>
        <Button variant="outline" size="sm">
          Add address
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {demoAddresses.map((a) => (
          <div key={a.id} className="flex flex-col gap-3 border border-bone/10 p-6">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wide2 text-bone/50">
                {a.label}
              </span>
              {a.default ? <Badge tone="gold">Default</Badge> : null}
            </div>
            <address className="not-italic text-sm leading-relaxed text-bone/70">
              <span className="block text-bone">{a.name}</span>
              {a.lines.map((l) => (
                <span key={l} className="block">
                  {l}
                </span>
              ))}
            </address>
            <div className="mt-2 flex gap-4 text-[11px] uppercase tracking-wide2 text-bone/40">
              <button className="hover:text-bone">Edit</button>
              <button className="hover:text-bone">Remove</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
