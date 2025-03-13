
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
      className={`${padding} rounded-lg border-2 cursor-pointer transition-all duration-300 ${
        selected
          ? "border-teal-500 bg-teal-50 shadow-md"
          : "border-gray-200 hover:border-teal-200 hover:bg-teal-50/30"
      } ${className}`}
    >
      {children}
    </div>
  );
};
