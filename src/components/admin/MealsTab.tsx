
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { DatabaseMeal } from "./types";

export const MealsTab = () => {
  const { data: meals, isLoading: mealsLoading } = useQuery({
    queryKey: ['admin-meals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meals')
        .select('*')
        .order('meal_date', { ascending: false });
      
      if (error) throw error;
      return data as DatabaseMeal[];
    },
  });

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Fase</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Alimento</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {mealsLoading ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center">
                Carregando...
              </TableCell>
            </TableRow>
          ) : (
            meals?.map((meal) => (
              <TableRow key={meal.id}>
                <TableCell>
                  {new Date(meal.meal_date).toLocaleDateString('pt-BR')}
                </TableCell>
                <TableCell>Fase {meal.protocol_phase}</TableCell>
                <TableCell>{meal.meal_type}</TableCell>
                <TableCell>{meal.custom_food || '-'}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};
