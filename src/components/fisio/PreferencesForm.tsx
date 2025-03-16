
import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { SelectCard } from "@/components/workout/components/SelectCard";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { FisioPreferences, JointArea } from "./types";
import { Stethoscope, ArrowRight, CreditCard, Bot } from "lucide-react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { usePaymentHandling } from "@/components/menu/hooks/usePaymentHandling";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

const formSchema = z.object({
  age: z.number().min(16, "Idade mínima é 16 anos").max(100, "Idade máxima é 100 anos"),
  weight: z.number().min(30, "Peso mínimo é 30kg").max(200, "Peso máximo é 200kg"),
  height: z.number().min(100, "Altura mínima é 100cm").max(250, "Altura máxima é 250cm"),
  gender: z.enum(["male", "female"]),
  joint_area: z.enum([
    "ankle_foot", "leg", "knee", "hip", "spine", "shoulder", "elbow_hand"
  ] as const),
  pain_level: z.number().min(0).max(10),
  mobility_level: z.enum(["limited", "moderate", "good"]),
  previous_treatment: z.boolean(),
  activity_level: z.enum(["sedentary", "light", "moderate", "active"]),
  injuryDescription: z.string().optional(),
  painLocation: z.string().optional(),
  injuryDuration: z.string().optional(),
  previousTreatments: z.string().optional(),
  exerciseExperience: z.string().optional(),
  equipmentAvailable: z.array(z.string()).default([]),
});

type FormData = z.infer<typeof formSchema>;

const jointAreaOptions: Record<JointArea, string> = {
  ankle_foot: "Tornozelo e Pé",
  leg: "Perna",
  knee: "Joelho",
  hip: "Quadril",
  spine: "Coluna",
  shoulder: "Ombro",
  elbow_hand: "Cotovelo e Mão"
};

const equipmentOptions = [
  { value: "elastic_band", label: "Faixa Elástica" },
  { value: "weights", label: "Pesos" },
  { value: "swiss_ball", label: "Bola Suíça" },
  { value: "foam_roller", label: "Rolo de Espuma" },
  { value: "yoga_mat", label: "Tapete de Yoga" },
  { value: "chair", label: "Cadeira" },
  { value: "none", label: "Nenhum" }
];

interface PreferencesFormProps {
  onSubmit: (data: FisioPreferences) => void;
}

