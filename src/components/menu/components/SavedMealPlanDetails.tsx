
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronRight, X } from "lucide-react";
import { MealPlan } from "../types";
import { CalendarIcon } from "lucide-react";
import { generateMealPlanPDF } from "../utils/pdf-generator";

interface SavedMealPlanDetailsProps {
  mealPlan: MealPlan;
  open: boolean;
  onClose: () => void;
}

const dayNameMap: Record<string, string> = {
  segunda: "Segunda-feira",
  terca: "Terça-feira",
  quarta: "Quarta-feira",
  quinta: "Quinta-feira",
  sexta: "Sexta-feira",
  sabado: "Sábado",
  domingo: "Domingo"
};

export const SavedMealPlanDetails = ({ mealPlan, open, onClose }: SavedMealPlanDetailsProps) => {
  const [selectedDay, setSelectedDay] = useState<string>("segunda");

  const handleDownloadPDF = async () => {
    if (!mealPlan) return;
    await generateMealPlanPDF(mealPlan);
  };

  if (!mealPlan || !mealPlan.weeklyPlan) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle>Detalhes do Plano Alimentar</DialogTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="mb-4">
          <Button onClick={handleDownloadPDF} className="w-full sm:w-auto">
            Baixar PDF
          </Button>
        </div>

        {mealPlan.weeklyPlan && (
          <Tabs value={selectedDay} onValueChange={setSelectedDay} className="w-full">
            <TabsList className="mb-4 w-full flex overflow-x-auto justify-start gap-1">
              {Object.entries(dayNameMap).map(([day, dayName]) => (
                <TabsTrigger key={day} value={day} className="whitespace-nowrap">
                  <span className="hidden sm:inline">{dayName}</span>
                  <span className="sm:hidden">{dayName.split('-')[0]}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {Object.keys(dayNameMap).map(day => (
              <TabsContent key={day} value={day}>
                {mealPlan.weeklyPlan[day as keyof typeof mealPlan.weeklyPlan] && (
                  <div className="space-y-6">
                    <div className="p-4 bg-muted rounded-md">
                      <h2 className="text-xl font-bold flex items-center">
                        <CalendarIcon className="mr-2 h-5 w-5" />
                        {dayNameMap[day]} – Plano Alimentar
                      </h2>
                    </div>

                    {mealPlan.weeklyPlan[day as keyof typeof mealPlan.weeklyPlan]?.meals.cafeDaManha && (
                      <Card className="p-4">
                        <h3 className="text-lg font-semibold mb-2">☀️ Café da Manhã</h3>
                        <p className="text-sm text-gray-600 mb-2">
                          {mealPlan.weeklyPlan[day as keyof typeof mealPlan.weeklyPlan]?.meals.cafeDaManha.description}
                        </p>
                        <div className="space-y-2">
                          {mealPlan.weeklyPlan[day as keyof typeof mealPlan.weeklyPlan]?.meals.cafeDaManha.foods.map((food, idx) => (
                            <div key={idx} className="flex items-start">
                              <ChevronRight className="h-4 w-4 mt-1 mr-1 text-primary" />
                              <div>
                                <span className="font-medium">{food.name}</span>
                                <span className="text-gray-600"> - {food.portion} {food.unit}</span>
                                <p className="text-xs text-gray-500">{food.details}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 pt-3 border-t text-sm">
                          <p><span className="font-medium">Calorias:</span> {mealPlan.weeklyPlan[day as keyof typeof mealPlan.weeklyPlan]?.meals.cafeDaManha.calories} kcal</p>
                        </div>
                      </Card>
                    )}

                    {mealPlan.weeklyPlan[day as keyof typeof mealPlan.weeklyPlan]?.meals.lancheDaManha && (
                      <Card className="p-4">
                        <h3 className="text-lg font-semibold mb-2">🥪 Lanche da Manhã</h3>
                        <p className="text-sm text-gray-600 mb-2">
                          {mealPlan.weeklyPlan[day as keyof typeof mealPlan.weeklyPlan]?.meals.lancheDaManha.description}
                        </p>
                        <div className="space-y-2">
                          {mealPlan.weeklyPlan[day as keyof typeof mealPlan.weeklyPlan]?.meals.lancheDaManha.foods.map((food, idx) => (
                            <div key={idx} className="flex items-start">
                              <ChevronRight className="h-4 w-4 mt-1 mr-1 text-primary" />
                              <div>
                                <span className="font-medium">{food.name}</span>
                                <span className="text-gray-600"> - {food.portion} {food.unit}</span>
                                <p className="text-xs text-gray-500">{food.details}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 pt-3 border-t text-sm">
                          <p><span className="font-medium">Calorias:</span> {mealPlan.weeklyPlan[day as keyof typeof mealPlan.weeklyPlan]?.meals.lancheDaManha.calories} kcal</p>
                        </div>
                      </Card>
                    )}

                    {mealPlan.weeklyPlan[day as keyof typeof mealPlan.weeklyPlan]?.meals.almoco && (
                      <Card className="p-4">
                        <h3 className="text-lg font-semibold mb-2">🍽️ Almoço</h3>
                        <p className="text-sm text-gray-600 mb-2">
                          {mealPlan.weeklyPlan[day as keyof typeof mealPlan.weeklyPlan]?.meals.almoco.description}
                        </p>
                        <div className="space-y-2">
                          {mealPlan.weeklyPlan[day as keyof typeof mealPlan.weeklyPlan]?.meals.almoco.foods.map((food, idx) => (
                            <div key={idx} className="flex items-start">
                              <ChevronRight className="h-4 w-4 mt-1 mr-1 text-primary" />
                              <div>
                                <span className="font-medium">{food.name}</span>
                                <span className="text-gray-600"> - {food.portion} {food.unit}</span>
                                <p className="text-xs text-gray-500">{food.details}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 pt-3 border-t text-sm">
                          <p><span className="font-medium">Calorias:</span> {mealPlan.weeklyPlan[day as keyof typeof mealPlan.weeklyPlan]?.meals.almoco.calories} kcal</p>
                        </div>
                      </Card>
                    )}

                    {mealPlan.weeklyPlan[day as keyof typeof mealPlan.weeklyPlan]?.meals.lancheDaTarde && (
                      <Card className="p-4">
                        <h3 className="text-lg font-semibold mb-2">🍎 Lanche da Tarde</h3>
                        <p className="text-sm text-gray-600 mb-2">
                          {mealPlan.weeklyPlan[day as keyof typeof mealPlan.weeklyPlan]?.meals.lancheDaTarde.description}
                        </p>
                        <div className="space-y-2">
                          {mealPlan.weeklyPlan[day as keyof typeof mealPlan.weeklyPlan]?.meals.lancheDaTarde.foods.map((food, idx) => (
                            <div key={idx} className="flex items-start">
                              <ChevronRight className="h-4 w-4 mt-1 mr-1 text-primary" />
                              <div>
                                <span className="font-medium">{food.name}</span>
                                <span className="text-gray-600"> - {food.portion} {food.unit}</span>
                                <p className="text-xs text-gray-500">{food.details}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 pt-3 border-t text-sm">
                          <p><span className="font-medium">Calorias:</span> {mealPlan.weeklyPlan[day as keyof typeof mealPlan.weeklyPlan]?.meals.lancheDaTarde.calories} kcal</p>
                        </div>
                      </Card>
                    )}

                    {mealPlan.weeklyPlan[day as keyof typeof mealPlan.weeklyPlan]?.meals.jantar && (
                      <Card className="p-4">
                        <h3 className="text-lg font-semibold mb-2">🌙 Jantar</h3>
                        <p className="text-sm text-gray-600 mb-2">
                          {mealPlan.weeklyPlan[day as keyof typeof mealPlan.weeklyPlan]?.meals.jantar.description}
                        </p>
                        <div className="space-y-2">
                          {mealPlan.weeklyPlan[day as keyof typeof mealPlan.weeklyPlan]?.meals.jantar.foods.map((food, idx) => (
                            <div key={idx} className="flex items-start">
                              <ChevronRight className="h-4 w-4 mt-1 mr-1 text-primary" />
                              <div>
                                <span className="font-medium">{food.name}</span>
                                <span className="text-gray-600"> - {food.portion} {food.unit}</span>
                                <p className="text-xs text-gray-500">{food.details}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 pt-3 border-t text-sm">
                          <p><span className="font-medium">Calorias:</span> {mealPlan.weeklyPlan[day as keyof typeof mealPlan.weeklyPlan]?.meals.jantar.calories} kcal</p>
                        </div>
                      </Card>
                    )}

                    {mealPlan.weeklyPlan[day as keyof typeof mealPlan.weeklyPlan]?.dailyTotals && (
                      <Card className="p-4">
                        <h3 className="text-lg font-semibold mb-2">📊 Totais do Dia</h3>
                        <div className="grid grid-cols-5 gap-4 text-center">
                          <div>
                            <p className="text-sm text-gray-500">Calorias</p>
                            <p className="font-semibold">{mealPlan.weeklyPlan[day as keyof typeof mealPlan.weeklyPlan]?.dailyTotals.calories} kcal</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Proteínas</p>
                            <p className="font-semibold">{mealPlan.weeklyPlan[day as keyof typeof mealPlan.weeklyPlan]?.dailyTotals.protein}g</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Carboidratos</p>
                            <p className="font-semibold">{mealPlan.weeklyPlan[day as keyof typeof mealPlan.weeklyPlan]?.dailyTotals.carbs}g</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Gorduras</p>
                            <p className="font-semibold">{mealPlan.weeklyPlan[day as keyof typeof mealPlan.weeklyPlan]?.dailyTotals.fats}g</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Fibras</p>
                            <p className="font-semibold">{mealPlan.weeklyPlan[day as keyof typeof mealPlan.weeklyPlan]?.dailyTotals.fiber}g</p>
                          </div>
                        </div>
                      </Card>
                    )}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};
