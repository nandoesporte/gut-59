
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MealPlanTable } from "./MealPlanTable";
import { X } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DailyTotals } from "./DailyTotals";
import { MacroDistributionBar } from "./MacroDistributionBar";

interface SavedMealPlanDetailsProps {
  plan: any;
  onClose: () => void;
}

export const SavedMealPlanDetails = ({ plan, onClose }: SavedMealPlanDetailsProps) => {
  const [selectedDay, setSelectedDay] = useState<string>("monday");
  
  if (!plan || !plan.plan_data || !plan.plan_data.weeklyPlan) {
    return (
      <Dialog open onOpenChange={() => onClose()}>
        <DialogContent className="max-w-4xl h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Plano Alimentar</DialogTitle>
            <DialogClose asChild>
              <Button variant="ghost" size="icon" onClick={onClose} className="absolute right-4 top-4">
                <X className="h-4 w-4" />
              </Button>
            </DialogClose>
          </DialogHeader>
          <div className="p-6 text-center">
            <p>Dados do plano alimentar incompletos ou inválidos.</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const { weeklyPlan, weeklyTotals } = plan.plan_data;
  const dayNames = {
    monday: "Segunda-feira",
    tuesday: "Terça-feira",
    wednesday: "Quarta-feira",
    thursday: "Quinta-feira",
    friday: "Sexta-feira",
    saturday: "Sábado",
    sunday: "Domingo"
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Plano Alimentar • {plan.calories} kcal</DialogTitle>
          <DialogClose asChild>
            <Button variant="ghost" size="icon" onClick={onClose} className="absolute right-4 top-4">
              <X className="h-4 w-4" />
            </Button>
          </DialogClose>
        </DialogHeader>

        <div className="space-y-4">
          {/* Macro distribution overview */}
          <div className="p-4 bg-white rounded-md shadow-sm border">
            <h3 className="text-lg font-medium mb-3">Distribuição de Macronutrientes</h3>
            <MacroDistributionBar 
              protein={weeklyTotals?.averageProtein || 0} 
              carbs={weeklyTotals?.averageCarbs || 0} 
              fats={weeklyTotals?.averageFats || 0} 
            />
          </div>

          {/* Weekly tabs */}
          <Tabs value={selectedDay} onValueChange={setSelectedDay}>
            <TabsList className="w-full bg-gray-100 p-1 overflow-x-auto flex flex-nowrap">
              {Object.entries(dayNames).map(([day, name]) => (
                <TabsTrigger 
                  key={day} 
                  value={day}
                  className="flex-grow whitespace-nowrap"
                  disabled={!weeklyPlan[day]}
                >
                  {name}
                </TabsTrigger>
              ))}
            </TabsList>

            {Object.keys(dayNames).map((day) => (
              <TabsContent key={day} value={day} className="space-y-4">
                {weeklyPlan[day] ? (
                  <>
                    <DailyTotals dailyTotals={weeklyPlan[day].dailyTotals} />
                    <MealPlanTable dayPlan={weeklyPlan[day]} />
                  </>
                ) : (
                  <div className="text-center p-8">
                    <p className="text-gray-500">Plano não disponível para este dia.</p>
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};
