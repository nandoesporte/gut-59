
import React from 'react';
import { 
  Collapsible, 
  CollapsibleContent,
  CollapsibleTrigger 
} from "@/components/ui/collapsible";
import { Card } from "@/components/ui/card";

interface ExerciseDisplayProps {
  title: React.ReactNode;
  children: React.ReactNode;
  alwaysShow?: boolean;
}

const ExerciseDisplay = ({ title, children, alwaysShow = false }: ExerciseDisplayProps) => {
  if (alwaysShow) {
    return (
      <Card className="w-full bg-gradient-to-br from-primary-50 to-white border-none shadow-lg">
        <div className="p-4">
          <div className="mb-2">{title}</div>
          <div>{children}</div>
        </div>
      </Card>
    );
  }
  
  return (
    <Collapsible>
      <Card className="w-full bg-gradient-to-br from-primary-50 to-white border-none shadow-lg">
        <div className="p-4">
          <CollapsibleTrigger className="w-full text-left">
            {title}
          </CollapsibleTrigger>
          <CollapsibleContent>
            {children}
          </CollapsibleContent>
        </div>
      </Card>
    </Collapsible>
  );
};

export default ExerciseDisplay;
