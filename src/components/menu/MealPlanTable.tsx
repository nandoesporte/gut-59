
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMemo } from "react";
import type { MealPlan } from "./types";

interface MealPlanTableProps {
  mealPlan: MealPlan;
}

export const MealPlanTable = ({ mealPlan }: MealPlanTableProps) => {
  const tableData = useMemo(() => {
    if (!mealPlan || !mealPlan.weeklyPlan) return [];
    
    const rows: any[] = [];
    
    // Mapeamento de dias em inglês para português
    const dayTranslation = {
      monday: "Segunda-feira",
      tuesday: "Terça-feira",
      wednesday: "Quarta-feira",
      thursday: "Quinta-feira",
      friday: "Sexta-feira",
      saturday: "Sábado",
      sunday: "Domingo"
    };
    
    // Mapeamento de refeições em inglês para português
    const mealTranslation = {
      breakfast: "Café da manhã",
      morningSnack: "Lanche da manhã",
      lunch: "Almoço",
      afternoonSnack: "Lanche da tarde",
      dinner: "Jantar"
    };
    
    // Para cada dia da semana
    Object.entries(mealPlan.weeklyPlan).forEach(([day, dayPlan]) => {
      const dayName = dayTranslation[day as keyof typeof dayTranslation];
      
      // Para cada refeição do dia
      Object.entries(dayPlan.meals).forEach(([mealType, meal]) => {
        const mealName = mealTranslation[mealType as keyof typeof mealTranslation];
        
        // Para cada alimento na refeição
        meal.foods.forEach((food) => {
          rows.push({
            day: dayName,
            mealType: mealName,
            name: food.name,
            details: food.details || "",
            portion: `${food.portion} ${food.unit}`,
          });
        });
      });
    });
    
    return rows;
  }, [mealPlan]);

  if (!mealPlan || !mealPlan.weeklyPlan || tableData.length === 0) {
    return (
      <div className="text-center p-6">
        <p className="text-gray-500">Nenhum plano alimentar disponível</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableCaption>Plano Alimentar Semanal - Gerado pelo Nutri+ (Llama 3)</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Dia</TableHead>
            <TableHead>Refeição</TableHead>
            <TableHead>Alimento</TableHead>
            <TableHead>Detalhes de Preparo</TableHead>
            <TableHead>Quantidade</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tableData.map((row, index) => (
            <TableRow key={index}>
              <TableCell className="font-medium">{row.day}</TableCell>
              <TableCell>{row.mealType}</TableCell>
              <TableCell>{row.name}</TableCell>
              <TableCell>{row.details}</TableCell>
              <TableCell>{row.portion}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
