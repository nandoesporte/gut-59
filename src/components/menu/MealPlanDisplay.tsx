
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
import { useIsMobile } from "@/hooks/use-mobile";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MealPlanDisplayProps {
  mealPlan: MealPlan;
  onRefresh: () => Promise<void>;
}

export const MealPlanDisplay = ({ mealPlan, onRefresh }: MealPlanDisplayProps) => {
  const [activeDay, setActiveDay] = useState("monday");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showProfessionalNotification, setShowProfessionalNotification] = useState(false);
  const [previousPlanTimestamp, setPreviousPlanTimestamp] = useState<string | null>(null);
  const isMobile = useIsMobile();
  
  // Show professional analysis notification when a new plan is generated
  useEffect(() => {
    if (mealPlan && mealPlan.weeklyPlan) {
      // Create a unique identifier based on the plan content
      const currentPlanTimestamp = JSON.stringify(mealPlan.weeklyTotals) + JSON.stringify(Object.keys(mealPlan.weeklyPlan));
      
      if (currentPlanTimestamp !== previousPlanTimestamp) {
        setShowProfessionalNotification(true);
        setPreviousPlanTimestamp(currentPlanTimestamp);
      }
    }
  }, [mealPlan, previousPlanTimestamp]);
  
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

  const dayLabelsShort: Record<string, string> = {
    monday: "Seg",
    tuesday: "Ter",
    wednesday: "Qua",
    thursday: "Qui",
    friday: "Sex",
    saturday: "Sáb",
    sunday: "Dom"
  };
  
  const currentDayPlan = mealPlan.weeklyPlan[activeDay];
  
  if (!currentDayPlan) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">Nenhum plano para o dia selecionado.</p>
      </div>
    );
  }

  // Mobile navigation functions
  const navigateDay = (direction: 'prev' | 'next') => {
    const currentIndex = days.indexOf(activeDay);
    let newIndex;
    
    if (direction === 'prev') {
      newIndex = currentIndex > 0 ? currentIndex - 1 : days.length - 1;
    } else {
      newIndex = currentIndex < days.length - 1 ? currentIndex + 1 : 0;
    }
    
    setActiveDay(days[newIndex]);
  };

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
      
      {/* Mobile Day Navigation */}
      {isMobile && (
        <div className="flex items-center justify-between bg-primary/5 rounded-lg p-3 mb-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigateDay('prev')}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <h3 className="text-lg font-semibold text-center">
            {dayLabels[activeDay]}
          </h3>
          
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigateDay('next')}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
      
      <Tabs defaultValue={days[0]} value={activeDay} onValueChange={setActiveDay}>
        {/* Desktop tabs - hidden on mobile */}
        {!isMobile && (
          <TabsList className="w-full grid grid-cols-7 mb-6">
            {days.map((day) => (
              <TabsTrigger
                key={day}
                value={day}
                className="text-xs sm:text-sm"
              >
                <span className="hidden sm:inline">{dayLabels[day]}</span>
                <span className="sm:hidden">{dayLabelsShort[day]}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        )}

        {/* Mobile horizontal scrollable tabs - shown only on mobile */}
        {isMobile && (
          <div className="mb-6 overflow-x-auto">
            <TabsList className="flex w-max space-x-1 p-1">
              {days.map((day) => (
                <TabsTrigger
                  key={day}
                  value={day}
                  className="flex-shrink-0 px-4 py-2 text-sm whitespace-nowrap"
                >
                  {dayLabelsShort[day]}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        )}
        
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
