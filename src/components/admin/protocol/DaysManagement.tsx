
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DayForm } from "./DayForm";
import { DayData, DayFormValues, ProtocolPhase } from "../types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DaysManagementProps {
  days?: DayData[];
  phases?: ProtocolPhase[];
  isLoading: boolean;
}

export const DaysManagement = ({ days, phases, isLoading }: DaysManagementProps) => {
  const [editingId, setEditingId] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const createDay = useMutation({
    mutationFn: async (values: DayFormValues) => {
      const { error } = await supabase.from("protocol_days").insert(values);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["protocol-days"] });
      toast.success("Dia criado com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao criar dia");
    },
  });

  const updateDay = useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id: number;
      values: DayFormValues;
    }) => {
      const { error } = await supabase
        .from("protocol_days")
        .update(values)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["protocol-days"] });
      toast.success("Dia atualizado com sucesso!");
      setEditingId(null);
    },
    onError: () => {
      toast.error("Erro ao atualizar dia");
    },
  });

  const deleteDay = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from("protocol_days")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["protocol-days"] });
      toast.success("Dia excluído com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao excluir dia");
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Protocolo de Modulação</h3>
        <Dialog>
          <DialogTrigger asChild>
            <Button>Adicionar Dia</Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Novo Dia do Protocolo</DialogTitle>
            </DialogHeader>
            <DayForm
              onSubmit={(data) => createDay.mutate(data)}
              submitLabel="Salvar"
              phases={phases}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fase</TableHead>
              <TableHead>Dia</TableHead>
              <TableHead>Título</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Conteúdo</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : (
              days?.map((day) => (
                <TableRow key={day.id}>
                  <TableCell>
                    {phases?.find((phase) => phase.id === day.phase_id)?.name}
                  </TableCell>
                  <TableCell>{day.day}</TableCell>
                  <TableCell>{day.title}</TableCell>
                  <TableCell>{day.description}</TableCell>
                  <TableCell>
                    <ScrollArea className="h-[100px] w-[300px]">
                      <div className="p-4">{day.content}</div>
                    </ScrollArea>
                  </TableCell>
                  <TableCell className="space-x-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          Editar
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-3xl">
                        <DialogHeader>
                          <DialogTitle>Editar Dia do Protocolo</DialogTitle>
                        </DialogHeader>
                        <DayForm
                          onSubmit={(data) =>
                            updateDay.mutate({ id: day.id, values: data })
                          }
                          defaultValues={day}
                          submitLabel="Atualizar"
                          phases={phases}
                        />
                      </DialogContent>
                    </Dialog>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteDay.mutate(day.id)}
                    >
                      Excluir
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

