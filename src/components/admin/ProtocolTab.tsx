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
import { Input } from "@/components/ui/input";
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
import {
  ProtocolPhase,
  FoodGroup,
  MealType,
  ProtocolFood,
  PhaseFormValues,
  FoodGroupFormValues,
  MealTypeFormValues,
  ProtocolFoodFormValues,
  DayData,
  DayFormValues,
} from "./types";

const phaseFormSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
  day_start: z.coerce.number().min(1, "Dia inicial é obrigatório"),
  day_end: z.coerce.number().min(1, "Dia final é obrigatório"),
});

const foodGroupFormSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  display_name: z.string().min(1, "Nome de exibição é obrigatório"),
});

const mealTypeFormSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  display_name: z.string().min(1, "Nome de exibição é obrigatório"),
  phase: z.coerce.number().nullable(),
});

const protocolFoodFormSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  phase_id: z.coerce.number().nullable(),
  food_group_id: z.coerce.number().nullable(),
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

  const { data: foodGroups, isLoading: foodGroupsLoading } = useQuery({
    queryKey: ["food-groups"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("food_groups")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as FoodGroup[];
    },
  });

  const { data: mealTypes, isLoading: mealTypesLoading } = useQuery({
    queryKey: ["meal-types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meal_types")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as MealType[];
    },
  });

  const { data: protocolFoods, isLoading: protocolFoodsLoading } = useQuery({
    queryKey: ["protocol-foods"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("protocol_foods")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as ProtocolFood[];
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

  const createFoodGroup = useMutation({
    mutationFn: async (values: FoodGroupFormValues) => {
      const { error } = await supabase.from("food_groups").insert(values);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["food-groups"] });
      toast.success("Grupo alimentar criado com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao criar grupo alimentar");
    },
  });

  const createMealType = useMutation({
    mutationFn: async (values: MealTypeFormValues) => {
      const { error } = await supabase.from("meal_types").insert(values);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meal-types"] });
      toast.success("Tipo de refeição criado com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao criar tipo de refeição");
    },
  });

  const createProtocolFood = useMutation({
    mutationFn: async (values: ProtocolFoodFormValues) => {
      const { error } = await supabase.from("protocol_foods").insert(values);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["protocol-foods"] });
      toast.success("Alimento criado com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao criar alimento");
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

  const deleteFoodGroup = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from("food_groups")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["food-groups"] });
      toast.success("Grupo alimentar excluído com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao excluir grupo alimentar");
    },
  });

  const deleteMealType = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from("meal_types").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meal-types"] });
      toast.success("Tipo de refeição excluído com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao excluir tipo de refeição");
    },
  });

  const deleteProtocolFood = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("protocol_foods")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["protocol-foods"] });
      toast.success("Alimento excluído com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao excluir alimento");
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

  const updateFoodGroup = useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id: number;
      values: FoodGroupFormValues;
    }) => {
      const { error } = await supabase
        .from("food_groups")
        .update(values)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["food-groups"] });
      toast.success("Grupo alimentar atualizado com sucesso!");
      setEditingId(null);
    },
    onError: () => {
      toast.error("Erro ao atualizar grupo alimentar");
    },
  });

  const updateMealType = useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id: number;
      values: MealTypeFormValues;
    }) => {
      const { error } = await supabase
        .from("meal_types")
        .update(values)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meal-types"] });
      toast.success("Tipo de refeição atualizado com sucesso!");
      setEditingId(null);
    },
    onError: () => {
      toast.error("Erro ao atualizar tipo de refeição");
    },
  });

  const updateProtocolFood = useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id: string;
      values: ProtocolFoodFormValues;
    }) => {
      const { error } = await supabase
        .from("protocol_foods")
        .update(values)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["protocol-foods"] });
      toast.success("Alimento atualizado com sucesso!");
      setEditingId(null);
    },
    onError: () => {
      toast.error("Erro ao atualizar alimento");
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

  const foodGroupForm = useForm<FoodGroupFormValues>({
    resolver: zodResolver(foodGroupFormSchema),
    defaultValues: {
      name: "",
      display_name: "",
    },
  });

  const mealTypeForm = useForm<MealTypeFormValues>({
    resolver: zodResolver(mealTypeFormSchema),
    defaultValues: {
      name: "",
      display_name: "",
      phase: null,
    },
  });

  const protocolFoodForm = useForm<ProtocolFoodFormValues>({
    resolver: zodResolver(protocolFoodFormSchema),
    defaultValues: {
      name: "",
      phase_id: null,
      food_group_id: null,
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
      <TabsList className="grid w-full grid-cols-5">
        <TabsTrigger value="phases">Fases</TabsTrigger>
        <TabsTrigger value="food-groups">Grupos Alimentares</TabsTrigger>
        <TabsTrigger value="meal-types">Tipos de Refeição</TabsTrigger>
        <TabsTrigger value="foods">Alimentos</TabsTrigger>
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
                          <Input {...field} />
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
                          <Input {...field} />
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
                          <Input type="number" {...field} />
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
                          <Input type="number" {...field} />
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
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingId(phase.id);
                          phaseForm.reset({
                            name: phase.name,
                            description: phase.description || "",
                            day_start: phase.day_start,
                            day_end: phase.day_end,
                          });
                        }}
                      >
                        Editar
                      </Button>
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

      <TabsContent value="food-groups" className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Grupos Alimentares</h3>
          <Dialog>
            <DialogTrigger asChild>
              <Button>Adicionar Grupo</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Grupo Alimentar</DialogTitle>
              </DialogHeader>
              <Form {...foodGroupForm}>
                <form
                  onSubmit={foodGroupForm.handleSubmit((data) =>
                    editingId
                      ? updateFoodGroup.mutate({ id: editingId, values: data })
                      : createFoodGroup.mutate(data)
                  )}
                  className="space-y-4"
                >
                  <FormField
                    control={foodGroupForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={foodGroupForm.control}
                    name="display_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome de Exibição</FormLabel>
                        <FormControl>
                          <Input {...field} />
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
                <TableHead>Nome de Exibição</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {foodGroupsLoading ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : (
                foodGroups?.map((group) => (
                  <TableRow key={group.id}>
                    <TableCell>{group.name}</TableCell>
                    <TableCell>{group.display_name}</TableCell>
                    <TableCell className="space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingId(group.id);
                          foodGroupForm.reset({
                            name: group.name,
                            display_name: group.display_name,
                          });
                        }}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteFoodGroup.mutate(group.id)}
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

      <TabsContent value="meal-types" className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Tipos de Refeição</h3>
          <Dialog>
            <DialogTrigger asChild>
              <Button>Adicionar Tipo</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Tipo de Refeição</DialogTitle>
              </DialogHeader>
              <Form {...mealTypeForm}>
                <form
                  onSubmit={mealTypeForm.handleSubmit((data) =>
                    editingId
                      ? updateMealType.mutate({ id: editingId, values: data })
                      : createMealType.mutate(data)
                  )}
                  className="space-y-4"
                >
                  <FormField
                    control={mealTypeForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={mealTypeForm.control}
                    name="display_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome de Exibição</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={mealTypeForm.control}
                    name="phase"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fase</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)} />
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
                <TableHead>Nome de Exibição</TableHead>
                <TableHead>Fase</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mealTypesLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : (
                mealTypes?.map((type) => (
                  <TableRow key={type.id}>
                    <TableCell>{type.name}</TableCell>
                    <TableCell>{type.display_name}</TableCell>
                    <TableCell>{type.phase}</TableCell>
                    <TableCell className="space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingId(type.id);
                          mealTypeForm.reset({
                            name: type.name,
                            display_name: type.display_name,
                            phase: type.phase,
                          });
                        }}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteMealType.mutate(type.id)}
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

      <TabsContent value="foods" className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Alimentos do Protocolo</h3>
          <Dialog>
            <DialogTrigger asChild>
              <Button>Adicionar Alimento</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Alimento</DialogTitle>
              </DialogHeader>
              <Form {...protocolFoodForm}>
                <form
                  onSubmit={protocolFoodForm.handleSubmit((data) =>
                    editingId
                      ? updateProtocolFood.mutate({
                          id: editingId.toString(),
                          values: data,
                        })
                      : createProtocolFood.mutate(data)
                  )}
                  className="space-y-4"
                >
                  <FormField
                    control={protocolFoodForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={protocolFoodForm.control}
                    name="phase_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fase</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={protocolFoodForm.control}
                    name="food_group_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Grupo Alimentar</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)} />
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
                <TableHead>Fase</TableHead>
                <TableHead>Grupo Alimentar</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {protocolFoodsLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : (
                protocolFoods?.map((food) => (
                  <TableRow key={food.id}>
                    <TableCell>{food.name}</TableCell>
                    <TableCell>{food.phase_id}</TableCell>
                    <TableCell>{food.food_group_id}</TableCell>
                    <TableCell className="space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingId(Number(food.id));
                          protocolFoodForm.reset({
                            name: food.name,
                            phase_id: food.phase_id,
                            food_group_id: food.food_group_id,
                          });
                        }}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteProtocolFood.mutate(food.id)}
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

      <TabsContent value="diary">
        Dados do diário
      </TabsContent>

      <TabsContent value="modulation" className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Protocolo de Modulação</h3>
          <Dialog>
            <DialogTrigger asChild>
              <Button>Adicionar Dia</Button>
            </DialogTrigger>
            <DialogContent>
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
                          <Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value))} />
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
                          <Input {...field} />
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
                          <Input {...field} />
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
                          <textarea
                            className="w-full p-2 border rounded"
                            rows={5}
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
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {daysLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
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
                    <TableCell className="space-x-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            Editar
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
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
                                      <Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value))} />
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
                                      <Input {...field} />
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
                                      <Input {...field} />
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
                                      <textarea
                                        className="w-full p-2 border rounded"
                                        rows={5}
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
}
