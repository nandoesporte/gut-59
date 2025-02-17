
import * as React from "react";

interface SelectCardProps {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}

export const SelectCard = ({ selected, onClick, children, className = "" }: SelectCardProps) => (
  <div
    onClick={onClick}
    className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
      selected
        ? "border-primary-500 bg-primary-50"
        : "border-gray-200 hover:border-primary-200"
    } ${className}`}
  >
    {children}
  </div>
);
