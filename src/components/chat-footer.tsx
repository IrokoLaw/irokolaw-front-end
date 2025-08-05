"use client";

import type React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mic, Plus, Send, Settings } from "lucide-react";
import { useState } from "react";

interface ChatFooterProps {
  onSendMessage?: (message: string) => void;
  onAttachFile?: () => void;
  onOpenTools?: () => void;
  placeholder?: string;
}

export function ChatFooter({
  onSendMessage,
  onAttachFile,
  onOpenTools,
  placeholder = "Poser une question",
}: ChatFooterProps) {
  const [inputValue, setInputValue] = useState("");

  const handleSendMessage = () => {
    if (inputValue.trim()) {
      onSendMessage?.(inputValue.trim());
      setInputValue("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const hasText = inputValue.trim().length > 0;

  return (
    <footer className="sticky bottom-0 w-full bg-background border-t p-4 z-50">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center space-x-2">
          {/* Bouton Plus */}
          <Button
            variant="outline"
            size="sm"
            className="h-10 w-10 p-0 rounded-full bg-transparent"
            onClick={onAttachFile}
          >
            <Plus className="w-4 h-4" />
          </Button>

          {/* Bouton Outils */}
          <Button
            variant="outline"
            size="sm"
            className="h-10 px-3 rounded-full bg-transparent"
            onClick={onOpenTools}
          >
            <Settings className="w-4 h-4 mr-2" />
            Outils
          </Button>

          {/* Champ de texte */}
          <div className="flex-1 relative">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={placeholder}
              className="pr-4 h-10 rounded-full border-2 focus:border-primary"
            />
          </div>

          {/* Bouton Microphone/Envoi */}
          <Button
            variant={hasText ? "default" : "outline"}
            size="sm"
            className="h-10 w-10 p-0 rounded-full"
            onClick={hasText ? handleSendMessage : undefined}
            disabled={!hasText && true}
          >
            {hasText ? (
              <Send className="w-4 h-4" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
          </Button>

          {/* Bouton Carré (Stop/Pause) */}
          <Button
            variant="outline"
            size="sm"
            className="h-10 w-10 p-0 rounded-sm bg-transparent"
          >
            <div className="w-3 h-3 bg-current rounded-sm" />
          </Button>
        </div>
      </div>
    </footer>
  );
}
