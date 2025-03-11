
import React from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp } from "lucide-react";
import MealsList from './MealsList';
import SupplementsList from './SupplementsList';
import { DayRoutine } from '@/types/education';
import { useIsMobile } from '@/hooks/use-mobile';

interface DailyRoutineProps {
  day: DayRoutine;
  dayIndex: number;
  isOpen: boolean;
  onToggle: () => void;
}

const DailyRoutine = ({ day, dayIndex, isOpen, onToggle }: DailyRoutineProps) => {
  const isMobile = useIsMobile();
  
  return (
    <Collapsible
      open={isOpen}
      onOpenChange={onToggle}
      className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden"
    >
      <CollapsibleTrigger className="w-full">
        <div className="bg-gradient-to-r from-primary-100 to-primary-50 px-3 sm:px-4 py-2 sm:py-3 flex justify-between items-center">
          <h4 className="font-semibold text-primary-700 text-sm sm:text-lg">
            Dia {dayIndex + 1}
          </h4>
          {isOpen ? (
            <ChevronUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary-500" />
          ) : (
            <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5 text-primary-500" />
          )}
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="p-2 sm:p-6 space-y-3 sm:space-y-6">
          <MealsList meals={day.meals} />
          <SupplementsList supplements={day.supplements} />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default DailyRoutine;
