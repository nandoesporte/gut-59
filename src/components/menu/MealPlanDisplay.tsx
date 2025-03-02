
import { MealPlan } from "./types";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { useState } from "react";
import { generateMealPlanPDF } from "./utils/pdf-generator";
import { toast } from "sonner";
import { MealPlanHeader } from "./components/MealPlanHeader";
import { DaysTabs } from "./components/DaysTabs";
import { RefreshButton } from "./components/RefreshButton";
import { DayContent } from "./components/DayContent";
import { Recommendations } from "./components/Recommendations";

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

  return (
    <div>
      <MealPlanHeader onExport={handleExportPDF} />

      <Tabs value={safeSelectedDay} onValueChange={setSelectedDay}>
        <DaysTabs 
          days={days} 
          selectedDay={safeSelectedDay} 
          setSelectedDay={setSelectedDay} 
          weeklyPlan={mealPlan.weeklyPlan} 
        />
        
        {Object.keys(days).map((day) => {
          const dayData = mealPlan.weeklyPlan[day as keyof typeof mealPlan.weeklyPlan];
          if (!dayData) return null;
          
          return (
            <TabsContent key={day} value={day} className="focus-visible:outline-none">
              <DayContent dayData={dayData} dayLabel={days[day as keyof typeof days]} />
              
              {mealPlan.recommendations && (
                <Recommendations recommendations={mealPlan.recommendations} />
              )}
            </TabsContent>
          );
        })}
      </Tabs>
      
      <RefreshButton 
        onRefresh={handleRefresh} 
        refreshing={refreshing} 
        hasRefreshFunction={!!onRefresh} 
      />
    </div>
  );
};
