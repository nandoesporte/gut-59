
import { useChat } from './useChat';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw } from 'lucide-react';
import { useEffect, useRef } from 'react';

export const ChatContainer = () => {
  const { messages, isLoading, error, sendMessage, resetChat } = useChat();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <Card className="w-full h-[600px] flex flex-col">
      <CardHeader className="border-b pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg flex items-center gap-2">
            <img src="/lovable-uploads/9456a3bf-9bc8-45d6-9105-dd939e3362f5.png" 
                 alt="Mais Saúde" 
                 className="h-6 w-auto" />
            Assistente Mais Saúde
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={resetChat}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Nova conversa
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full p-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
              <img 
                src="/lovable-uploads/9456a3bf-9bc8-45d6-9105-dd939e3362f5.png" 
                alt="Mais Saúde" 
                className="h-12 w-auto mb-4 opacity-50" 
              />
              <h3 className="font-medium mb-2">Assistente de Saúde</h3>
              <p>Olá! Sou seu assistente de saúde. Como posso ajudar você hoje?</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, i) => (
                <ChatMessage key={i} message={message} />
              ))}
              {isLoading && (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              )}
              {error && (
                <div className="p-3 bg-destructive/10 text-destructive rounded-lg">
                  Erro: {error}
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </ScrollArea>
      </CardContent>
      <CardFooter className="border-t pt-3">
        <ChatInput onSend={sendMessage} disabled={isLoading} />
      </CardFooter>
    </Card>
  );
};
