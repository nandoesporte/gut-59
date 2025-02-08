
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
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
    <div className="h-[500px] overflow-y-auto mb-4 space-y-4 p-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex items-start gap-2 ${
            message.sender_id === selectedUserId ? 'flex-row' : 'flex-row-reverse'
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
          <div
            className={`max-w-[70%] p-3 rounded-lg ${
              message.sender_id === selectedUserId
                ? 'bg-gray-100'
                : 'bg-primary-500 text-white'
            }`}
          >
            <p className="text-sm">{message.content}</p>
          </div>
        </div>
      ))}
    </div>
  );
};
