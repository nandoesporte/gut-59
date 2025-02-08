
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { ProtocolPhase, PhaseFormValues, DayData, DayFormValues } from "./types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";

const phaseFormSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
  day_start: z.coerce.number().min(1, "Dia inicial é obrigatório"),
  day_end: z.coerce.number().min(1, "Dia final é obrigatório"),
});

const dayFormSchema = z.object({
  phase_id: z.coerce.number().min(1, "Fase é obrigatória"),
  day: z.coerce.number().min(1, "Dia é obrigatório"),
  title: z.string().min(1, "Título é obrigatório"),
  description: z.string().optional(),
  content: z.string().min(1, "Conteúdo é obrigatório"),
});

export const ProtocolTab = () => {
  const [activeTab, setActiveTab] = useState("phases");
  const [editingId, setEditingId] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const { data: phases, isLoading: phasesLoading } = useQuery({
    queryKey: ["protocol-phases"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("protocol_phases")
        .select("*")
        .order("day_start");
      if (error) throw error;
      return data as ProtocolPhase[];
    },
  });

  const { data: days, isLoading: daysLoading } = useQuery({
    queryKey: ["protocol-days"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("protocol_days")
        .select("*")
        .order("day");
      if (error) throw error;
      return data as DayData[];
    },
  });

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

  const phaseForm = useForm<PhaseFormValues>({
    resolver: zodResolver(phaseFormSchema),
    defaultValues: {
      name: "",
      description: "",
      day_start: 1,
      day_end: 1,
    },
  });

  const dayForm = useForm<DayFormValues>({
    resolver: zodResolver(dayFormSchema),
    defaultValues: {
      phase_id: 1,
      day: 1,
      title: "",
      description: "",
      content: "",
    },
  });

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="phases">Fases do Protocolo</TabsTrigger>
        <TabsTrigger value="modulation">Protocolo de Modulação</TabsTrigger>
      </TabsList>

      <TabsContent value="phases" className="space-y-4">
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
              <Form {...phaseForm}>
                <form
                  onSubmit={phaseForm.handleSubmit((data) =>
                    editingId
                      ? updatePhase.mutate({ id: editingId, values: data })
                      : createPhase.mutate(data)
                  )}
                  className="space-y-4"
                >
                  <FormField
                    control={phaseForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome</FormLabel>
                        <FormControl>
                          <input {...field} className="w-full p-2 border rounded" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={phaseForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descrição</FormLabel>
                        <FormControl>
                          <input {...field} className="w-full p-2 border rounded" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={phaseForm.control}
                    name="day_start"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dia Inicial</FormLabel>
                        <FormControl>
                          <input
                            type="number"
                            {...field}
                            className="w-full p-2 border rounded"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={phaseForm.control}
                    name="day_end"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dia Final</FormLabel>
                        <FormControl>
                          <input
                            type="number"
                            {...field}
                            className="w-full p-2 border rounded"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit">
                    {editingId ? "Atualizar" : "Salvar"}
                  </Button>
                </form>
              </Form>
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
              {phasesLoading ? (
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
                          <Form {...phaseForm}>
                            <form
                              onSubmit={phaseForm.handleSubmit((data) =>
                                updatePhase.mutate({ id: phase.id, values: data })
                              )}
                              className="space-y-4"
                            >
                              <FormField
                                control={phaseForm.control}
                                name="name"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Nome</FormLabel>
                                    <FormControl>
                                      <input
                                        {...field}
                                        className="w-full p-2 border rounded"
                                        defaultValue={phase.name}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={phaseForm.control}
                                name="description"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Descrição</FormLabel>
                                    <FormControl>
                                      <input
                                        {...field}
                                        className="w-full p-2 border rounded"
                                        defaultValue={phase.description || ""}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={phaseForm.control}
                                name="day_start"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Dia Inicial</FormLabel>
                                    <FormControl>
                                      <input
                                        type="number"
                                        {...field}
                                        className="w-full p-2 border rounded"
                                        defaultValue={phase.day_start}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={phaseForm.control}
                                name="day_end"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Dia Final</FormLabel>
                                    <FormControl>
                                      <input
                                        type="number"
                                        {...field}
                                        className="w-full p-2 border rounded"
                                        defaultValue={phase.day_end}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <Button type="submit">Atualizar</Button>
                            </form>
                          </Form>
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
      </TabsContent>

      <TabsContent value="modulation" className="space-y-4">
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
              <Form {...dayForm}>
                <form
                  onSubmit={dayForm.handleSubmit((data) =>
                    editingId
                      ? updateDay.mutate({ id: editingId, values: data })
                      : createDay.mutate(data)
                  )}
                  className="space-y-4"
                >
                  <FormField
                    control={dayForm.control}
                    name="phase_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fase</FormLabel>
                        <FormControl>
                          <select
                            className="w-full p-2 border rounded"
                            {...field}
                            onChange={(e) =>
                              field.onChange(parseInt(e.target.value))
                            }
                          >
                            <option value="">Selecione uma fase</option>
                            {phases?.map((phase) => (
                              <option key={phase.id} value={phase.id}>
                                {phase.name}
                              </option>
                            ))}
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={dayForm.control}
                    name="day"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dia</FormLabel>
                        <FormControl>
                          <input
                            type="number"
                            {...field}
                            className="w-full p-2 border rounded"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={dayForm.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Título</FormLabel>
                        <FormControl>
                          <input {...field} className="w-full p-2 border rounded" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={dayForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descrição</FormLabel>
                        <FormControl>
                          <input {...field} className="w-full p-2 border rounded" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={dayForm.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Conteúdo</FormLabel>
                        <FormControl>
                          <Textarea
                            className="min-h-[200px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit">
                    {editingId ? "Atualizar" : "Salvar"}
                  </Button>
                </form>
              </Form>
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
              {daysLoading ? (
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
                          <Form {...dayForm}>
                            <form
                              onSubmit={dayForm.handleSubmit((data) =>
                                updateDay.mutate({ id: day.id, values: data })
                              )}
                              className="space-y-4"
                            >
                              <FormField
                                control={dayForm.control}
                                name="phase_id"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Fase</FormLabel>
                                    <FormControl>
                                      <select
                                        className="w-full p-2 border rounded"
                                        {...field}
                                        onChange={(e) =>
                                          field.onChange(parseInt(e.target.value))
                                        }
                                        defaultValue={day.phase_id}
                                      >
                                        <option value="">Selecione uma fase</option>
                                        {phases?.map((phase) => (
                                          <option key={phase.id} value={phase.id}>
                                            {phase.name}
                                          </option>
                                        ))}
                                      </select>
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={dayForm.control}
                                name="day"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Dia</FormLabel>
                                    <FormControl>
                                      <input
                                        type="number"
                                        {...field}
                                        className="w-full p-2 border rounded"
                                        defaultValue={day.day}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={dayForm.control}
                                name="title"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Título</FormLabel>
                                    <FormControl>
                                      <input
                                        {...field}
                                        className="w-full p-2 border rounded"
                                        defaultValue={day.title}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={dayForm.control}
                                name="description"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Descrição</FormLabel>
                                    <FormControl>
                                      <input
                                        {...field}
                                        className="w-full p-2 border rounded"
                                        defaultValue={day.description || ""}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={dayForm.control}
                                name="content"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Conteúdo</FormLabel>
                                    <FormControl>
                                      <Textarea
                                        className="min-h-[200px]"
                                        {...field}
                                        defaultValue={day.content}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <Button type="submit">Atualizar</Button>
                            </form>
                          </Form>
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
      </TabsContent>
    </Tabs>
  );
};