export const FisioPreferencesForm = ({ onSubmit }: PreferencesFormProps) => {
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = React.useState(false);
  const [formData, setFormData] = React.useState<FormData | null>(null);
  const {
    isProcessingPayment,
    hasPaid,
    currentPrice,
    handlePaymentAndContinue
  } = usePaymentHandling();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      age: 30,
      weight: 70,
      height: 170,
      gender: "male",
      joint_area: "knee",
      pain_level: 5,
      mobility_level: "moderate",
      previous_treatment: false,
      activity_level: "moderate",
      injuryDescription: "",
      painLocation: "",
      injuryDuration: "",
      previousTreatments: "",
      exerciseExperience: "",
      equipmentAvailable: []
    }
  });

  const handleSubmit = async (data: FormData) => {
    if (!hasPaid) {
      setFormData(data);
      setIsPaymentDialogOpen(true);
      return;
    }

    try {
      const preferences: FisioPreferences = {
        age: data.age,
        weight: data.weight,
        height: data.height,
        gender: data.gender,
        joint_area: data.joint_area,
        // Set a default condition based on the joint area
        condition: getDefaultCondition(data.joint_area),
        pain_level: data.pain_level,
        mobility_level: data.mobility_level,
        previous_treatment: data.previous_treatment,
        activity_level: data.activity_level,
        // Add the new fields from our enhanced form
        injuryDescription: data.injuryDescription,
        painLocation: data.painLocation,
        injuryDuration: data.injuryDuration,
        previousTreatments: data.previousTreatments,
        exerciseExperience: data.exerciseExperience,
        equipmentAvailable: data.equipmentAvailable.filter(item => item !== 'none')
      };
      
      toast.info("Gerando seu plano de reabilitação personalizado com IA...");
      onSubmit(preferences);
    } catch (error: any) {
      console.error("Erro ao processar formulário:", error);
      toast.error(error.message || "Erro ao processar suas preferências. Por favor, tente novamente.");
    }
  };

  // Function to get a default condition based on the joint area
  const getDefaultCondition = (jointArea: JointArea) => {
    switch (jointArea) {
      case "ankle_foot": return "ankle_sprain";
      case "leg": return "shin_splints";
      case "knee": return "patellofemoral";
      case "hip": return "trochanteric_bursitis";
      case "spine": return "disc_protrusion";
      case "shoulder": return "rotator_cuff";
      case "elbow_hand": return "lateral_epicondylitis";
      default: return "patellofemoral";
    }
  };

  const handlePaymentProcess = async () => {
    try {
      await handlePaymentAndContinue();
      if (formData) {
        await handleSubmit(formData);
      }
      setIsPaymentDialogOpen(false);
    } catch (error) {
      console.error("Erro no processo de pagamento:", error);
      toast.error("Erro ao processar pagamento. Por favor, tente novamente.");
    }
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <Card className="overflow-hidden border-none shadow-lg">
            <CardHeader className="border-b bg-primary/5 p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Stethoscope className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold">Informações para seu Plano</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Preencha os dados abaixo para gerar seu plano personalizado
                  </p>
                </div>
                <Badge variant="outline" className="flex items-center gap-1 bg-primary/5">
                  <Bot className="w-3 h-3" />
                  Fisio+ (Llama 3 8B)
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="p-6 space-y-8">
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
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

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

              <FormField
                control={form.control}
                name="painLocation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Localização da Dor</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Ex: Lado interno do joelho direito"
                      />
                    </FormControl>
                    <FormDescription>
                      Descreva onde a dor está localizada com mais detalhes
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

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

              <FormField
                control={form.control}
                name="injuryDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição da Lesão</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Descreva sua lesão ou condição em detalhes"
                        className="min-h-[100px]"
                      />
                    </FormControl>
                    <FormDescription>
                      Descreva como ocorreu a lesão, seus sintomas e qualquer diagnóstico médico
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="injuryDuration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duração da Lesão</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Ex: 3 semanas, 2 meses, 1 ano"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="previousTreatments"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tratamentos Anteriores</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Ex: Fisioterapia por 1 mês, medicamentos anti-inflamatórios"
                        className="min-h-[80px]"
                      />
                    </FormControl>
                    <FormDescription>
                      Liste tratamentos que você já tentou para esta lesão
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="exerciseExperience"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Experiência com Exercícios</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Ex: Pratico exercícios regularmente há 5 anos"
                      />
                    </FormControl>
                    <FormDescription>
                      Descreva sua experiência com exercícios físicos
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="mobility_level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nível de Mobilidade</FormLabel>
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { value: "limited", label: "Limitado" },
                        { value: "moderate", label: "Moderado" },
                        { value: "good", label: "Bom" }
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

              <FormField
                control={form.control}
                name="equipmentAvailable"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Equipamentos Disponíveis</FormLabel>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {equipmentOptions.map((option) => (
                        <SelectCard
                          key={option.value}
                          selected={field.value.includes(option.value)}
                          onClick={() => {
                            if (option.value === 'none') {
                              // If 'none' is selected, clear all other selections
                              field.onChange(['none']);
                            } else {
                              // If any other option is selected, remove 'none' from the selections
                              const newValue = field.value.includes(option.value)
                                ? field.value.filter(val => val !== option.value)
                                : [...field.value.filter(val => val !== 'none'), option.value];
                              field.onChange(newValue);
                            }
                          }}
                        >
                          <span className="text-sm">{option.label}</span>
                        </SelectCard>
                      ))}
                    </div>
                    <FormDescription>
                      Selecione todos os equipamentos que você tem disponíveis para exercícios
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full"
                size="lg"
                disabled={isProcessingPayment}
              >
                Gerar Plano de Reabilitação
                {!isProcessingPayment && <ArrowRight className="w-5 h-5 ml-2" />}
                {isProcessingPayment && (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white ml-2" />
                )}
              </Button>
            </CardContent>
          </Card>
        </form>
      </Form>

      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pagamento do Plano de Reabilitação</DialogTitle>
            <DialogDescription>
              Para gerar seu plano de reabilitação personalizado, é necessário realizar o pagamento.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Valor: R$ {currentPrice.toFixed(2)}
            </p>
            <Button 
              onClick={handlePaymentProcess} 
              className="w-full"
              disabled={isProcessingPayment}
            >
              <CreditCard className="w-4 h-4 mr-2" />
              {isProcessingPayment ? "Processando..." : "Realizar Pagamento"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
