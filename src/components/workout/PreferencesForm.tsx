
import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { WorkoutPreferences, ExerciseType, ActivityLevel, WorkoutGoal, HealthCondition } from "./types";

const formSchema = z.object({
  weight: z.number().min(30).max(300),
  height: z.number().min(100).max(250),
  age: z.number().min(16).max(100),
  gender: z.enum(["male", "female"]),
  activityLevel: z.enum(["sedentary", "light", "moderate", "intense"]),
  goal: z.enum(["lose_weight", "maintain", "gain_mass"]),
  healthConditions: z.array(z.enum(["hypertension", "diabetes", "depression", "anxiety"])).optional(),
  preferredExerciseTypes: z.array(z.enum(["strength", "cardio", "mobility"])),
  availableEquipment: z.array(z.string()),
});

const equipmentCategories = {
  casa: [
    "Halteres",
    "Elásticos",
    "Tapete de Yoga",
    "Corda de Pular",
    "Barra Fixa de Porta",
    "Banco Improvisado",
    "Cadeira Resistente",
    "Garrafa de Água (peso)",
  ],
  academia: [
    "Esteira",
    "Bicicleta Ergométrica",
    "Aparelhos de Musculação",
    "Pesos Livres",
    "Anilhas e Barras",
    "Banco Regulável",
    "TRX/Suspensão",
    "Máquina Smith",
  ],
  parque: [
    "Academia ao Ar Livre",
    "Barras Paralelas",
    "Bancos do Parque",
    "Escadas",
    "Pista de Corrida",
  ],
  nenhum: ["Sem Equipamentos"]
};

interface SelectCardProps {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}

