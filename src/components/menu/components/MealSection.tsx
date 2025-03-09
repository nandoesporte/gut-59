
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Meal } from "../types";

interface MealSectionProps {
  meal: Meal;
}

export const MealSection = ({ meal }: MealSectionProps) => {
  if (!meal.foods || meal.foods.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-gray-500 text-sm">Nenhum alimento disponível para esta refeição.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {meal.description && (
        <div className="mb-4">
          <p className="text-sm text-gray-700 italic">{meal.description}</p>
        </div>
      )}
      
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Alimento</TableHead>
            <TableHead className="w-24 text-right">Porção</TableHead>
            <TableHead className="w-24 text-right">Unidade</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {meal.foods.map((food, index) => (
            <TableRow key={index}>
              <TableCell className="font-medium">
                {food.name}
                {food.details && (
                  <Badge variant="outline" className="ml-2 text-xs">
                    {food.details}
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-right">{food.portion}</TableCell>
              <TableCell className="text-right">{food.unit}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      
      <div className="flex justify-between text-xs text-gray-500 pt-2">
        <div>Proteínas: {meal.macros?.protein}g</div>
        <div>Carboidratos: {meal.macros?.carbs}g</div>
        <div>Gorduras: {meal.macros?.fats}g</div>
        <div>Fibras: {meal.macros?.fiber}g</div>
      </div>
    </div>
  );
};
