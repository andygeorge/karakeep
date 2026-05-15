import { MarkdownReadonly } from "@/components/ui/markdown/markdown-readonly";
import { cn } from "@/lib/utils";
import { ChevronDown, Sparkles } from "lucide-react";

import { ZBookmark } from "@karakeep/shared/types/bookmarks";

export default function AiSummaryInline({
  bookmark,
  expanded,
  onToggle,
  clampLines = 2,
}: {
  bookmark: ZBookmark;
  expanded: boolean;
  onToggle: () => void;
  clampLines?: 1 | 2;
}) {
  if (!bookmark.summary) {
    return null;
  }

  const clampClass = clampLines === 1 ? "line-clamp-1" : "line-clamp-2";

  return (
    <div className="w-full" data-no-card-click>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className="flex w-full items-start gap-1.5 rounded-md p-1 text-left text-base text-muted-foreground hover:bg-accent/50"
        aria-expanded={expanded}
        aria-label={expanded ? "Collapse AI summary" : "Expand AI summary"}
      >
        <Sparkles className="mt-0.5 size-3 shrink-0 text-muted-foreground/70" />
        {!expanded && (
          <span className={cn("min-w-0 flex-1 break-words", clampClass)}>
            {bookmark.summary}
          </span>
        )}
        {expanded && (
          <span className="min-w-0 flex-1 font-medium">AI summary</span>
        )}
        <ChevronDown
          className={cn(
            "mt-0.5 size-3 shrink-0 transition-transform",
            expanded && "rotate-180",
          )}
        />
      </button>
      {expanded && (
        <div className="mt-1 rounded-md bg-accent/40 p-2">
          <MarkdownReadonly className="text-base leading-snug">
            {bookmark.summary}
          </MarkdownReadonly>
        </div>
      )}
    </div>
  );
}
