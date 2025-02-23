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

  const handleDownloadPDF = async () => {
    if (!mealPlan) return;
    await generateMealPlanPDF(mealPlan);
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
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-gray-900">
          Seu Plano Alimentar Semanal
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDownloadPDF}>
            <FileDown className="w-4 h-4 mr-2" />
            Baixar PDF
          </Button>
          <Button variant="outline" onClick={onRefresh}>
            <RefreshCcw className="w-4 h-4 mr-2" />
            Gerar Novo
          </Button>
        </div>
      </div>

      <div ref={planRef} className="space-y-6 bg-white p-8 rounded-lg">
        <Tabs value={selectedDay} onValueChange={setSelectedDay}>
          <TabsList className="mb-6">
            {Object.entries(dayNameMap).map(([day, dayName]) => (
              <TabsTrigger key={day} value={day}>
                {dayName}
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
          <Card className="p-6 mt-8 bg-primary/5">
            <h3 className="text-lg font-semibold mb-4">Médias Semanais</h3>
            <div className="grid grid-cols-5 gap-4 text-center">
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
