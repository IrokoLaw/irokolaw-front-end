"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Message } from "@/utils/types/chat";
import { Bot, Mic, Pause, Play, User, Volume2 } from "lucide-react";

interface MessageBubbleProps {
  message: Message;
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
}: MessageBubbleProps) {
  const isUser = message.sender === "user";
  const isAudioMessage = message.type === "audio";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <Card
        className={`max-w-[80%] p-3 ${
          isUser ? "bg-primary text-primary-foreground" : "bg-muted"
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
          <div className="flex-1">
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
              <p className="text-sm">{message.content}</p>
            )}
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs opacity-70">
                {message.timestamp.toLocaleTimeString()}
              </span>
              {!isUser && message.type === "text" && message.content && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    message.isPlaying
                      ? onPauseAudio(message.id)
                      : onPlayAudio(message.id, message.content!)
                  }
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
