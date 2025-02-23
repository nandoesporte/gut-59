
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface MessageInputProps {
  newMessage: string;
  onMessageChange: (value: string) => void;
  onSendMessage: () => Promise<void>;
  loading: boolean;
}

export const MessageInput = ({ 
  newMessage, 
  onMessageChange, 
  onSendMessage, 
  loading 
}: MessageInputProps) => {
  return (
    <div className="space-y-2">
      <Label>Nova Mensagem</Label>
      <div className="flex gap-2">
        <Input
          value={newMessage}
          onChange={(e) => onMessageChange(e.target.value)}
          placeholder="Digite sua mensagem..."
          disabled={loading}
        />
        <Button
          onClick={onSendMessage}
          disabled={!newMessage?.trim() || loading}
        >
          Enviar
        </Button>
      </div>
    </div>
  );
};
