
import { Button } from "@/components/ui/button";
import { MealPlan } from "./types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { FileDown, RotateCcw } from "lucide-react";
import { Recommendations } from "./components/Recommendations";
import { DailyTotals } from "./components/DailyTotals";
import { MacroDistributionBar } from "./components/MacroDistributionBar";
import { MealSection } from "./components/MealSection";
import { useState } from "react";
import { generateMealPlanPDF } from "./utils/pdf-generator";
import { toast } from "sonner";

interface MealPlanDisplayProps {
  mealPlan: MealPlan;
  onRefresh?: () => Promise<void>;
}

export const MealPlanDisplay = ({ mealPlan, onRefresh }: MealPlanDisplayProps) => {
  const [selectedDay, setSelectedDay] = useState<string>("monday");
  const [refreshing, setRefreshing] = useState(false);

  if (!mealPlan || !mealPlan.weeklyPlan) {
    console.error("Invalid meal plan data:", mealPlan);
    return (
      <div className="text-center p-8">
        <p className="text-red-500">Erro ao carregar o plano alimentar. Dados inválidos.</p>
      </div>
    );
  }

  const days = {
    monday: "Segunda",
    tuesday: "Terça",
    wednesday: "Quarta",
    thursday: "Quinta",
    friday: "Sexta",
    saturday: "Sábado",
    sunday: "Domingo"
  };

  // Make sure all day keys are available or use a default
  const ensureDayExists = (day: string): string => {
    return mealPlan.weeklyPlan[day as keyof typeof mealPlan.weeklyPlan] ? day : Object.keys(mealPlan.weeklyPlan)[0];
  };

  // Get the safe selected day
  const safeSelectedDay = ensureDayExists(selectedDay);
  const currentDay = mealPlan.weeklyPlan[safeSelectedDay as keyof typeof mealPlan.weeklyPlan];

  const handleRefresh = async () => {
    try {
      if (!onRefresh) {
        toast.info("Função de atualização ainda não disponível");
        return;
      }

      setRefreshing(true);
      await onRefresh();
      toast.success("Plano alimentar atualizado com sucesso");
    } catch (error) {
      console.error("Erro ao atualizar plano:", error);
      toast.error("Erro ao atualizar o plano alimentar");
    } finally {
      setRefreshing(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      await generateMealPlanPDF(mealPlan);
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast.error("Erro ao gerar o PDF do plano alimentar");
    }
  };

  console.log("Rendering meal plan, selectedDay:", safeSelectedDay);
  console.log("Current day data:", currentDay);

  if (!currentDay) {
    console.error("No data found for selected day:", safeSelectedDay);
    return (
      <div className="text-center p-8">
        <p className="text-red-500">Erro ao carregar os dados para o dia selecionado.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Seu Plano Alimentar</h2>
        <Button onClick={handleExportPDF} variant="outline">
          <FileDown className="w-4 h-4 mr-2" />
          Exportar PDF
        </Button>
      </div>

      <Tabs value={safeSelectedDay} onValueChange={setSelectedDay}>
        <TabsList className="flex flex-nowrap overflow-x-auto mb-6 pb-2 justify-start">
          {Object.entries(days).map(([key, label]) => (
            <TabsTrigger
              key={key}
              value={key}
              className="whitespace-nowrap"
              disabled={!mealPlan.weeklyPlan[key as keyof typeof mealPlan.weeklyPlan]}
            >
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
        
        {Object.keys(days).map((day) => {
          const dayData = mealPlan.weeklyPlan[day as keyof typeof mealPlan.weeklyPlan];
          if (!dayData) return null;
          
          return (
            <TabsContent key={day} value={day} className="focus-visible:outline-none">
              <div className="space-y-6">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <Card>
                      <CardContent className="p-4">
                        <h3 className="text-lg font-medium mb-4 flex items-center">
                          <span className="h-2 w-2 rounded-full bg-green-500 mr-2"></span>
                          Refeições - {days[day as keyof typeof days]}
                        </h3>
                        <div className="space-y-4">
                          {dayData.meals.breakfast && (
                            <MealSection
                              title="Café da Manhã"
                              meal={dayData.meals.breakfast}
                              icon="☕"
                            />
                          )}
                          
                          {dayData.meals.morningSnack && (
                            <MealSection
                              title="Lanche da Manhã"
                              meal={dayData.meals.morningSnack}
                              icon="🍎"
                            />
                          )}
                          
                          {dayData.meals.lunch && (
                            <MealSection
                              title="Almoço"
                              meal={dayData.meals.lunch}
                              icon="🍽️"
                            />
                          )}
                          
                          {dayData.meals.afternoonSnack && (
                            <MealSection
                              title="Lanche da Tarde"
                              meal={dayData.meals.afternoonSnack}
                              icon="🥪"
                            />
                          )}
                          
                          {dayData.meals.dinner && (
                            <MealSection
                              title="Jantar"
                              meal={dayData.meals.dinner}
                              icon="🥗"
                            />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  
                  <div>
                    <div className="space-y-4">
                      <DailyTotals
                        totalNutrition={dayData.dailyTotals || {
                          calories: 0,
                          protein: 0,
                          carbs: 0,
                          fats: 0,
                          fiber: 0
                        }}
                      />
                      
                      <Card>
                        <CardContent className="p-4">
                          <h3 className="text-lg font-medium mb-4">Distribuição de Macronutrientes</h3>
                          <MacroDistributionBar
                            macros={{
                              protein: dayData.dailyTotals?.protein || 0,
                              carbs: dayData.dailyTotals?.carbs || 0,
                              fats: dayData.dailyTotals?.fats || 0
                            }}
                          />
                          <div className="flex text-xs text-gray-500 justify-between mt-2">
                            <div>Proteínas</div>
                            <div>Carboidratos</div>
                            <div>Gorduras</div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>
                
                {mealPlan.recommendations && (
                  <Recommendations recommendations={mealPlan.recommendations} />
                )}
              </div>
            </TabsContent>
          );
        })}
      </Tabs>
      
      <div className="mt-8 flex justify-center">
        <Button
          onClick={handleRefresh}
          disabled={refreshing || !onRefresh}
          className="hover:bg-primary/5"
          variant="outline"
          size="lg"
        >
          <RotateCcw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Atualizando...' : 'Atualizar Plano'}
        </Button>
      </div>
    </div>
  );
};
