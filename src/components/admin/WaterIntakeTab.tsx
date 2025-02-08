
import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { WaterIntake } from "./types";
import { ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";

export const WaterIntakeTab = () => {
  const [expandedDays, setExpandedDays] = useState<string[]>([]);

  const { data: waterIntake, isLoading: waterIntakeLoading } = useQuery({
    queryKey: ['admin-water-intake'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('water_intake')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as WaterIntake[];
    },
  });

  const groupedByDay = waterIntake?.reduce((acc, intake) => {
    const day = format(new Date(intake.created_at), 'yyyy-MM-dd');
    if (!acc[day]) {
      acc[day] = [];
    }
    acc[day].push(intake);
    return acc;
  }, {} as Record<string, WaterIntake[]>);

  const toggleDay = (day: string) => {
    setExpandedDays(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  return (
    <div className="space-y-4">
      {waterIntakeLoading ? (
        <div className="text-center">Carregando...</div>
      ) : (
        Object.entries(groupedByDay || {}).map(([day, intakes]) => {
          const total = intakes.reduce((sum, intake) => sum + (intake.amount_ml || 0), 0);
          const isExpanded = expandedDays.includes(day);

          return (
            <div key={day} className="border rounded-lg overflow-hidden">
              <div
                className="bg-gray-50 p-4 flex justify-between items-center cursor-pointer"
                onClick={() => toggleDay(day)}
              >
                <div className="font-medium">
                  {format(new Date(day), 'dd/MM/yyyy')} - Total: {total}ml
                </div>
                <Button variant="ghost" size="sm">
                  {isExpanded ? <ChevronUp /> : <ChevronDown />}
                </Button>
              </div>

              {isExpanded && (
                <div className="p-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Horário</TableHead>
                        <TableHead>Quantidade (ml)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {intakes.map((intake) => (
                        <TableRow key={intake.id}>
                          <TableCell>
                            {format(new Date(intake.created_at), 'HH:mm')}
                          </TableCell>
                          <TableCell>{intake.amount_ml}ml</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};
