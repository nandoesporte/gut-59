
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileDown, RefreshCcw, Table as TableIcon, LayoutDashboard } from "lucide-react";
import { generateMealPlanPDF } from "./utils/pdf-generator";
import { DailyTotals } from "./components/DailyTotals";
import { MealSection } from "./components/MealSection";
import { Recommendations } from "./components/Recommendations";
import { MealPlanTable } from "./components/MealPlanTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { MealPlan } from "./types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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
  const [viewMode, setViewMode] = useState<"daily" | "table">("daily");
  const [weeklyAverages, setWeeklyAverages] = useState({
    calories: 0,
    protein: 0,
    carbs: 0,
    fats: 0,
    fiber: 0
  });

  useEffect(() => {
    if (mealPlan && mealPlan.weeklyPlan) {
      // Calculate weekly averages if not already provided by the API
      if (!mealPlan.weeklyTotals || 
          isNaN(mealPlan.weeklyTotals.averageCalories) || 
          isNaN(mealPlan.weeklyTotals.averageProtein) ||
          isNaN(mealPlan.weeklyTotals.averageCarbs) ||
          isNaN(mealPlan.weeklyTotals.averageFats) ||
          isNaN(mealPlan.weeklyTotals.averageFiber)) {
        
        console.log("Recalculating weekly averages due to NaN values");
        
        const days = Object.values(mealPlan.weeklyPlan);
        const validDays = days.filter(day => day && day.dailyTotals);
        const dayCount = validDays.length || 1; // Avoid division by zero
        
        const totals = {
          calories: 0,
          protein: 0,
          carbs: 0,
          fats: 0,
          fiber: 0
        };
        
        validDays.forEach(day => {
          if (day.dailyTotals) {
            totals.calories += day.dailyTotals.calories || 0;
            totals.protein += day.dailyTotals.protein || 0;
            totals.carbs += day.dailyTotals.carbs || 0;
            totals.fats += day.dailyTotals.fats || 0;
            totals.fiber += day.dailyTotals.fiber || 0;
          }
        });
        
        setWeeklyAverages({
          calories: Math.round(totals.calories / dayCount),
          protein: Math.round(totals.protein / dayCount),
          carbs: Math.round(totals.carbs / dayCount),
          fats: Math.round(totals.fats / dayCount),
          fiber: Math.round(totals.fiber / dayCount)
        });
      } else {
        // Use the API-provided weekly totals
        setWeeklyAverages({
          calories: Math.round(mealPlan.weeklyTotals.averageCalories) || 0,
          protein: Math.round(mealPlan.weeklyTotals.averageProtein) || 0,
          carbs: Math.round(mealPlan.weeklyTotals.averageCarbs) || 0,
          fats: Math.round(mealPlan.weeklyTotals.averageFats) || 0,
          fiber: Math.round(mealPlan.weeklyTotals.averageFiber) || 0
        });
      }
    }
  }, [mealPlan]);

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
        <div className="p-4 bg-muted rounded-md mb-6">
          <h2 className="text-xl font-bold">📅 {dayNameMap[dayKey]} – Plano Alimentar</h2>
          <p className="text-gray-500 text-sm mt-1">
            {format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>

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
          <Button variant="outline" onClick={handleDownloadPDF} className="flex-1 sm:flex-none">
            <FileDown className="w-4 h-4 mr-2" />
            Baixar PDF
          </Button>
          <Button variant="outline" onClick={onRefresh} className="flex-1 sm:flex-none">
            <RefreshCcw className="w-4 h-4 mr-2" />
            Gerar Novo
          </Button>
        </div>
      </div>

      <div className="mb-4 flex justify-end">
        <div className="inline-flex rounded-md shadow-sm">
          <Button
            variant={viewMode === "daily" ? "default" : "outline"}
            className="rounded-r-none"
            onClick={() => setViewMode("daily")}
          >
            <LayoutDashboard className="w-4 h-4 mr-2" />
            Visualização Diária
          </Button>
          <Button
            variant={viewMode === "table" ? "default" : "outline"}
            className="rounded-l-none"
            onClick={() => setViewMode("table")}
          >
            <TableIcon className="w-4 h-4 mr-2" />
            Tabela Completa
          </Button>
        </div>
      </div>

      <div ref={planRef} className="space-y-6 bg-white p-4 sm:p-8 rounded-lg">
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
          <p className="font-medium">✨ Plano gerado por Nutri+ (powered by Llama 3)</p>
          <p className="mt-1">Este plano foi personalizado com base em suas preferências e necessidades nutricionais.</p>
        </div>

        {viewMode === "daily" ? (
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
        ) : (
          <MealPlanTable mealPlan={mealPlan} />
        )}

        <Card className="p-4 sm:p-6 mt-8 bg-primary/5">
          <h3 className="text-lg font-semibold mb-4">Médias Semanais</h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-center">
            <div>
              <p className="text-sm text-gray-500">Calorias</p>
              <p className="font-semibold">{weeklyAverages.calories} kcal</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Proteínas</p>
              <p className="font-semibold">{weeklyAverages.protein}g</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Carboidratos</p>
              <p className="font-semibold">{weeklyAverages.carbs}g</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Gorduras</p>
              <p className="font-semibold">{weeklyAverages.fats}g</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Fibras</p>
              <p className="font-semibold">{weeklyAverages.fiber}g</p>
            </div>
          </div>
        </Card>

        {mealPlan.recommendations && (
          <Recommendations recommendations={mealPlan.recommendations} />
        )}
      </div>
    </div>
  );
};
