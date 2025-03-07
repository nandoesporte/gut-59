
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
    return (
      <div className="text-center p-4">
        <p className="text-yellow-600 mb-2">Formato do plano alimentar incompatível</p>
        <p className="text-sm text-gray-500">Não foi possível exibir os detalhes neste formato.</p>
      </div>
    );
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
  try {
    Object.entries(mealPlan.weeklyPlan).forEach(([dayKey, dayPlan]) => {
      if (!dayPlan || !dayPlan.meals) return;
      
      const dayName = dayNameMap[dayKey] || dayKey;
      
      Object.entries(dayPlan.meals).forEach(([mealKey, meal]) => {
        if (!meal || !meal.foods) return;
        
        const mealName = mealNameMap[mealKey] || mealKey;
        
        // Join food names for the "Ingredientes" column
        const foodNames = meal.foods.map(food => food?.name || "").filter(Boolean).join(", ");
        
        // Create quantities string
        const quantities = meal.foods
          .map(food => food && food.portion && food.unit ? `${food.portion}${food.unit}` : "")
          .filter(Boolean)
          .join(", ");
        
        tableRows.push({
          day: dayName,
          meal: mealName,
          description: meal.description || "Sem descrição",
          foods: foodNames || "Sem ingredientes",
          quantities: quantities || "Não especificado",
          details: meal.foods
            .map(food => food?.details || "")
            .filter(Boolean)
            .join(". ") || "Sem instruções específicas"
        });
      });
    });
  } catch (error) {
    console.error("Error processing meal plan data for table:", error);
    return (
      <div className="text-center p-4 text-red-500">
        Erro ao processar dados do plano alimentar. Por favor, atualize a página.
      </div>
    );
  }

  console.log("Generated table rows for meal plan:", tableRows.length);

  if (tableRows.length === 0) {
    return (
      <div className="text-center p-4 text-yellow-600">
        Este plano alimentar não contém dados de refeições.
      </div>
    );
  }

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
            <TableHead>Modo de Preparo</TableHead>
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
              <TableCell className="whitespace-pre-wrap">{row.details}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
