
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

interface MessageInputProps {
  newMessage: string;
  onMessageChange: (message: string) => void;
  onSendMessage: () => void;
  loading: boolean;
}

export const MessageInput = ({
  newMessage,
  onMessageChange,
  onSendMessage,
  loading,
}: MessageInputProps) => {
  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={newMessage}
        onChange={(e) => onMessageChange(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && onSendMessage()}
        placeholder="Digite sua mensagem..."
        className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
      />
      <Button
        onClick={onSendMessage}
        disabled={loading || !newMessage.trim()}
      >
        <Send className="w-4 h-4 mr-2" />
        Enviar
      </Button>
    </div>
  );
};
