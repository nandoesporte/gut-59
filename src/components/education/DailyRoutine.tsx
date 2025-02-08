
import React from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp } from "lucide-react";
import MealsList from './MealsList';
import SupplementsList from './SupplementsList';
import { DayRoutine } from '@/types/education';

interface DailyRoutineProps {
  day: DayRoutine;
  dayIndex: number;
  isOpen: boolean;
  onToggle: () => void;
}

const DailyRoutine = ({ day, dayIndex, isOpen, onToggle }: DailyRoutineProps) => {
  return (
    <Collapsible
      open={isOpen}
      onOpenChange={onToggle}
      className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden"
    >
      <CollapsibleTrigger className="w-full">
        <div className="bg-gradient-to-r from-primary-100 to-primary-50 px-4 py-3 flex justify-between items-center">
          <h4 className="font-semibold text-primary-700 text-lg">
            Dia {dayIndex + 1}
          </h4>
          {isOpen ? (
            <ChevronUp className="h-5 w-5 text-primary-500" />
          ) : (
            <ChevronDown className="h-5 w-5 text-primary-500" />
          )}
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="p-6 space-y-6">
          <MealsList meals={day.meals} />
          <SupplementsList supplements={day.supplements} />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default DailyRoutine;
