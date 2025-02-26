
import { useEffect, useRef } from "react";
import { MessageInput } from "./MessageInput";
import { MessageList } from "./MessageList";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Message } from "@/types/messages";

interface UserConversationProps {
  messages: Message[];
  selectedUserId: string | null;
  onMessageSent: () => void;
  role: "nutritionist" | "personal";
}

export const UserConversation = ({
  messages,
  selectedUserId,
  onMessageSent,
  role,
}: UserConversationProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!selectedUserId) {
    return (
      <Card className="h-full flex items-center justify-center text-gray-500">
        Selecione um usuário para ver a conversa
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <ScrollArea className="flex-1 p-4">
        <MessageList messages={messages} />
        <div ref={messagesEndRef} />
      </ScrollArea>
      <div className="p-4 border-t">
        <MessageInput
          selectedUserId={selectedUserId}
          onMessageSent={onMessageSent}
          role={role}
        />
      </div>
    </Card>
  );
};
