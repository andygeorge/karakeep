import { ActionButton } from "@/components/ui/action-button";
import { MarkdownReadonly } from "@/components/ui/markdown/markdown-readonly";
import { toast } from "@/components/ui/sonner";
import LoadingSpinner from "@/components/ui/spinner";
import { useClientConfig } from "@/lib/clientConfig";
import { useTranslation } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import { RefreshCw, Sparkles, Trash2 } from "lucide-react";

import {
  useSummarizeBookmark,
  useUpdateBookmark,
} from "@karakeep/shared-react/hooks/bookmarks";
import { BookmarkTypes, ZBookmark } from "@karakeep/shared/types/bookmarks";

function AISummary({
  bookmarkId,
  summary,
  readOnly = false,
}: {
  bookmarkId: string;
  summary: string;
  readOnly?: boolean;
}) {
  const { mutate: resummarize, isPending: isResummarizing } =
    useSummarizeBookmark({
      onError: () => {
        toast({
          description: "Something went wrong",
          variant: "destructive",
        });
      },
    });
  const { mutate: updateBookmark, isPending: isUpdatingBookmark } =
    useUpdateBookmark({
      onError: () => {
        toast({
          description: "Something went wrong",
          variant: "destructive",
        });
      },
    });
  return (
    <div className="w-full p-1">
      <div className="relative overflow-hidden rounded-lg border border-muted-foreground/20 p-[2px]">
        <div className="h-full rounded-lg bg-accent p-2">
          <MarkdownReadonly className="text-sm">{summary}</MarkdownReadonly>
          {!readOnly && (
            <span className="flex justify-end gap-2 pt-2">
              <ActionButton
                variant="none"
                size="none"
                spinner={<LoadingSpinner className="size-4" />}
                className="rounded-full bg-gray-200 p-1 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                aria-label="Resummarize"
                loading={isResummarizing}
                onClick={() => resummarize({ bookmarkId })}
              >
                <RefreshCw size={16} />
              </ActionButton>
              <ActionButton
                size="none"
                variant="none"
                spinner={<LoadingSpinner className="size-4" />}
                className="rounded-full bg-gray-200 p-1 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                aria-label="Delete summary"
                loading={isUpdatingBookmark}
                onClick={() => updateBookmark({ bookmarkId, summary: null })}
              >
                <Trash2 size={16} />
              </ActionButton>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SummarizeBookmarkArea({
  bookmark,
  readOnly = false,
}: {
  bookmark: ZBookmark;
  readOnly?: boolean;
}) {
  const { t } = useTranslation();
  const { mutate, isPending } = useSummarizeBookmark({
    onError: () => {
      toast({
        description: "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const clientConfig = useClientConfig();
  if (bookmark.content.type !== BookmarkTypes.LINK) {
    return null;
  }

  if (bookmark.summary) {
    return (
      <AISummary
        bookmarkId={bookmark.id}
        summary={bookmark.summary}
        readOnly={readOnly}
      />
    );
  } else if (!clientConfig.inference.isConfigured || readOnly) {
    return null;
  } else {
    return (
      <div className="flex w-full items-center gap-4">
        <ActionButton
          onClick={() => mutate({ bookmarkId: bookmark.id })}
          variant="secondary"
          className={cn(
            `w-full text-muted-foreground transition-all duration-300 hover:text-foreground`,
          )}
          loading={isPending}
        >
          <span className="flex items-center gap-1.5">
            {t("actions.summarize_with_ai")}
            <Sparkles className="size-4" />
          </span>
        </ActionButton>
      </div>
    );
  }
}
