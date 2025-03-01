
import React, { useState } from "react";
import { useChatActions } from "./chat/useChatActions";
import { ChatMessage } from "./chat/ChatMessage";
import { ChatInput } from "./chat/ChatInput";
import { ErrorDisplay } from "./chat/ErrorDisplay";
import { ChatHeader } from "./chat/ChatHeader";
import { ScrollToBottomButton } from "./chat/ScrollToBottomButton";
import { Button } from "@/components/ui/button";
import { ActivitySquare } from "lucide-react";

export const MentalHealthChat: React.FC = () => {
  const [isTesting, setIsTesting] = useState(false);
  
  const {
    messages,
    input,
    setInput,
    isLoading,
    errorMessage,
    networkError,
    useGroqFallback,
    messagesEndRef,
    handleSubmit,
    handleRetry,
    switchToGroq,
    scrollToBottom,
    testApiConnection
  } = useChatActions();

  const handleTestApi = async () => {
    setIsTesting(true);
    await testApiConnection();
    setTimeout(() => setIsTesting(false), 3000);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-sm">
      <div className="p-4">
        <ChatHeader />
        <div className="mt-2 flex justify-end">
          <Button 
            variant="outline" 
            size="sm" 
            className="text-xs flex items-center gap-1"
            onClick={handleTestApi}
            disabled={isTesting || isLoading}
          >
            {isTesting ? (
              <>
                <ActivitySquare className="h-3 w-3 animate-pulse" />
                Testando...
              </>
            ) : (
              <>
                <ActivitySquare className="h-3 w-3" />
                Testar API
              </>
            )}
          </Button>
        </div>
      </div>
      
      <div className="flex-1 px-4 overflow-y-auto mb-4 space-y-4">
        {messages.map((message, index) => (
          <ChatMessage key={index} message={message} index={index} />
        ))}
        
        <div ref={messagesEndRef} />
      </div>
      
      <ScrollToBottomButton 
        messageLength={messages.length} 
        scrollToBottom={scrollToBottom} 
      />
      
      <ErrorDisplay 
        errorMessage={errorMessage}
        networkError={networkError}
        useGroqFallback={useGroqFallback}
        handleRetry={handleRetry}
        switchToGroq={switchToGroq}
      />
      
      <div className="p-4 bg-gray-50 border-t">
        <ChatInput
          input={input}
          setInput={setInput}
          handleSubmit={handleSubmit}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};
