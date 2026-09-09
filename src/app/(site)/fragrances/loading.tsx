import { Container } from "@/components/ui/primitives";
import { ProductGridSkeleton, Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="pb-28">
      <header className="border-b border-bone/10 py-16 sm:py-20">
        <Container className="flex flex-col gap-4">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-12 w-80" />
          <Skeleton className="h-4 w-full max-w-xl" />
        </Container>
      </header>
      <Container className="grid gap-12 pt-16 lg:grid-cols-[280px_1fr] lg:gap-16">
        <div className="flex flex-col gap-6">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
        <ProductGridSkeleton />
      </Container>
    </div>
  );
}
