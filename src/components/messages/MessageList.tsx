
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
  adminId: string;
}

export const MessageList = ({ messages, adminId }: MessageListProps) => {
  return (
    <div className="space-y-4 h-[400px] overflow-y-auto p-4 border rounded-lg">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex items-start gap-2 ${
            message.sender_id === adminId ? 'flex-row' : 'flex-row-reverse'
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
              message.sender_id === adminId
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
