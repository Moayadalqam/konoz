import { BarChart3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function formatDateDisplay(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function minutesToDisplay(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function EmptyState({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="py-16">
        <div className="flex flex-col items-center gap-3">
          <BarChart3 className="size-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
      </CardContent>
    </Card>
  );
}
