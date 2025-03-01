
import React from "react";
import { ChatHeader } from "./chat/ChatHeader";
import { ChatMessage } from "./chat/ChatMessage";
import { ChatInput } from "./chat/ChatInput";
import { ErrorDisplay } from "./chat/ErrorDisplay";
import { ScrollToBottomButton } from "./chat/ScrollToBottomButton";
import { useChatActions } from "./chat/useChatActions";

export const MentalHealthChat = () => {
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
    scrollToBottom
  } = useChatActions();

  return (
    <div className="flex flex-col h-full">
      <ChatHeader />
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <ChatMessage key={index} message={message} index={index} />
        ))}
        
        <ErrorDisplay 
          errorMessage={errorMessage} 
          networkError={networkError} 
          useGroqFallback={useGroqFallback}
          handleRetry={handleRetry}
          switchToGroq={switchToGroq}
        />
        
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t p-4">
        <ChatInput
          input={input}
          setInput={setInput}
          handleSubmit={handleSubmit}
          isLoading={isLoading}
        />
        
        <ScrollToBottomButton 
          messageLength={messages.length} 
          scrollToBottom={scrollToBottom} 
        />
      </div>
    </div>
  );
};
