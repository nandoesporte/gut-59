
import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowBigDown } from "lucide-react";

interface ScrollToBottomButtonProps {
  messageLength: number;
  scrollToBottom: () => void;
}

export const ScrollToBottomButton: React.FC<ScrollToBottomButtonProps> = ({
  messageLength,
  scrollToBottom,
}) => {
  if (messageLength <= 5) return null;
  
  return (
    <Button
      variant="ghost"
      size="sm"
      className="mt-2 text-xs w-full text-gray-500 hover:text-gray-700 flex items-center justify-center"
      onClick={scrollToBottom}
    >
      <ArrowBigDown className="h-3 w-3 mr-1" />
      Rolar para o final
    </Button>
  );
};
