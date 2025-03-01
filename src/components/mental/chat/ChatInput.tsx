
import React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowUp, Loader2 } from "lucide-react";

interface ChatInputProps {
  input: string;
  setInput: (input: string) => void;
  handleSubmit: (e?: React.FormEvent) => void;
  isLoading: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  input,
  setInput,
  handleSubmit,
  isLoading,
}) => {
  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Digite sua mensagem..."
        className="resize-none min-h-[80px]"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
          }
        }}
      />
      <Button 
        type="submit" 
        size="icon" 
        className="h-10 w-10 shrink-0 self-end"
        disabled={isLoading || !input.trim()}
      >
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <ArrowUp className="h-5 w-5" />
        )}
      </Button>
    </form>
  );
};
