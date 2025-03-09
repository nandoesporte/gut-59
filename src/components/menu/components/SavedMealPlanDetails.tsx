
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { MealSection } from "./MealSection";
import { DailyTotals } from "./DailyTotals";
import { Recommendations } from "./Recommendations";
import { MealPlan, Food, RecommendationsObject } from "../types";
import { supabase } from "@/integrations/supabase/client";
import { FoodReplacementDialog } from "./FoodReplacementDialog";

interface SavedMealPlanDetailsProps {
  planId: string;
  planData: MealPlan;
  isOpen: boolean;
  onClose: () => void;
}

const dayNameMap: Record<string, string> = {
  monday: "Segunda-feira",
  tuesday: "Terça-feira",
  wednesday: "Quarta-feira",
  thursday: "Quinta-feira",
  friday: "Sexta-feira",
  saturday: "Sábado",
  sunday: "Domingo"
};

const mealTypeTranslations: Record<string, string> = {
  breakfast: "Café da Manhã",
  morningSnack: "Lanche da Manhã",
  lunch: "Almoço",
  afternoonSnack: "Lanche da Tarde",
  dinner: "Jantar"
};

export const SavedMealPlanDetails = ({ planId, planData, isOpen, onClose }: SavedMealPlanDetailsProps) => {
  const [selectedDay, setSelectedDay] = useState<string>("monday");
  const [replaceFoodDialogOpen, setReplaceFoodDialogOpen] = useState(false);
  const [selectedFood, setSelectedFood] = useState<{
    food: Food;
    dayKey: string;
    mealType: string;
    index: number;
  } | null>(null);

  const handleReplaceFood = (food: Food, dayKey: string, mealType: string, index: number) => {
    setSelectedFood({ food, dayKey, mealType, index });
    setReplaceFoodDialogOpen(true);
  };

  const handleFoodReplaced = async (originalFood: Food, newFood: Food, dayKey: string, mealType: string, foodIndex: number) => {
    try {
      // Create a deep copy of the plan data
      const updatedPlanData = JSON.parse(JSON.stringify(planData)) as MealPlan;
      
      // Update the specific food item
      if (updatedPlanData.weeklyPlan[dayKey]?.meals) {
        const dayPlan = updatedPlanData.weeklyPlan[dayKey];
        const meal = dayPlan.meals[mealType as keyof typeof dayPlan.meals];
        
        if (meal && meal.foods && meal.foods[foodIndex]) {
          meal.foods[foodIndex] = newFood;
          
          // Update the meal plan in the database
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            toast.error("Usuário não autenticado");
            return;
          }

          // Cast the MealPlan to a compatible JSON structure for Supabase
          const { error } = await supabase
            .from('meal_plans')
            .update({ 
              plan_data: updatedPlanData as unknown as Record<string, any> 
            })
            .eq('id', planId);

          if (error) {
            console.error("Erro ao atualizar plano:", error);
            toast.error("Erro ao atualizar o alimento");
            return;
          }

          toast.success("Alimento substituído com sucesso!");
        }
      }
    } catch (error) {
      console.error("Erro ao substituir alimento:", error);
      toast.error("Erro ao substituir o alimento");
    } finally {
      setReplaceFoodDialogOpen(false);
    }
  };

  // Function to format recommendations
  const formatRecommendations = (recs: string | string[] | RecommendationsObject | undefined): RecommendationsObject | undefined => {
    if (!recs) return undefined;
    
    if (typeof recs === 'string') {
      return { general: recs };
    } else if (Array.isArray(recs)) {
      return { general: recs.join('\n') };
    }
    
    return recs as RecommendationsObject;
  };

  // Function to enhance food preparation details if they're missing or minimal
  const enhanceFoodPreparation = (food: Food): Food => {
    const updatedFood = { ...food };
    
    if (!updatedFood.details || updatedFood.details.length < 10) {
      const foodName = updatedFood.name.toLowerCase();
      
      if (foodName.includes("arroz")) {
        updatedFood.details = "Cozinhe o arroz na proporção de 2 partes de água para 1 de arroz. Refogue com um pouco de azeite e alho antes de adicionar a água. Cozinhe em fogo baixo com tampa por aproximadamente 15-20 minutos.";
      } else if (foodName.includes("feijão")) {
        updatedFood.details = "Deixe o feijão de molho por pelo menos 4 horas antes do preparo. Cozinhe na panela de pressão por aproximadamente 25-30 minutos. Tempere com cebola, alho e uma folha de louro para dar sabor.";
      } else if (foodName.includes("frango") || foodName.includes("peito de frango")) {
        updatedFood.details = "Tempere o frango com sal, pimenta e ervas de sua preferência. Grelhe em uma frigideira antiaderente com um fio de azeite por cerca de 6-7 minutos de cada lado até dourar. Deixe descansar por 5 minutos antes de servir.";
      } else if (foodName.includes("peixe") || foodName.includes("salmão") || foodName.includes("tilápia")) {
        updatedFood.details = "Tempere o peixe com sal, limão e ervas. Cozinhe em uma frigideira com azeite em fogo médio-alto por 3-4 minutos de cada lado. Verifique se está cozido quando a carne estiver opaca e se desfazendo facilmente.";
      } else if (foodName.includes("ovo") || foodName.includes("ovos")) {
        updatedFood.details = "Para ovos mexidos: bata os ovos em uma tigela com uma pitada de sal. Cozinhe em fogo baixo, mexendo constantemente. Para ovos cozidos: cozinhe em água fervente por 6 minutos (gema mole) ou 9 minutos (gema dura).";
      } else if (foodName.includes("aveia") || foodName.includes("mingau")) {
        updatedFood.details = "Misture a aveia com leite ou água na proporção de 1:2. Aqueça em fogo baixo por 3-5 minutos, mexendo constantemente. Adicione canela ou frutas para dar sabor.";
      } else if (foodName.includes("salada")) {
        updatedFood.details = "Lave bem todos os vegetais. Corte em pedaços do tamanho desejado. Misture com um molho simples de azeite, limão e sal. Consuma imediatamente para preservar os nutrientes e a textura.";
      } else if (foodName.includes("batata") || foodName.includes("batata-doce")) {
        updatedFood.details = "Cozinhe a batata em água fervente até que esteja macia (cerca de 15-20 minutos). Para assar, corte em cubos, tempere com azeite, sal e ervas, e asse a 200°C por 25-30 minutos.";
      } else if (foodName.includes("iogurte")) {
        updatedFood.details = "Consuma o iogurte gelado. Para torná-lo mais nutritivo, adicione frutas frescas, granola ou sementes.";
      } else if (foodName.includes("maçã") || foodName.includes("banana") || foodName.includes("fruta")) {
        updatedFood.details = "Lave bem a fruta antes de consumir. Pode ser consumida in natura ou cortada em pedaços para facilitar o consumo.";
      } else {
        updatedFood.details = "Prepare de acordo com suas preferências culinárias, utilizando temperos naturais como ervas, especiarias e limão para realçar o sabor. Evite o uso excessivo de sal e óleo.";
      }
    }
    
    return updatedFood;
  };

  const renderDayPlan = (dayKey: string) => {
    const dayPlan = planData.weeklyPlan[dayKey];
    if (!dayPlan) return null;

    return (
      <div className="space-y-6">
        <div className="p-4 bg-muted rounded-md mb-6">
          <h2 className="text-xl font-bold">📅 {dayNameMap[dayKey]} – Plano Alimentar</h2>
        </div>

        {dayPlan.meals.breakfast && (
          <div className="relative">
            <MealSection
              title={mealTypeTranslations.breakfast}
              icon={<div className="w-5 h-5 text-primary">☀️</div>}
              meal={{
                ...dayPlan.meals.breakfast,
                foods: dayPlan.meals.breakfast.foods.map(enhanceFoodPreparation)
              }}
            />
            <Button 
              variant="outline" 
              size="sm" 
              className="absolute top-2 right-2"
              onClick={() => handleReplaceFood(dayPlan.meals.breakfast.foods[0], dayKey, "breakfast", 0)}
            >
              Substituir
            </Button>
          </div>
        )}

        {dayPlan.meals.morningSnack && (
          <div className="relative">
            <MealSection
              title={mealTypeTranslations.morningSnack}
              icon={<div className="w-5 h-5 text-primary">🥪</div>}
              meal={{
                ...dayPlan.meals.morningSnack,
                foods: dayPlan.meals.morningSnack.foods.map(enhanceFoodPreparation)
              }}
            />
            <Button 
              variant="outline" 
              size="sm" 
              className="absolute top-2 right-2"
              onClick={() => handleReplaceFood(dayPlan.meals.morningSnack.foods[0], dayKey, "morningSnack", 0)}
            >
              Substituir
            </Button>
          </div>
        )}

        {dayPlan.meals.lunch && (
          <div className="relative">
            <MealSection
              title={mealTypeTranslations.lunch}
              icon={<div className="w-5 h-5 text-primary">🍽️</div>}
              meal={{
                ...dayPlan.meals.lunch,
                foods: dayPlan.meals.lunch.foods.map(enhanceFoodPreparation)
              }}
            />
            <Button 
              variant="outline" 
              size="sm" 
              className="absolute top-2 right-2"
              onClick={() => handleReplaceFood(dayPlan.meals.lunch.foods[0], dayKey, "lunch", 0)}
            >
              Substituir
            </Button>
          </div>
        )}

        {dayPlan.meals.afternoonSnack && (
          <div className="relative">
            <MealSection
              title={mealTypeTranslations.afternoonSnack}
              icon={<div className="w-5 h-5 text-primary">🍎</div>}
              meal={{
                ...dayPlan.meals.afternoonSnack,
                foods: dayPlan.meals.afternoonSnack.foods.map(enhanceFoodPreparation)
              }}
            />
            <Button 
              variant="outline" 
              size="sm" 
              className="absolute top-2 right-2"
              onClick={() => handleReplaceFood(dayPlan.meals.afternoonSnack.foods[0], dayKey, "afternoonSnack", 0)}
            >
              Substituir
            </Button>
          </div>
        )}

        {dayPlan.meals.dinner && (
          <div className="relative">
            <MealSection
              title={mealTypeTranslations.dinner}
              icon={<div className="w-5 h-5 text-primary">🌙</div>}
              meal={{
                ...dayPlan.meals.dinner,
                foods: dayPlan.meals.dinner.foods.map(enhanceFoodPreparation)
              }}
            />
            <Button 
              variant="outline" 
              size="sm" 
              className="absolute top-2 right-2"
              onClick={() => handleReplaceFood(dayPlan.meals.dinner.foods[0], dayKey, "dinner", 0)}
            >
              Substituir
            </Button>
          </div>
        )}

        {dayPlan.dailyTotals && (
          <DailyTotals totalNutrition={dayPlan.dailyTotals} />
        )}
      </div>
    );
  };

  if (!planData || !planData.weeklyPlan) {
    return null;
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Plano Alimentar</DialogTitle>
            <DialogDescription>
              Visualize os detalhes do seu plano e faça substituições de alimentos se necessário
            </DialogDescription>
          </DialogHeader>

          <Tabs value={selectedDay} onValueChange={setSelectedDay} className="w-full">
            <TabsList className="mb-6 w-full flex flex-nowrap overflow-x-auto pb-2 justify-start sm:justify-center gap-1 sm:gap-2">
              {Object.entries(dayNameMap).map(([day, dayName]) => (
                <TabsTrigger 
                  key={day} 
                  value={day}
                  className="whitespace-nowrap text-sm sm:text-base px-2 sm:px-4"
                >
                  <span className="hidden sm:inline">{dayName}</span>
                  <span className="sm:hidden">{dayName.split('-')[0]}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {Object.keys(dayNameMap).map(day => (
              <TabsContent key={day} value={day}>
                {renderDayPlan(day)}
              </TabsContent>
            ))}
          </Tabs>

          {planData.recommendations && (
            <Recommendations recommendations={formatRecommendations(planData.recommendations)} />
          )}
        </DialogContent>
      </Dialog>

      {selectedFood && (
        <FoodReplacementDialog
          open={replaceFoodDialogOpen}
          onOpenChange={setReplaceFoodDialogOpen}
          originalFood={selectedFood.food}
          dayKey={selectedFood.dayKey}
          mealType={selectedFood.mealType}
          foodIndex={selectedFood.index}
          onFoodReplaced={handleFoodReplaced}
        />
      )}
    </>
  );
};
