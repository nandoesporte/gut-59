
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
import { PhaseForm } from "./PhaseForm";
import { ProtocolPhase, PhaseFormValues } from "../types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PhasesManagementProps {
  phases?: ProtocolPhase[];
  isLoading: boolean;
}

export const PhasesManagement = ({ phases, isLoading }: PhasesManagementProps) => {
  const [editingId, setEditingId] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const createPhase = useMutation({
    mutationFn: async (values: PhaseFormValues) => {
      const { error } = await supabase.from("protocol_phases").insert(values);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["protocol-phases"] });
      toast.success("Fase criada com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao criar fase");
    },
  });

  const updatePhase = useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id: number;
      values: PhaseFormValues;
    }) => {
      const { error } = await supabase
        .from("protocol_phases")
        .update(values)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["protocol-phases"] });
      toast.success("Fase atualizada com sucesso!");
      setEditingId(null);
    },
    onError: () => {
      toast.error("Erro ao atualizar fase");
    },
  });

  const deletePhase = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from("protocol_phases")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["protocol-phases"] });
      toast.success("Fase excluída com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao excluir fase");
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Fases do Protocolo</h3>
        <Dialog>
          <DialogTrigger asChild>
            <Button>Adicionar Fase</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Fase</DialogTitle>
            </DialogHeader>
            <PhaseForm
              onSubmit={(data) => createPhase.mutate(data)}
              submitLabel="Salvar"
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Dia Inicial</TableHead>
              <TableHead>Dia Final</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : (
              phases?.map((phase) => (
                <TableRow key={phase.id}>
                  <TableCell>{phase.name}</TableCell>
                  <TableCell>{phase.description}</TableCell>
                  <TableCell>{phase.day_start}</TableCell>
                  <TableCell>{phase.day_end}</TableCell>
                  <TableCell className="space-x-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          Editar
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Editar Fase</DialogTitle>
                        </DialogHeader>
                        <PhaseForm
                          onSubmit={(data) =>
                            updatePhase.mutate({ id: phase.id, values: data })
                          }
                          defaultValues={phase}
                          submitLabel="Atualizar"
                        />
                      </DialogContent>
                    </Dialog>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deletePhase.mutate(phase.id)}
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

