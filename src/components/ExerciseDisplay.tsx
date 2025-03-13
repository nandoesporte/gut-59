
import React from 'react';
import { 
  Collapsible, 
  CollapsibleContent,
  CollapsibleTrigger 
} from "@/components/ui/collapsible";
import { Card } from "@/components/ui/card";
import { ChevronDown, ChevronUp } from "lucide-react";

interface ExerciseDisplayProps {
  title: React.ReactNode;
  children: React.ReactNode;
  alwaysShow?: boolean;
  className?: string;
}

const ExerciseDisplay = ({ 
  title, 
  children, 
  alwaysShow = false,
  className = "" 
}: ExerciseDisplayProps) => {
  const [isOpen, setIsOpen] = React.useState(false);

  if (alwaysShow) {
    return (
      <Card className={`w-full bg-gradient-to-br from-primary-50 to-white border-none shadow-md transition-all ${className}`}>
        <div className="p-4">
          <div className="mb-3 font-medium text-primary-700">{title}</div>
          <div className="animate-fadeIn">{children}</div>
        </div>
      </Card>
    );
  }
  
  return (
    <Card className={`w-full bg-gradient-to-br from-primary-50 to-white border-none shadow-md overflow-hidden ${className}`}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="p-4">
          <CollapsibleTrigger className="w-full flex justify-between items-center group">
            <div className="font-medium text-primary-700">{title}</div>
            <div className="text-primary-500 bg-primary-100/50 rounded-full p-1.5 transition-all duration-200 group-hover:bg-primary-200/70">
              {isOpen ? 
                <ChevronUp className="h-4 w-4" /> : 
                <ChevronDown className="h-4 w-4" />
              }
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3 animate-fadeIn">
            {children}
          </CollapsibleContent>
        </div>
      </Collapsible>
    </Card>
  );
};

export default ExerciseDisplay;
