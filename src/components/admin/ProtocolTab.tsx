
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
import { ProtocolPhase, FoodGroup, MealType, ProtocolFood } from "./types";

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
    mutationFn: async (values: z.infer<typeof phaseFormSchema>) => {
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
    mutationFn: async (values: z.infer<typeof foodGroupFormSchema>) => {
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
    mutationFn: async (values: z.infer<typeof mealTypeFormSchema>) => {
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
    mutationFn: async (values: z.infer<typeof protocolFoodFormSchema>) => {
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
              <Form {...useForm<z.infer<typeof phaseFormSchema>>({
                resolver: zodResolver(phaseFormSchema),
              })} onSubmit={(values) => createPhase.mutate(values)}>
                <div className="space-y-4">
                  <FormField
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
                </div>
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
              <Form {...useForm<z.infer<typeof foodGroupFormSchema>>({
                resolver: zodResolver(foodGroupFormSchema),
              })} onSubmit={(values) => createFoodGroup.mutate(values)}>
                <div className="space-y-4">
                  <FormField
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
                </div>
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
              <Form {...useForm<z.infer<typeof mealTypeFormSchema>>({
                resolver: zodResolver(mealTypeFormSchema),
              })} onSubmit={(values) => createMealType.mutate(values)}>
                <div className="space-y-4">
                  <FormField
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
                    name="phase"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fase</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit">Salvar</Button>
                </div>
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
              <Form {...useForm<z.infer<typeof protocolFoodFormSchema>>({
                resolver: zodResolver(protocolFoodFormSchema),
              })} onSubmit={(values) => createProtocolFood.mutate(values)}>
                <div className="space-y-4">
                  <FormField
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
                    name="phase_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fase</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    name="food_group_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Grupo Alimentar</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit">Salvar</Button>
                </div>
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
