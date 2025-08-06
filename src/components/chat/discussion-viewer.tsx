"use client";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { useEffect, useMemo, useRef } from "react";

import { useQueries } from "@tanstack/react-query";

import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { Source } from "@/types/api";
import SourceCard from "./source-card";
import Answer from "./answer";
import { PdfViewer } from "./pdf-viewer";
import { useChat } from "@/api/get-chat-in-discussion";
import { useSelectedReference } from "../store/selected-reference";
import { getSource } from "@/api/get-source-in-chat";
import useDisclosure from "@/hooks/use-disclosure";

interface DiscussionViewerProps {
  discussionId: string;
  showEvaluation?: boolean;
  className?: string;
  children?: React.ReactNode;
  isGenerating?: boolean;
  questionFields?: any;
}

// Composant pour afficher le contenu de la discussion
interface DiscussionContentProps {
  chatData: any[];
  sourcesQueries: any[];
  handleOpenDocument: (source: Source, chatId: string) => void;
  onOpen: () => void;
  showEvaluation?: boolean;
  messageEndRef: React.RefObject<HTMLDivElement | null>;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  isGenerating?: boolean;
  questionFields?: any;
}

// Composant pour l'affichage du document PDF
interface DocumentViewerProps {
  isOpen: boolean;
  isMobile: boolean;
  onClose: () => void;
  resolvedSource: Source | undefined;
}

// Implémentation du composant DiscussionContent
export function DiscussionContent({
  chatData,
  sourcesQueries,
  handleOpenDocument,
  onOpen,
}: DiscussionContentProps) {
  return (
    <>
      {chatData.map((chat, index) => {
        const chatSources = sourcesQueries[index]?.data?.data || [];

        const sourceValues = chatSources.sort(
          (a: Source, b: Source) =>
            Number.parseInt(a.reference) - Number.parseInt(b.reference)
        );

        return (
          <div className="z-0 space-y-10 mb-10" key={chat.id}>
            <div>
              <div className="flex flex-col space-y-4 ">
                <Carousel
                  opts={{
                    align: "start",
                  }}
                  className="w-full mx-auto"
                >
                  <div className="flex justify-between pb-4">
                    <h1>Sources ({chatSources.length})</h1>
                    <div className="flex gap-2">
                      <CarouselPrevious />
                      <CarouselNext />
                    </div>
                  </div>
                  <CarouselContent>
                    {sourceValues.map((source: Source, idx: number) => (
                      <CarouselItem key={idx} className="lg:basis-1/2">
                        <SourceCard
                          title={source.legalTextName}
                          article={source.articleNumber}
                          openDoc={() => handleOpenDocument(source, chat.id)}
                          page={source.page}
                          index={idx}
                        />
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                </Carousel>
              </div>
              <div className="flex flex-col space-y-4">
                <h1>Réponse</h1>

                <Answer answer={chat.answer} chatId={chat.id} onOpen={onOpen} />
              </div>
            </div>
            <hr className="mt-6" />
          </div>
        );
      })}
    </>
  );
}

// Implémentation du composant DocumentViewer
export function DocumentViewer({
  isOpen,
  isMobile,
  onClose,
  resolvedSource,
}: DocumentViewerProps) {
  if (!resolvedSource) return null;

  return (
    <>
      {!isMobile && (
        <div
          className={cn(
            "w-2/5 inline-block bg-stone-100 sticky top-0 h-full shadow-sm rounded-lg overflow-y-auto scrollbar-hide",
            { hidden: !isOpen }
          )}
        >
          <Button
            className="absolute top-2 right-2 cursor-pointer hover:bg-primary hover:text-white"
            variant="outline"
            onClick={onClose}
          >
            <X />
          </Button>
          <div className="p-4 pt-10">
            <h1 className="text-center capitalize mb-4">
              {resolvedSource?.legalTextName || "Document"}
            </h1>
            <PdfViewer
              defaultPageNumber={resolvedSource.page}
              pdfUrl={resolvedSource?.pathDoc || ""}
            />
          </div>
        </div>
      )}
    </>
  );
}

export const DiscussionViewer = ({
  discussionId,
  showEvaluation = false,
  className,
  children,
  isGenerating,
  questionFields,
}: DiscussionViewerProps) => {
  const { isOpen, onOpen, onClose } = useDisclosure(false);
  const isMobile = useIsMobile();
  const messageEnd = useRef<HTMLDivElement | null>(null);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useChat({
    discussionId,
  });

  const { selectedReference, setSelectedReference, chatId } =
    useSelectedReference();

  // get data of a page
  const chatData = data?.pages.flatMap((page) => page.data) || [];

  const sourcesQueries = useQueries({
    queries: useMemo(() => {
      return chatData.map((chat) => ({
        queryKey: ["source", chat.id],
        queryFn: () => getSource({ chatId: chat.id }),
        enabled: Boolean(chat.id),
      }));
    }, [chatData]),
  });

  const handleOpenDocument = (source: Source, chatId: string) => {
    setSelectedReference(source.reference || source.id, chatId);
    onOpen();
  };

  // Synchronize the source with the selected reference in the Markdown
  const resolvedSource: Source | undefined = useMemo(() => {
    if (typeof selectedReference === "string" && chatId) {
      const chatIndex = chatData.findIndex((chat) => chat.id === chatId);
      if (chatIndex === -1) return;
      const chatSources = sourcesQueries[chatIndex]?.data?.data || [];
      return chatSources.find(
        (source) =>
          source?.reference === selectedReference ||
          source?.id === selectedReference
      );
    }
    return;
  }, [selectedReference, chatId, chatData, sourcesQueries]);

  // IntersectionObserver to automatically load on scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    if (messageEnd.current) {
      observer.observe(messageEnd.current);
    }

    return () => {
      if (messageEnd.current) {
        observer.unobserve(messageEnd.current);
      }
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    messageEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  return (
    <div
      className={cn(
        "flex w-full h-[86vh] space-x-4",
        {
          "overflow-hidden": isOpen && !isMobile,
        },
        className
      )}
    >
      <div
        className={cn(
          "w-full max-w-4xl mx-auto flex flex-col h-full relative",
          {
            "w-3/5 px-5": isOpen && !isMobile,
          }
        )}
      >
        <div
          className={cn("flex-1 px-4 pb-24 overflow-y-auto scrollbar-hide", {
            "px-0": isOpen && !isMobile,
          })}
        >
          <DiscussionContent
            chatData={chatData}
            sourcesQueries={sourcesQueries}
            handleOpenDocument={handleOpenDocument}
            onOpen={onOpen}
            showEvaluation={showEvaluation}
            messageEndRef={messageEnd}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            isGenerating={isGenerating}
            questionFields={questionFields}
          />
        </div>
        <div className="sticky bottom-4 bg-stone-50 w-full z-50">
          {children}
        </div>
      </div>

      <DocumentViewer
        isOpen={isOpen}
        isMobile={isMobile}
        onClose={onClose}
        resolvedSource={resolvedSource}
      />
    </div>
  );
};

export default DiscussionViewer;
