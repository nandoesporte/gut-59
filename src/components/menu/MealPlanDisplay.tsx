
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileDown, RefreshCcw } from "lucide-react";
import { generateMealPlanPDF } from "./utils/pdf-generator";
import { DailyTotals } from "./components/DailyTotals";
import { MealSection } from "./components/MealSection";
import { Recommendations } from "./components/Recommendations";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { MealPlan } from "./types";
import { useRef, useState } from "react";
import { toast } from "sonner";

interface MealPlanDisplayProps {
  mealPlan: MealPlan;
  onRefresh: () => Promise<void>;
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

export const MealPlanDisplay = ({ mealPlan, onRefresh }: MealPlanDisplayProps) => {
  const planRef = useRef<HTMLDivElement>(null);
  const [selectedDay, setSelectedDay] = useState<string>("monday");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadPDF = async () => {
    if (!mealPlan) return;
    
    try {
      setIsDownloading(true);
      await generateMealPlanPDF(mealPlan);
      toast.success("PDF gerado com sucesso!");
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast.error("Erro ao gerar o PDF. Por favor, tente novamente.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleRefreshPlan = async () => {
    try {
      setIsGenerating(true);
      await onRefresh();
      toast.success("Plano alimentar atualizado com sucesso!");
    } catch (error) {
      console.error("Erro ao atualizar o plano:", error);
      toast.error("Não foi possível gerar um novo plano. Tente novamente.");
    } finally {
      setIsGenerating(false);
    }
  };

  if (!mealPlan || !mealPlan.weeklyPlan) {
    return (
      <div className="text-center p-6">
        <p className="text-gray-500">Nenhum plano alimentar disponível</p>
      </div>
    );
  }

  const renderDayPlan = (dayKey: string) => {
    const dayPlan = mealPlan.weeklyPlan[dayKey as keyof typeof mealPlan.weeklyPlan];
    if (!dayPlan) return null;

    return (
      <div className="space-y-6">
        {dayPlan.meals.breakfast && (
          <MealSection
            title="Café da Manhã"
            icon={<div className="w-5 h-5 text-primary">☀️</div>}
            meal={dayPlan.meals.breakfast}
          />
        )}

        {dayPlan.meals.morningSnack && (
          <MealSection
            title="Lanche da Manhã"
            icon={<div className="w-5 h-5 text-primary">🥪</div>}
            meal={dayPlan.meals.morningSnack}
          />
        )}

        {dayPlan.meals.lunch && (
          <MealSection
            title="Almoço"
            icon={<div className="w-5 h-5 text-primary">🍽️</div>}
            meal={dayPlan.meals.lunch}
          />
        )}

        {dayPlan.meals.afternoonSnack && (
          <MealSection
            title="Lanche da Tarde"
            icon={<div className="w-5 h-5 text-primary">🍎</div>}
            meal={dayPlan.meals.afternoonSnack}
          />
        )}

        {dayPlan.meals.dinner && (
          <MealSection
            title="Jantar"
            icon={<div className="w-5 h-5 text-primary">🌙</div>}
            meal={dayPlan.meals.dinner}
          />
        )}

        {dayPlan.dailyTotals && (
          <DailyTotals totalNutrition={dayPlan.dailyTotals} />
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-900">
          Seu Plano Alimentar Semanal
        </h2>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button 
            variant="outline" 
            onClick={handleDownloadPDF} 
            className="flex-1 sm:flex-none"
            disabled={isDownloading}
          >
            {isDownloading ? (
              <>
                <span className="animate-spin mr-2">⭮</span>
                Gerando...
              </>
            ) : (
              <>
                <FileDown className="w-4 h-4 mr-2" />
                Baixar PDF
              </>
            )}
          </Button>
          <Button 
            variant="outline" 
            onClick={handleRefreshPlan} 
            className="flex-1 sm:flex-none"
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <span className="animate-spin mr-2">⭮</span>
                Atualizando...
              </>
            ) : (
              <>
                <RefreshCcw className="w-4 h-4 mr-2" />
                Gerar Novo
              </>
            )}
          </Button>
        </div>
      </div>

      <div ref={planRef} className="space-y-6 bg-white p-4 sm:p-8 rounded-lg">
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

        {mealPlan.weeklyTotals && (
          <Card className="p-4 sm:p-6 mt-8 bg-primary/5">
            <h3 className="text-lg font-semibold mb-4">Médias Semanais</h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-center">
              <div>
                <p className="text-sm text-gray-500">Calorias</p>
                <p className="font-semibold">{Math.round(mealPlan.weeklyTotals.averageCalories)} kcal</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Proteínas</p>
                <p className="font-semibold">{Math.round(mealPlan.weeklyTotals.averageProtein)}g</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Carboidratos</p>
                <p className="font-semibold">{Math.round(mealPlan.weeklyTotals.averageCarbs)}g</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Gorduras</p>
                <p className="font-semibold">{Math.round(mealPlan.weeklyTotals.averageFats)}g</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Fibras</p>
                <p className="font-semibold">{Math.round(mealPlan.weeklyTotals.averageFiber)}g</p>
              </div>
            </div>
          </Card>
        )}

        {mealPlan.recommendations && (
          <Recommendations recommendations={mealPlan.recommendations} />
        )}
      </div>
    </div>
  );
};