const SelectCard = ({ selected, onClick, children, className = "" }: SelectCardProps) => (
  <div
    onClick={onClick}
    className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
      selected
        ? "border-primary-500 bg-primary-50"
        : "border-gray-200 hover:border-primary-200"
    } ${className}`}
  >
    {children}
  </div>
);

interface PreferencesFormProps {
  onSubmit: (data: WorkoutPreferences) => void;
}

export const PreferencesForm = ({ onSubmit }: PreferencesFormProps) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      healthConditions: [],
      preferredExerciseTypes: [],
      availableEquipment: [],
    },
  });

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    onSubmit(values as WorkoutPreferences);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="weight"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Peso (kg)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="70"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="height"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Altura (cm)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="170"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="age"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Idade</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="30"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="gender"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sexo</FormLabel>
                <div className="grid grid-cols-2 gap-4">
                  <SelectCard
                    selected={field.value === "male"}
                    onClick={() => field.onChange("male")}
                  >
                    <div className="text-center">
                      <span className="text-lg">Masculino</span>
                    </div>
                  </SelectCard>
                  <SelectCard
                    selected={field.value === "female"}
                    onClick={() => field.onChange("female")}
                  >
                    <div className="text-center">
                      <span className="text-lg">Feminino</span>
                    </div>
                  </SelectCard>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="activityLevel"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nível de Atividade Física</FormLabel>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <SelectCard
                  selected={field.value === "sedentary"}
                  onClick={() => field.onChange("sedentary")}
                >
                  <div className="text-center">
                    <span className="text-lg">Sedentário</span>
                    <p className="text-sm text-gray-500">Pouco ou nenhum exercício</p>
                  </div>
                </SelectCard>
                <SelectCard
                  selected={field.value === "light"}
                  onClick={() => field.onChange("light")}
                >
                  <div className="text-center">
                    <span className="text-lg">Leve</span>
                    <p className="text-sm text-gray-500">1-3 dias por semana</p>
                  </div>
                </SelectCard>
                <SelectCard
                  selected={field.value === "moderate"}
                  onClick={() => field.onChange("moderate")}
                >
                  <div className="text-center">
                    <span className="text-lg">Moderado</span>
                    <p className="text-sm text-gray-500">3-5 dias por semana</p>
                  </div>
                </SelectCard>
                <SelectCard
                  selected={field.value === "intense"}
                  onClick={() => field.onChange("intense")}
                >
                  <div className="text-center">
                    <span className="text-lg">Intenso</span>
                    <p className="text-sm text-gray-500">6-7 dias por semana</p>
                  </div>
                </SelectCard>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="goal"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Objetivo</FormLabel>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <SelectCard
                  selected={field.value === "lose_weight"}
                  onClick={() => field.onChange("lose_weight")}
                >
                  <div className="text-center">
                    <span className="text-lg">Perder Peso</span>
                    <p className="text-sm text-gray-500">Foco em queima de gordura</p>
                  </div>
                </SelectCard>
                <SelectCard
                  selected={field.value === "maintain"}
                  onClick={() => field.onChange("maintain")}
                >
                  <div className="text-center">
                    <span className="text-lg">Manter Peso</span>
                    <p className="text-sm text-gray-500">Melhorar condicionamento</p>
                  </div>
                </SelectCard>
                <SelectCard
                  selected={field.value === "gain_mass"}
                  onClick={() => field.onChange("gain_mass")}
                >
                  <div className="text-center">
                    <span className="text-lg">Ganhar Massa</span>
                    <p className="text-sm text-gray-500">Foco em hipertrofia</p>
                  </div>
                </SelectCard>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="preferredExerciseTypes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipos de Exercícios Preferidos</FormLabel>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(['strength', 'cardio', 'mobility'] as ExerciseType[]).map((type) => (
                  <SelectCard
                    key={type}
                    selected={field.value?.includes(type)}
                    onClick={() => {
                      if (field.value?.includes(type)) {
                        field.onChange(field.value?.filter((t) => t !== type));
                      } else {
                        field.onChange([...field.value || [], type]);
                      }
                    }}
                  >
                    <div className="text-center">
                      <span className="text-lg">
                        {type === 'strength' ? 'Força' : 
                         type === 'cardio' ? 'Cardio' : 
                         'Mobilidade'}
                      </span>
                    </div>
                  </SelectCard>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="healthConditions"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Condições de Saúde</FormLabel>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(['hypertension', 'diabetes', 'depression', 'anxiety'] as HealthCondition[]).map((condition) => 
                  condition && (
                    <SelectCard
                      key={condition}
                      selected={field.value?.includes(condition)}
                      onClick={() => {
                        if (field.value?.includes(condition)) {
                          field.onChange(field.value?.filter((c) => c !== condition));
                        } else {
                          field.onChange([...field.value || [], condition]);
                        }
                      }}
                    >
                      <div className="text-center">
                        <span className="text-lg">
                          {condition === 'hypertension' ? 'Hipertensão' : 
                           condition === 'diabetes' ? 'Diabetes' : 
                           condition === 'depression' ? 'Depressão' : 
                           'Ansiedade'}
                        </span>
                      </div>
                    </SelectCard>
                  )
                )}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="availableEquipment"
          render={({ field }) => (
            <FormItem className="space-y-4">
              <FormLabel>Equipamentos Disponíveis</FormLabel>
              {Object.entries(equipmentCategories).map(([category, items]) => (
                <div key={category} className="space-y-2">
                  <h3 className="text-lg font-medium capitalize">{category}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {items.map((equipment) => (
                      <SelectCard
                        key={equipment}
                        selected={field.value?.includes(equipment)}
                        onClick={() => {
                          if (field.value?.includes(equipment)) {
                            field.onChange(field.value?.filter((e) => e !== equipment));
                          } else {
                            field.onChange([...field.value || [], equipment]);
                          }
                        }}
                        className="h-full"
                      >
                        <div className="text-center">
                          <span>{equipment}</span>
                        </div>
                      </SelectCard>
                    ))}
                  </div>
                </div>
              ))}
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full">Gerar Plano de Treino</Button>
      </form>
    </Form>
  );
};
