import type { ReactNode } from "react";
import { ActionButton } from "@/components/ui/action-button";
import { MarkdownReadonly } from "@/components/ui/markdown/markdown-readonly";
import { toast } from "@/components/ui/sonner";
import LoadingSpinner from "@/components/ui/spinner";
import { useSession } from "@/lib/auth/client";
import { useClientConfig } from "@/lib/clientConfig";
import { useTranslation } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import { AlertCircle, RefreshCw, Sparkles, Trash2 } from "lucide-react";

import {
  useSummarizeBookmark,
  useUpdateBookmark,
} from "@karakeep/shared-react/hooks/bookmarks";
import { BookmarkTypes, ZBookmark } from "@karakeep/shared/types/bookmarks";

function SlotContainer({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex h-56 w-full overflow-hidden bg-accent",
        className,
      )}
      data-no-card-click
    >
      {children}
    </div>
  );
}

function SummaryView({
  bookmark,
  readOnly,
}: {
  bookmark: ZBookmark;
  readOnly: boolean;
}) {
  const summary = bookmark.summary ?? "";
  const { mutate: resummarize, isPending: isResummarizing } =
    useSummarizeBookmark({
      onError: () => {
        toast({ description: "Something went wrong", variant: "destructive" });
      },
    });
  const { mutate: updateBookmark, isPending: isUpdatingBookmark } =
    useUpdateBookmark({
      onError: () => {
        toast({ description: "Something went wrong", variant: "destructive" });
      },
    });

  const showOverlay = isResummarizing || isUpdatingBookmark;

  return (
    <SlotContainer>
      <div className="flex h-full w-full flex-col overflow-hidden p-3">
        <div className="flex-1 overflow-hidden">
          <MarkdownReadonly className="text-base leading-snug">
            {summary}
          </MarkdownReadonly>
        </div>
        {!readOnly && (
          /* oxlint-disable-next-line click-events-have-key-events, no-static-element-interactions */
          <div
            className="flex justify-end gap-2 pt-2"
            onClick={(e) => e.stopPropagation()}
          >
            <ActionButton
              variant="none"
              size="none"
              spinner={<LoadingSpinner className="size-4" />}
              className="rounded-full bg-gray-200 p-1 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
              aria-label="Resummarize"
              loading={isResummarizing}
              onClick={() => resummarize({ bookmarkId: bookmark.id })}
            >
              <RefreshCw size={14} />
            </ActionButton>
            <ActionButton
              size="none"
              variant="none"
              spinner={<LoadingSpinner className="size-4" />}
              className="rounded-full bg-gray-200 p-1 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
              aria-label="Delete summary"
              loading={isUpdatingBookmark}
              onClick={() =>
                updateBookmark({ bookmarkId: bookmark.id, summary: null })
              }
            >
              <Trash2 size={14} />
            </ActionButton>
          </div>
        )}
      </div>
      {showOverlay && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm">
          <LoadingSpinner className="size-5" />
        </div>
      )}
    </SlotContainer>
  );
}

function PendingView() {
  return (
    <SlotContainer className="items-center justify-center">
      <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
        <LoadingSpinner className="size-5" />
        <span>Summarizing…</span>
      </div>
    </SlotContainer>
  );
}

function FailureView({
  bookmark,
  readOnly,
}: {
  bookmark: ZBookmark;
  readOnly: boolean;
}) {
  const { mutate, isPending } = useSummarizeBookmark({
    onError: () => {
      toast({ description: "Something went wrong", variant: "destructive" });
    },
  });

  return (
    <SlotContainer className="items-center justify-center">
      {/* oxlint-disable-next-line click-events-have-key-events, no-static-element-interactions */}
      <div
        className="flex flex-col items-center gap-2 p-3 text-sm text-muted-foreground"
        onClick={(e) => e.stopPropagation()}
      >
        <AlertCircle className="size-5 text-destructive" />
        <span>Summarization failed</span>
        {!readOnly && (
          <ActionButton
            size="sm"
            variant="secondary"
            loading={isPending}
            onClick={() => mutate({ bookmarkId: bookmark.id })}
          >
            <RefreshCw className="mr-1 size-3" />
            Retry
          </ActionButton>
        )}
      </div>
    </SlotContainer>
  );
}

function GenerateView({ bookmark }: { bookmark: ZBookmark }) {
  const { t } = useTranslation();
  const { mutate, isPending } = useSummarizeBookmark({
    onError: () => {
      toast({ description: "Something went wrong", variant: "destructive" });
    },
  });

  return (
    <SlotContainer className="items-center justify-center">
      {/* oxlint-disable-next-line click-events-have-key-events, no-static-element-interactions */}
      <div onClick={(e) => e.stopPropagation()}>
        <ActionButton
          onClick={() => mutate({ bookmarkId: bookmark.id })}
          variant="secondary"
          loading={isPending}
        >
          <span className="flex items-center gap-1.5">
            {t("actions.summarize_with_ai")}
            <Sparkles className="size-4" />
          </span>
        </ActionButton>
      </div>
    </SlotContainer>
  );
}

export default function AiSummarySlot({
  bookmark,
  fallbackImage,
}: {
  bookmark: ZBookmark;
  fallbackImage: ReactNode;
}) {
  const clientConfig = useClientConfig();
  const { data: session } = useSession();
  const isOwner = session?.user?.id === bookmark.userId;
  const readOnly = !isOwner;

  // Only LINK bookmarks support AI summaries — fall back for other types.
  if (bookmark.content.type !== BookmarkTypes.LINK) {
    return <>{fallbackImage}</>;
  }

  if (bookmark.summary) {
    return <SummaryView bookmark={bookmark} readOnly={readOnly} />;
  }

  if (bookmark.summarizationStatus === "pending") {
    return <PendingView />;
  }

  if (bookmark.summarizationStatus === "failure") {
    return <FailureView bookmark={bookmark} readOnly={readOnly} />;
  }

  // No summary; show Generate button when possible, else fall back to image.
  if (!clientConfig.inference.isConfigured || readOnly) {
    return <>{fallbackImage}</>;
  }

  return <GenerateView bookmark={bookmark} />;
}
