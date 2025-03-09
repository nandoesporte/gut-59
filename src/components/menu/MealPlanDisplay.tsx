
import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Calendar, 
  Utensils, 
  Coffee, 
  Apple, 
  Download, 
  RefreshCcw, 
  Moon,
  Sun
} from "lucide-react";
import { MealPlan, DailyNutrition } from "./types";
import { MealSection } from "./components/MealSection";
import { DailyTotals } from "./components/DailyTotals";
import { Recommendations } from "./components/Recommendations";
import { MealPlanTable } from "./components/MealPlanTable";
import { generateMealPlanPDF } from "./utils/pdf-generator";

interface MealPlanDisplayProps {
  mealPlan: MealPlan;
  onRefresh: () => Promise<void>;
}

export const MealPlanDisplay = ({ mealPlan, onRefresh }: MealPlanDisplayProps) => {
  const [activeDay, setActiveDay] = useState("monday");
  const [isRefreshing, setIsRefreshing] = useState(false);
  
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
        <div>
          <h2 className="text-xl font-bold flex items-center">
            <Calendar className="h-5 w-5 mr-2 text-green-600" />
            Seu Plano Alimentar Personalizado
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {mealPlan.userCalories} kcal diárias • {mealPlan.weeklyTotals.averageProtein}g proteína
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCcw className="h-4 w-4 mr-2" />
            {isRefreshing ? "Atualizando..." : "Novo Plano"}
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleDownloadPDF}
          >
            <Download className="h-4 w-4 mr-2" />
            PDF
          </Button>
        </div>
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
              <Card>
                <CardContent className="p-4 sm:p-6">
                  <h3 className="font-bold text-lg mb-4 flex items-center">
                    <Calendar className="w-5 h-5 mr-2 text-blue-600" />
                    {dayPlan.dayName || dayLabels[day] || "Dia da Semana"}
                  </h3>
                  
                  <div className="grid grid-cols-1 gap-6">
                    {dayPlan.meals?.breakfast && (
                      <MealSection
                        title={mealTypeLabels["breakfast"] || "Café da Manhã"}
                        icon={<Coffee className="h-5 w-5 text-amber-500" />}
                        meal={dayPlan.meals.breakfast}
                        unitLabels={unitLabels}
                      />
                    )}
                    
                    {dayPlan.meals?.morningSnack && (
                      <MealSection
                        title={mealTypeLabels["morningSnack"] || "Lanche da Manhã"}
                        icon={<Apple className="h-5 w-5 text-red-500" />}
                        meal={dayPlan.meals.morningSnack}
                        unitLabels={unitLabels}
                      />
                    )}
                    
                    {dayPlan.meals?.lunch && (
                      <MealSection
                        title={mealTypeLabels["lunch"] || "Almoço"}
                        icon={<Utensils className="h-5 w-5 text-green-600" />}
                        meal={dayPlan.meals.lunch}
                        unitLabels={unitLabels}
                      />
                    )}
                    
                    {dayPlan.meals?.afternoonSnack && (
                      <MealSection
                        title={mealTypeLabels["afternoonSnack"] || "Lanche da Tarde"}
                        icon={<Apple className="h-5 w-5 text-orange-500" />}
                        meal={dayPlan.meals.afternoonSnack}
                        unitLabels={unitLabels}
                      />
                    )}
                    
                    {dayPlan.meals?.dinner && (
                      <MealSection
                        title={mealTypeLabels["dinner"] || "Jantar"}
                        icon={<Moon className="h-5 w-5 text-indigo-500" />}
                        meal={dayPlan.meals.dinner}
                        unitLabels={unitLabels}
                      />
                    )}
                    
                    {dayPlan.meals?.eveningSnack && (
                      <MealSection
                        title={mealTypeLabels["eveningSnack"] || "Ceia"}
                        icon={<Moon className="h-5 w-5 text-purple-500" />}
                        meal={dayPlan.meals.eveningSnack}
                        unitLabels={unitLabels}
                      />
                    )}
                    
                    <DailyTotals 
                      totalNutrition={dayPlan.dailyTotals} 
                      macroLabels={macroLabels}
                    />
                  </div>
                </CardContent>
              </Card>
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
      
      <Card>
        <CardContent className="p-4 sm:p-6">
          <h3 className="font-bold text-lg mb-4">Visão Geral Semanal</h3>
          <MealPlanTable 
            mealPlan={mealPlan} 
            mealTypeLabels={mealTypeLabels} 
            macroLabels={macroLabels}
          />
        </CardContent>
      </Card>
    </div>
  );
};
