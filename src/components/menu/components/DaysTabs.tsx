
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface DaysTabsProps {
  days: Record<string, string>;
  selectedDay: string;
  setSelectedDay: (day: string) => void;
  weeklyPlan: Record<string, any>;
}

export const DaysTabs = ({ days, selectedDay, setSelectedDay, weeklyPlan }: DaysTabsProps) => {
  return (
    <TabsList className="flex flex-nowrap overflow-x-auto mb-6 pb-2 justify-start">
      {Object.entries(days).map(([key, label]) => (
        <TabsTrigger
          key={key}
          value={key}
          className="whitespace-nowrap"
          disabled={!weeklyPlan[key as keyof typeof weeklyPlan]}
        >
          {label}
        </TabsTrigger>
      ))}
    </TabsList>
  );
};
