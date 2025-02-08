
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
import { Symptom } from "./types";

export const SymptomsTab = () => {
  const { data: symptoms, isLoading: symptomsLoading } = useQuery({
    queryKey: ['admin-symptoms'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('symptoms')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Symptom[];
    },
  });

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Desconforto</TableHead>
            <TableHead>Sintomas</TableHead>
            <TableHead>Observações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {symptomsLoading ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center">
                Carregando...
              </TableCell>
            </TableRow>
          ) : (
            symptoms?.map((symptom) => (
              <TableRow key={symptom.id}>
                <TableCell>
                  {new Date(symptom.created_at).toLocaleDateString('pt-BR')}
                </TableCell>
                <TableCell>{symptom.discomfort_level || '-'}</TableCell>
                <TableCell>
                  <ul className="list-disc list-inside">
                    {symptom.has_nausea && <li>Náusea</li>}
                    {symptom.has_abdominal_pain && <li>Dor Abdominal</li>}
                    {symptom.has_gas && <li>Gases</li>}
                    {symptom.has_bloating && <li>Inchaço</li>}
                  </ul>
                </TableCell>
                <TableCell>{symptom.notes || '-'}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};
