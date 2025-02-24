
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { FileText, Loader2, Trash2 } from "lucide-react";
import { MealPlanItem } from "../types/meal-plan-history";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { MealSection } from "./MealSection";
import { DailyTotals } from "./DailyTotals";
import { Recommendations } from "./Recommendations";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface MealPlanCardProps {
  plan: MealPlanItem;
  onDelete: (planId: string) => Promise<void>;
  onDownload: (plan: MealPlanItem) => Promise<void>;
  isDeleting: boolean;
  isGeneratingPDF: boolean;
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

export const MealPlanCard = ({
  plan,
  onDelete,
  onDownload,
  isDeleting,
  isGeneratingPDF,
}: MealPlanCardProps) => {
  const renderDayPlan = (dayKey: string) => {
    const dayPlan = plan.meal_plan.weeklyPlan[dayKey as keyof typeof plan.meal_plan.weeklyPlan];
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
    <Card className="bg-white shadow-lg">
      <CardHeader className="p-6 border-b">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-xl font-semibold">
              Plano Alimentar
            </h3>
            <p className="text-sm text-gray-500">
              Gerado em {new Date(plan.created_at).toLocaleDateString()}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(plan.id)}
              disabled={isDeleting || isGeneratingPDF}
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onDownload(plan)}
              disabled={isDeleting || isGeneratingPDF}
            >
              {isGeneratingPDF ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <AccordionItem value={plan.id}>
        <AccordionTrigger className="px-6 py-2 hover:no-underline">
          <span className="text-sm text-primary-600">Ver detalhes do plano</span>
        </AccordionTrigger>
        <AccordionContent>
          <CardContent className="p-6">
            <Tabs defaultValue="monday">
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

            {plan.meal_plan.weeklyTotals && (
              <Card className="p-6 mt-8 bg-primary/5">
                <h3 className="text-lg font-semibold mb-4">Médias Semanais</h3>
                <div className="grid grid-cols-5 gap-4 text-center">
                  <div>
                    <p className="text-sm text-gray-500">Calorias</p>
                    <p className="font-semibold">
                      {Math.round(plan.meal_plan.weeklyTotals.averageCalories)} kcal
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Proteínas</p>
                    <p className="font-semibold">
                      {Math.round(plan.meal_plan.weeklyTotals.averageProtein)}g
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Carboidratos</p>
                    <p className="font-semibold">
                      {Math.round(plan.meal_plan.weeklyTotals.averageCarbs)}g
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Gorduras</p>
                    <p className="font-semibold">
                      {Math.round(plan.meal_plan.weeklyTotals.averageFats)}g
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Fibras</p>
                    <p className="font-semibold">
                      {Math.round(plan.meal_plan.weeklyTotals.averageFiber)}g
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {plan.meal_plan.recommendations && (
              <Recommendations recommendations={plan.meal_plan.recommendations} />
            )}
          </CardContent>
        </AccordionContent>
      </AccordionItem>
    </Card>
  );
};
