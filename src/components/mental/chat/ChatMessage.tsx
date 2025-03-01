
import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatMessageProps {
  message: Message;
  index: number;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, index }) => {
  return (
    <div
      key={index}
      className={`flex items-start gap-3 ${
        message.role === "user" ? "justify-end" : "justify-start"
      }`}
    >
      {message.role === "assistant" && (
        <Avatar className="h-8 w-8 bg-primary-50">
          <AvatarImage src="/lovable-uploads/9456a3bf-9bc8-45d6-9105-dd939e3362f5.png" alt="IA" />
          <AvatarFallback>IA</AvatarFallback>
        </Avatar>
      )}
      <div
        className={`rounded-lg p-4 max-w-[80%] ${
          message.role === "user"
            ? "bg-primary-500 text-white"
            : "bg-muted"
        }`}
      >
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
      </div>
      {message.role === "user" && (
        <Avatar className="h-8 w-8">
          <AvatarFallback>EU</AvatarFallback>
        </Avatar>
      )}
    </div>
  );
};
