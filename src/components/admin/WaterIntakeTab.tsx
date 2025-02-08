
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
import { WaterIntake } from "./types";

export const WaterIntakeTab = () => {
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

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Quantidade (ml)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {waterIntakeLoading ? (
            <TableRow>
              <TableCell colSpan={2} className="text-center">
                Carregando...
              </TableCell>
            </TableRow>
          ) : (
            waterIntake?.map((intake) => (
              <TableRow key={intake.id}>
                <TableCell>
                  {new Date(intake.created_at).toLocaleDateString('pt-BR')}
                </TableCell>
                <TableCell>{intake.amount_ml}ml</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};
