
import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { SelectCard } from "@/components/workout/components/SelectCard";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { FisioPreferences, JointArea, Condition } from "./types";
import { Stethoscope, ArrowRight } from "lucide-react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";

const formSchema = z.object({
  age: z.number().min(16, "Idade mínima é 16 anos").max(100, "Idade máxima é 100 anos"),
  weight: z.number().min(30, "Peso mínimo é 30kg").max(200, "Peso máximo é 200kg"),
  height: z.number().min(100, "Altura mínima é 100cm").max(250, "Altura máxima é 250cm"),
  gender: z.enum(["male", "female"]),
  joint_area: z.enum([
    "ankle_foot", "leg", "knee", "hip", "spine", "shoulder", "elbow_hand"
  ] as const),
  condition: z.enum([
    "plantar_fasciitis", "calcaneal_spur", "ankle_sprain",
    "anterior_compartment", "shin_splints", "achilles_tendinitis",
    "patellofemoral", "patellar_tendinitis", "acl_postop",
    "mcl_injury", "meniscus_injury", "knee_arthrosis",
    "trochanteric_bursitis", "piriformis_syndrome", "sports_hernia",
    "it_band_syndrome", "disc_protrusion", "herniated_disc",
    "cervical_lordosis", "frozen_shoulder", "shoulder_bursitis",
    "rotator_cuff", "impingement", "medial_epicondylitis",
    "lateral_epicondylitis", "carpal_tunnel"
  ] as const),
  pain_level: z.number().min(0).max(10),
  mobility_level: z.enum(["limited", "moderate", "good"]),
  previous_treatment: z.boolean(),
  activity_level: z.enum(["sedentary", "light", "moderate", "active"])
});

const jointAreaOptions: Record<JointArea, string> = {
  ankle_foot: "Tornozelo e Pé",
  leg: "Perna",
  knee: "Joelho",
  hip: "Quadril",
  spine: "Coluna",
  shoulder: "Ombro",
  elbow_hand: "Cotovelo e Mão"
};

const conditionsByArea: Record<JointArea, Array<{ value: Condition; label: string }>> = {
  ankle_foot: [
    { value: "plantar_fasciitis", label: "Fascite Plantar" },
    { value: "calcaneal_spur", label: "Esporão do Calcâneo" },
    { value: "ankle_sprain", label: "Entorse do Tornozelo" }
  ],
  leg: [
    { value: "anterior_compartment", label: "Síndrome do Compartimento Anterior" },
    { value: "shin_splints", label: "Canelite" },
    { value: "achilles_tendinitis", label: "Tendinite do Tendão do Calcâneo" }
  ],
  knee: [
    { value: "patellofemoral", label: "Síndrome Patelofemoral" },
    { value: "patellar_tendinitis", label: "Tendinite Patelar" },
    { value: "acl_postop", label: "Pós-operatório de LCA" },
    { value: "mcl_injury", label: "Lesão do Ligamento Colateral Medial" },
    { value: "meniscus_injury", label: "Lesão do Menisco" },
    { value: "knee_arthrosis", label: "Artrose" }
  ],
  hip: [
    { value: "trochanteric_bursitis", label: "Bursite Trocantérica" },
    { value: "piriformis_syndrome", label: "Síndrome do Piriforme" },
    { value: "sports_hernia", label: "Pubalgia" },
    { value: "it_band_syndrome", label: "Síndrome do Trato Iliotibial" }
  ],
  spine: [
    { value: "disc_protrusion", label: "Protusão Discal" },
    { value: "herniated_disc", label: "Hérnia de Disco" },
    { value: "cervical_lordosis", label: "Retificação da Lordose Cervical" }
  ],
  shoulder: [
    { value: "frozen_shoulder", label: "Capsulite Adesiva" },
    { value: "shoulder_bursitis", label: "Bursite" },
    { value: "rotator_cuff", label: "Tendinite do Manguito Rotador" },
    { value: "impingement", label: "Síndrome do Impacto" }
  ],
  elbow_hand: [
    { value: "medial_epicondylitis", label: "Epicondilite Medial" },
    { value: "lateral_epicondylitis", label: "Epicondilite Lateral" },
    { value: "carpal_tunnel", label: "Síndrome do Túnel do Carpo" }
  ]
};

interface PreferencesFormProps {
  onSubmit: (data: FisioPreferences) => void;
}

export const FisioPreferencesForm = ({ onSubmit }: PreferencesFormProps) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      age: 30,
      weight: 70,
      height: 170,
      gender: "male",
      joint_area: "knee",
      condition: "patellofemoral",
      pain_level: 5,
      mobility_level: "moderate",
      previous_treatment: false,
      activity_level: "moderate"
    }
  });

  const handleSubmit = async (data: z.infer<typeof formSchema>) => {
    onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <Card className="overflow-hidden border-none shadow-lg">
          <CardHeader className="border-b bg-primary/5 p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Stethoscope className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">Informações para seu Plano</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Preencha os dados abaixo para gerar seu plano personalizado
                </p>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-6 space-y-8">
            {/* Basic Info Fields */}
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
                    <FormLabel>Gênero</FormLabel>
                    <div className="grid grid-cols-2 gap-4">
                      <SelectCard
                        selected={field.value === "male"}
                        onClick={() => field.onChange("male")}
                      >
                        <span className="text-lg">Masculino</span>
                      </SelectCard>
                      <SelectCard
                        selected={field.value === "female"}
                        onClick={() => field.onChange("female")}
                      >
                        <span className="text-lg">Feminino</span>
                      </SelectCard>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Joint Area Selection */}
            <FormField
              control={form.control}
              name="joint_area"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Área Afetada</FormLabel>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {Object.entries(jointAreaOptions).map(([value, label]) => (
                      <SelectCard
                        key={value}
                        selected={field.value === value}
                        onClick={() => {
                          field.onChange(value);
                          // Reset condition when joint area changes
                          form.setValue("condition", conditionsByArea[value as JointArea][0].value);
                        }}
                      >
                        <span className="text-lg">{label}</span>
                      </SelectCard>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Condition Selection */}
            <FormField
              control={form.control}
              name="condition"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Condição Específica</FormLabel>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {conditionsByArea[form.watch("joint_area")].map(({ value, label }) => (
                      <SelectCard
                        key={value}
                        selected={field.value === value}
                        onClick={() => field.onChange(value)}
                      >
                        <span className="text-lg">{label}</span>
                      </SelectCard>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Pain Level */}
            <FormField
              control={form.control}
              name="pain_level"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nível de Dor (0-10)</FormLabel>
                  <FormControl>
                    <div className="space-y-3">
                      <Slider
                        min={0}
                        max={10}
                        step={1}
                        value={[field.value]}
                        onValueChange={(value) => field.onChange(value[0])}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Sem dor</span>
                        <span>Dor máxima</span>
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Activity Level */}
            <FormField
              control={form.control}
              name="activity_level"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nível de Atividade</FormLabel>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { value: "sedentary", label: "Sedentário" },
                      { value: "light", label: "Leve" },
                      { value: "moderate", label: "Moderado" },
                      { value: "active", label: "Ativo" }
                    ].map(({ value, label }) => (
                      <SelectCard
                        key={value}
                        selected={field.value === value}
                        onClick={() => field.onChange(value)}
                      >
                        <span className="text-lg">{label}</span>
                      </SelectCard>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Submit Button */}
            <Button 
              type="submit" 
              className="w-full"
              size="lg"
            >
              Gerar Plano de Reabilitação
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </form>
    </Form>
  );
};
