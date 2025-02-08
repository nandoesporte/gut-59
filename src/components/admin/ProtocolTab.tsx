
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
  ProtocolFoodFormValues
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

export const ProtocolTab = () => {
  const [activeTab, setActiveTab] = useState("phases");
  const queryClient = useQueryClient();

  // Queries
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

  // Mutations
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

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="phases">Fases</TabsTrigger>
        <TabsTrigger value="food-groups">Grupos Alimentares</TabsTrigger>
        <TabsTrigger value="meal-types">Tipos de Refeição</TabsTrigger>
        <TabsTrigger value="foods">Alimentos</TabsTrigger>
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
                <form onSubmit={phaseForm.handleSubmit((data) => createPhase.mutate(data))} className="space-y-4">
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
                  <Button type="submit">Salvar</Button>
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {phasesLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">
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
                <form onSubmit={foodGroupForm.handleSubmit((data) => createFoodGroup.mutate(data))} className="space-y-4">
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
                  <Button type="submit">Salvar</Button>
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {foodGroupsLoading ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-center">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : (
                foodGroups?.map((group) => (
                  <TableRow key={group.id}>
                    <TableCell>{group.name}</TableCell>
                    <TableCell>{group.display_name}</TableCell>
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
                <form onSubmit={mealTypeForm.handleSubmit((data) => createMealType.mutate(data))} className="space-y-4">
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
                  <Button type="submit">Salvar</Button>
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {mealTypesLoading ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : (
                mealTypes?.map((type) => (
                  <TableRow key={type.id}>
                    <TableCell>{type.name}</TableCell>
                    <TableCell>{type.display_name}</TableCell>
                    <TableCell>{type.phase}</TableCell>
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
                <form onSubmit={protocolFoodForm.handleSubmit((data) => createProtocolFood.mutate(data))} className="space-y-4">
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
                  <Button type="submit">Salvar</Button>
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {protocolFoodsLoading ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : (
                protocolFoods?.map((food) => (
                  <TableRow key={food.id}>
                    <TableCell>{food.name}</TableCell>
                    <TableCell>{food.phase_id}</TableCell>
                    <TableCell>{food.food_group_id}</TableCell>
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
