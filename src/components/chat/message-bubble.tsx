"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Message } from "@/utils/types/chat";
import { Bot, Mic, Pause, Play, User, Volume2 } from "lucide-react";
import MarkdownMessage from "./markdown";
import { useQueries } from "@tanstack/react-query";
import { useSelectedReference } from "../store/selected-reference";
import { useChat } from "@/api/get-chat-in-discussion";
import { useMemo, useRef } from "react";
import { getSource } from "@/api/get-source-in-chat";
import { Source } from "@/types/api";
import useDisclosure from "@/hooks/use-disclosure";
import { DiscussionContent } from "./discussion-viewer";

interface MessageBubbleProps {
  message: Message;
  discussionId: string;
  onPlayAudio: (messageId: string, content: string) => void;
  onPauseAudio: (messageId: string) => void;
  onPlayRecordedAudio: (messageId: string, audioUrl: string) => void;
  formatDuration: (seconds: number) => string;
}

export function MessageBubble({
  message,
  onPlayAudio,
  onPauseAudio,
  onPlayRecordedAudio,
  formatDuration,
  discussionId,
}: MessageBubbleProps) {
  const isUser = message.sender === "user";
  const isAudioMessage = message.type === "audio";

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useChat({
    discussionId,
  });

  const { selectedReference, setSelectedReference, chatId } =
    useSelectedReference();
  const { isOpen, onOpen, onClose } = useDisclosure(false);
  const messageEnd = useRef<HTMLDivElement | null>(null);

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

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <Card
        className={`max-w-[80%] p-3 ${
          isUser ? "bg-primary  text-primary-foreground" : "bg-muted"
        }`}
      >
        <div className="flex items-start space-x-2">
          <div className="flex-shrink-0">
            {isUser ? (
              <User className="w-4 h-4 mt-1" />
            ) : (
              <Bot className="w-4 h-4 mt-1" />
            )}
          </div>
          <div className="flex-1 text-white">
            {isAudioMessage ? (
              <div className="space-y-2">
                <div className="flex items-center space-x-2 mb-2">
                  <Mic className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {isUser ? "Votre message vocal" : "Message vocal"}
                  </span>
                  {message.duration && (
                    <span className="text-xs opacity-70 bg-background/20 px-2 py-1 rounded-full">
                      {formatDuration(message.duration)}
                    </span>
                  )}
                </div>
                {message.audioUrl ? (
                  <div className="bg-background/10 rounded-lg p-3 border border-background/20">
                    <div className="flex items-center space-x-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          message.isPlaying
                            ? onPauseAudio(message.id)
                            : onPlayRecordedAudio(message.id, message.audioUrl!)
                        }
                        className={`h-10 w-10 p-0 rounded-full transition-all duration-200 ${
                          message.isPlaying
                            ? "bg-background/30 scale-110"
                            : "bg-background/20 hover:bg-background/30"
                        }`}
                      >
                        {message.isPlaying ? (
                          <Pause className="w-5 h-5" />
                        ) : (
                          <Play className="w-5 h-5 ml-0.5" />
                        )}
                      </Button>
                      <div className="flex-1 flex items-center space-x-1 h-8">
                        {Array.from({ length: 20 }, (_, i) => (
                          <div
                            key={i}
                            className={`w-1 bg-current rounded-full transition-all duration-300 ${
                              message.isPlaying ? "animate-pulse" : ""
                            }`}
                            style={{
                              height: `${Math.random() * 60 + 20}%`,
                              opacity: message.isPlaying ? 0.8 : 0.4,
                            }}
                          />
                        ))}
                      </div>
                      <Volume2
                        className={`w-4 h-4 ${
                          message.isPlaying ? "animate-pulse" : "opacity-50"
                        }`}
                      />
                    </div>
                    <div className="mt-2 h-1 bg-background/20 rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-current rounded-full transition-all duration-300 ${
                          message.isPlaying ? "w-full" : "w-0"
                        }`}
                        style={{
                          transitionDuration:
                            message.isPlaying && message.duration
                              ? `${message.duration}s`
                              : "0.3s",
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="bg-background/10 rounded-lg p-3 border border-background/20">
                    <div className="flex items-center justify-center space-x-2 text-sm opacity-60">
                      <Mic className="w-4 h-4" />
                      <span>Audio non disponible</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="">
                {chatData.length > 0 ? (
                  <div className="mt-2">
                    <DiscussionContent
                      messageEndRef={messageEnd}
                      chatData={chatData}
                      sourcesQueries={sourcesQueries}
                      handleOpenDocument={handleOpenDocument}
                      onOpen={onOpen}
                      hasNextPage={hasNextPage}
                      isFetchingNextPage={isFetchingNextPage}
                    />
                  </div>
                ) : (
                  <MarkdownMessage
                    answer={message.content ?? ""}
                  ></MarkdownMessage>
                )}
              </div>
            )}
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs opacity-70">
                {message.timestamp.toLocaleTimeString()}
              </span>
              {!isUser && message.type === "text" && message.content && (
                <Button
                  variant="ghost"
                  size="sm"
                  // onClick={() =>
                  //   message.isPlaying
                  //     ? onPauseAudio(message.id)
                  //     : onPlayAudio(message.id, message.content!)
                  // }
                  className="h-6 w-6 p-0"
                >
                  {message.isPlaying ? (
                    <Pause className="w-3 h-3" />
                  ) : (
                    <Play className="w-3 h-3" />
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
