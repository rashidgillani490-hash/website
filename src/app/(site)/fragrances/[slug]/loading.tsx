import { Container } from "@/components/ui/primitives";
import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <Container className="grid gap-16 py-16 lg:grid-cols-2">
      <Skeleton className="aspect-[4/5] w-full" />
      <div className="flex flex-col gap-5">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="mt-6 h-28 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    </Container>
  );
}
