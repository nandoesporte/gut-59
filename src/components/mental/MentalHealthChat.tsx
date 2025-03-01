
import React from "react";
import { useChatActions } from "./chat/useChatActions";
import { ChatMessage } from "./chat/ChatMessage";
import { ChatInput } from "./chat/ChatInput";
import { ErrorDisplay } from "./chat/ErrorDisplay";
import { ChatHeader } from "./chat/ChatHeader";
import { ScrollToBottomButton } from "./chat/ScrollToBottomButton";

export const MentalHealthChat: React.FC = () => {
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
    <div className="flex flex-col h-full bg-white rounded-lg shadow-sm">
      <div className="p-4">
        <ChatHeader />
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
