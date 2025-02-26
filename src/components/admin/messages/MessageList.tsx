
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import type { Message } from "@/types/messages";

interface MessageListProps {
  messages: Message[];
}

export const MessageList = ({ messages }: MessageListProps) => {
  return (
    <div className="space-y-4">
      {messages.map((message) => (
        <Card
          key={message.id}
          className={`p-4 ${
            message.profiles?.photo_url ? "flex items-start gap-3" : ""
          }`}
        >
          {message.profiles?.photo_url && (
            <Avatar>
              <AvatarImage src={message.profiles.photo_url} alt={message.profiles.name || ''} />
              <AvatarFallback>
                {message.profiles.name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
          )}
          <div>
            {message.profiles?.name && (
              <p className="font-semibold mb-1">{message.profiles.name}</p>
            )}
            <p className="text-gray-600">{message.content}</p>
          </div>
        </Card>
      ))}
    </div>
  );
};
