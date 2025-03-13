
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
      <Card className={`w-full bg-gradient-to-br from-teal-50 to-white border-none shadow-md transition-all ${className}`}>
        <div className="p-4">
          <div className="mb-3 font-medium text-teal-700 flex items-center">
            <div className="bg-teal-100 p-1.5 rounded-full mr-2 shadow-sm">
              <div className="w-1.5 h-1.5 bg-teal-500 rounded-full"></div>
            </div>
            {title}
          </div>
          <div className="animate-fadeIn pl-7">{children}</div>
        </div>
      </Card>
    );
  }
  
  return (
    <Card className={`w-full bg-gradient-to-br from-teal-50 to-white border-none shadow-md overflow-hidden transition-all duration-300 hover:shadow-lg ${className}`}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="p-4">
          <CollapsibleTrigger className="w-full flex justify-between items-center group">
            <div className="font-medium text-teal-700 flex items-center">
              <div className={`p-1.5 rounded-full mr-2 transition-colors ${isOpen ? 'bg-teal-200' : 'bg-teal-100'}`}>
                <div className={`w-1.5 h-1.5 rounded-full transition-colors ${isOpen ? 'bg-teal-600' : 'bg-teal-500'}`}></div>
              </div>
              {title}
            </div>
            <div className="text-teal-500 bg-teal-100/70 rounded-full p-1.5 transition-all duration-200 group-hover:bg-teal-200">
              {isOpen ? 
                <ChevronUp className="h-4 w-4" /> : 
                <ChevronDown className="h-4 w-4" />
              }
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3 animate-fadeIn pl-7">
            {children}
          </CollapsibleContent>
        </div>
      </Collapsible>
    </Card>
  );
};

export default ExerciseDisplay;
