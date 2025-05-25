
import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MealPlan } from "./types";
import { DayPlanContent } from "./components/DayPlanContent";
import { MealPlanHeader } from "./components/MealPlanHeader";
import { MealPlanActionButtons } from "./components/MealPlanActionButtons";
import { WeeklyOverview } from "./components/WeeklyOverview";
import { Recommendations } from "./components/Recommendations";
import { generateMealPlanPDF } from "./utils/pdf-generator";
import { ProfessionalAnalysisNotification } from "../workout/components/ProfessionalAnalysisNotification";
import { useEffect } from "react";

interface MealPlanDisplayProps {
  mealPlan: MealPlan;
  onRefresh: () => Promise<void>;
}

export const MealPlanDisplay = ({ mealPlan, onRefresh }: MealPlanDisplayProps) => {
  const [activeDay, setActiveDay] = useState("monday");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showProfessionalNotification, setShowProfessionalNotification] = useState(false);
  const [previousPlanId, setPreviousPlanId] = useState<string | null>(null);
  
  // Show professional analysis notification when a new plan is generated
  useEffect(() => {
    if (mealPlan && mealPlan.id !== previousPlanId) {
      setShowProfessionalNotification(true);
      setPreviousPlanId(mealPlan.id);
    }
  }, [mealPlan, previousPlanId]);
  
  if (!mealPlan || !mealPlan.weeklyPlan) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">Não foi possível carregar o plano alimentar. Por favor, tente novamente.</p>
      </div>
    );
  }

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } catch (error) {
      console.error("Erro ao atualizar plano alimentar:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDownloadPDF = () => {
    generateMealPlanPDF(mealPlan);
  };
  
  const days = Object.keys(mealPlan.weeklyPlan);
  const dayLabels: Record<string, string> = {
    monday: "Segunda",
    tuesday: "Terça",
    wednesday: "Quarta",
    thursday: "Quinta",
    friday: "Sexta",
    saturday: "Sábado",
    sunday: "Domingo"
  };
  
  const currentDayPlan = mealPlan.weeklyPlan[activeDay];
  
  if (!currentDayPlan) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">Nenhum plano para o dia selecionado.</p>
      </div>
    );
  }

  // Traduções para tipos de refeição
  const mealTypeLabels: Record<string, string> = {
    "breakfast": "Café da Manhã",
    "morningSnack": "Lanche da Manhã",
    "lunch": "Almoço",
    "afternoonSnack": "Lanche da Tarde",
    "dinner": "Jantar",
    "eveningSnack": "Ceia"
  };

  // Traduções para unidades
  const unitLabels: Record<string, string> = {
    "g": "g",
    "ml": "ml",
    "unit": "unidade",
    "units": "unidades",
    "cup": "xícara",
    "cups": "xícaras",
    "tbsp": "colher de sopa",
    "tsp": "colher de chá",
    "slice": "fatia",
    "slices": "fatias",
    "piece": "pedaço",
    "pieces": "pedaços",
    "scoop": "porção",
    "scoops": "porções"
  };

  // Traduções para macronutrientes
  const macroLabels: Record<string, string> = {
    "protein": "proteína",
    "carbs": "carboidratos",
    "fats": "gorduras",
    "fiber": "fibras",
    "calories": "calorias"
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <MealPlanHeader 
          calories={mealPlan.userCalories} 
          protein={mealPlan.weeklyTotals.averageProtein} 
        />
        
        <MealPlanActionButtons 
          onRefresh={handleRefresh} 
          onDownload={handleDownloadPDF} 
          isRefreshing={isRefreshing} 
        />
      </div>
      
      <Tabs defaultValue={days[0]} value={activeDay} onValueChange={setActiveDay}>
        <TabsList className="w-full flex flex-nowrap overflow-x-auto sm:grid sm:grid-cols-7 mb-6">
          {days.map((day) => (
            <TabsTrigger
              key={day}
              value={day}
              className="flex-1 whitespace-nowrap"
            >
              {dayLabels[day] || day}
            </TabsTrigger>
          ))}
        </TabsList>
        
        {days.map((day) => {
          const dayPlan = mealPlan.weeklyPlan[day];
          if (!dayPlan) return null;
          
          return (
            <TabsContent key={day} value={day} className="space-y-6">
              <DayPlanContent 
                dayPlan={dayPlan}
                dayLabel={dayLabels[day]}
                mealTypeLabels={mealTypeLabels}
                unitLabels={unitLabels}
                macroLabels={macroLabels}
              />
            </TabsContent>
          );
        })}
      </Tabs>
      
      {mealPlan.recommendations && (
        <Card>
          <CardContent className="p-4 sm:p-6">
            <Recommendations recommendations={mealPlan.recommendations} />
          </CardContent>
        </Card>
      )}
      
      <WeeklyOverview 
        mealPlan={mealPlan}
        mealTypeLabels={mealTypeLabels}
        macroLabels={macroLabels}
      />

      <ProfessionalAnalysisNotification
        isOpen={showProfessionalNotification}
        onClose={() => setShowProfessionalNotification(false)}
        planType="rehab"
      />
    </div>
  );
};
