
import React from "react";
import { CardHeader } from "@/components/ui/card";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Target, CalendarRange } from "lucide-react";

interface WorkoutPlanHeaderProps {
  goal: string;
  startDate: string;
  endDate: string;
}

export const WorkoutPlanHeader = ({ goal, startDate, endDate }: WorkoutPlanHeaderProps) => {
  const formatDateDisplay = (dateString: string) => {
    try {
      return format(parseISO(dateString), "dd 'de' MMMM", { locale: ptBR });
    } catch (e) {
      return "Data indisponível";
    }
  };

  return (
    <CardHeader className="p-4 pb-3">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 p-1.5 rounded-full">
            <Target className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-lg font-semibold">Plano de {goal}</h2>
        </div>
        <div className="flex items-center text-sm text-muted-foreground">
          <CalendarRange className="h-4 w-4 mr-1.5" />
          <span>{formatDateDisplay(startDate)} - {formatDateDisplay(endDate)}</span>
        </div>
      </div>
    </CardHeader>
  );
};
