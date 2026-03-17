
import { Loader2 } from "lucide-react";

export default function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-center gap-3">
        <Loader2 className="w-4 h-4 animate-spin text-primary flex-shrink-0" />
        <span className="text-muted-foreground text-sm italic">
          Crafting your travel plan…
        </span>
      </div>

    <div className="h-16 bg-muted/60 rounded-lg w-[100%]" />
      {/* Skeleton lines mimicking itinerary */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded-full bg-primary/20 flex-shrink-0" />
          <div className="h-3 bg-muted rounded-full w-24" />
        </div>
        <div className="ml-7 space-y-2">
          <div className="h-10 bg-muted/60 rounded-lg w-full" />
        </div>
        <div className="flex items-center gap-3 pt-1">
          <div className="w-4 h-4 rounded-full bg-primary/20 flex-shrink-0" />
          <div className="h-3 bg-muted rounded-full w-20" />
        </div>
        <div className="ml-7 space-y-2">
          <div className="h-10 bg-muted/60 rounded-lg w-[90%]" />
        </div>
      </div>

    <div className="mt-8 h-16 bg-muted/60 rounded-lg w-[100%]" />
    </div>
  );
}