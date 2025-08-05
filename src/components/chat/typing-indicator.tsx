import { Avatar } from "@radix-ui/react-avatar";
import { Bot } from "lucide-react";

export default function TypingIndicator() {
  return (
    <div className="flex items-center space-x-2 p-4 bg-muted/50 rounded-lg max-w-xs">
      <Avatar className="w-8 h-8">
        <div className="w-full h-full bg-primary/10 flex items-center justify-center">
          <Bot className="w-4 h-4 text-primary" />
        </div>
      </Avatar>
      <div className="flex space-x-1">
        <div
          className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce"
          style={{ animationDelay: "0ms" }}
        />
        <div
          className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce"
          style={{ animationDelay: "150ms" }}
        />
        <div
          className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce"
          style={{ animationDelay: "300ms" }}
        />
      </div>
    </div>
  );
}
