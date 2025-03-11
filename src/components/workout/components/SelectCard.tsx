
import * as React from "react";
import { useIsMobile } from "@/hooks/use-mobile";

interface SelectCardProps {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  compact?: boolean;
}

export const SelectCard = ({ 
  selected, 
  onClick, 
  children, 
  className = "",
  compact = false
}: SelectCardProps) => {
  const isMobile = useIsMobile();
  const padding = compact || isMobile ? "p-2 sm:p-3" : "p-3 sm:p-4";
  
  return (
    <div
      onClick={onClick}
      className={`${padding} rounded-lg border-2 cursor-pointer transition-all duration-200 ${
        selected
          ? "border-primary-500 bg-primary-50"
          : "border-gray-200 hover:border-primary-200"
      } ${className}`}
    >
      {children}
    </div>
  );
};
