
import { Message } from './types';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from '@/lib/utils';

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage = ({ message }: ChatMessageProps) => {
  const isUser = message.role === 'user';
  
  return (
    <div className={cn(
      "flex items-start gap-3 mb-4",
      isUser ? "flex-row-reverse" : "flex-row"
    )}>
      <Avatar className="w-8 h-8">
        {isUser ? (
          <AvatarFallback>U</AvatarFallback>
        ) : (
          <>
            <AvatarImage src="/lovable-uploads/9456a3bf-9bc8-45d6-9105-dd939e3362f5.png" alt="AI Assistant" />
            <AvatarFallback>AI</AvatarFallback>
          </>
        )}
      </Avatar>
      <div className={cn(
        "p-3 rounded-lg max-w-[80%]",
        isUser 
          ? "bg-primary text-primary-foreground" 
          : "bg-muted text-foreground"
      )}>
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  );
};
