
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { MealPlan } from "../types";

interface MealPlanTableProps {
  mealPlan: MealPlan;
}

const dayNameMap: Record<string, string> = {
  monday: "Segunda-feira",
  tuesday: "Terça-feira",
  wednesday: "Quarta-feira",
  thursday: "Quinta-feira",
  friday: "Sexta-feira",
  saturday: "Sábado",
  sunday: "Domingo"
};

const mealNameMap: Record<string, string> = {
  breakfast: "Café da manhã",
  morningSnack: "Lanche da manhã",
  lunch: "Almoço",
  afternoonSnack: "Lanche da tarde",
  dinner: "Jantar"
};

export const MealPlanTable = ({ mealPlan }: MealPlanTableProps) => {
  if (!mealPlan || !mealPlan.weeklyPlan) {
    return <div className="text-center p-4">Nenhum plano alimentar disponível</div>;
  }

  const tableRows: Array<{
    day: string;
    meal: string;
    description: string;
    foods: string;
    quantities: string;
    details: string;
  }> = [];

  // Convert the meal plan data to the table format
  Object.entries(mealPlan.weeklyPlan).forEach(([dayKey, dayPlan]) => {
    const dayName = dayNameMap[dayKey] || dayKey;
    
    Object.entries(dayPlan.meals).forEach(([mealKey, meal]) => {
      if (!meal) return;
      
      const mealName = mealNameMap[mealKey] || mealKey;
      
      // Join food names for the "Ingredientes" column
      const foodNames = meal.foods.map(food => food.name).join(", ");
      
      // Create quantities string
      const quantities = meal.foods.map(food => 
        `${food.portion}${food.unit}`
      ).join(", ");
      
      tableRows.push({
        day: dayName,
        meal: mealName,
        description: meal.description,
        foods: foodNames,
        quantities: quantities,
        details: meal.foods.map(food => food.details).join(". ")
      });
    });
  });

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Dia</TableHead>
            <TableHead>Refeição</TableHead>
            <TableHead>Prato</TableHead>
            <TableHead>Ingredientes</TableHead>
            <TableHead>Quantidade (g/ml/unidade)</TableHead>
            <TableHead>Preparo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tableRows.map((row, idx) => (
            <TableRow key={idx}>
              <TableCell className="font-medium">{row.day}</TableCell>
              <TableCell>{row.meal}</TableCell>
              <TableCell>{row.description}</TableCell>
              <TableCell>{row.foods}</TableCell>
              <TableCell>{row.quantities}</TableCell>
              <TableCell>{row.details}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
