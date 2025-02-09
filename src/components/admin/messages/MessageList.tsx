
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  read: boolean;
  profiles: {
    name: string | null;
    photo_url: string | null;
  } | null;
}

interface MessageListProps {
  messages: Message[];
  selectedUserId: string;
}

export const MessageList = ({ messages, selectedUserId }: MessageListProps) => {
  return (
    <div className="space-y-4">
      {messages.map((message) => {
        const isUserMessage = message.sender_id === selectedUserId;
        return (
          <div
            key={message.id}
            className={`flex items-end gap-2 ${
              isUserMessage ? 'flex-row' : 'flex-row-reverse'
            }`}
          >
            <Avatar className="w-8 h-8">
              <AvatarImage
                src={message.profiles?.photo_url || undefined}
                alt={message.profiles?.name || ""}
              />
              <AvatarFallback>
                {message.profiles?.name?.[0]?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col max-w-[70%]">
              <div
                className={`p-3 rounded-2xl ${
                  isUserMessage
                    ? 'bg-gray-100 rounded-bl-none'
                    : 'bg-primary-500 text-white rounded-br-none'
                }`}
              >
                <p className="text-sm">{message.content}</p>
              </div>
              <span className="text-xs text-gray-500 mt-1">
                {format(new Date(message.created_at), 'HH:mm')}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  );
};
