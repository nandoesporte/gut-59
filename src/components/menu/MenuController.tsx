import React, { useState } from "react";
import { MealPlan, DayPlan, Meal, MealFood, MealMacros, DailyNutrition, Recommendations, WeeklyTotals } from "./types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { generateMealPlanPDF } from "./utils/pdf-generator";

interface MenuControllerProps {
  initialMealPlan?: MealPlan;
  onRefresh?: () => Promise<void>;
}

export const MenuController: React.FC<MenuControllerProps> = ({ initialMealPlan, onRefresh }) => {
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(initialMealPlan || null);
  const [selectedDay, setSelectedDay] = useState<string>("segunda");

  const handleDownloadPDF = async () => {
    if (!mealPlan) return;
    await generateMealPlanPDF(mealPlan);
  };

  const handleRefresh = async () => {
    if (onRefresh) {
      await onRefresh();
    }
  };

  const createEmptyMealPlan = (): MealPlan => {
    // Create an empty meal structure
    const emptyMeal: Meal = {
      description: "",
      foods: [],
      calories: 0,
      macros: {
        protein: 0,
        carbs: 0,
        fats: 0,
        fiber: 0
      }
    };

    // Create empty daily totals
    const emptyDailyTotals: DailyNutrition = {
      calories: 0,
      protein: 0,
      carbs: 0,
      fats: 0,
      fiber: 0
    };

    // Create an empty day plan
    const emptyDayPlan: DayPlan = {
      dayName: "",
      meals: {
        cafeDaManha: { ...emptyMeal },
        lancheDaManha: { ...emptyMeal },
        almoco: { ...emptyMeal },
        lancheDaTarde: { ...emptyMeal },
        jantar: { ...emptyMeal }
      },
      dailyTotals: { ...emptyDailyTotals }
    };

    // Create empty weekly totals
    const emptyWeeklyTotals: WeeklyTotals = {
      averageCalories: 0,
      averageProtein: 0,
      averageCarbs: 0,
      averageFats: 0,
      averageFiber: 0
    };

    // Create empty recommendations
    const emptyRecommendations: Recommendations = {
      general: "",
      preworkout: "",
      postworkout: "",
      timing: []
    };

    // Create the empty meal plan with all days
    return {
      weeklyPlan: {
        segunda: { ...emptyDayPlan, dayName: "Segunda-feira" },
        terca: { ...emptyDayPlan, dayName: "Terça-feira" },
        quarta: { ...emptyDayPlan, dayName: "Quarta-feira" },
        quinta: { ...emptyDayPlan, dayName: "Quinta-feira" },
        sexta: { ...emptyDayPlan, dayName: "Sexta-feira" },
        sabado: { ...emptyDayPlan, dayName: "Sábado" },
        domingo: { ...emptyDayPlan, dayName: "Domingo" }
      },
      weeklyTotals: emptyWeeklyTotals,
      recommendations: emptyRecommendations
    };
  };

  const addFoodToMeal = (dayKey: string, mealKey: keyof DayPlan["meals"], food: MealFood) => {
    if (!mealPlan) return;

    const updatedMealPlan = { ...mealPlan };
    const day = updatedMealPlan.weeklyPlan[dayKey as keyof typeof updatedMealPlan.weeklyPlan];
    
    if (day && day.meals[mealKey]) {
      day.meals[mealKey].foods.push(food);
      
      // Recalculate meal calories and macros
      // This is a simplified calculation - in a real app you'd have more detailed logic
      const additionalCalories = 100; // Example value
      day.meals[mealKey].calories += additionalCalories;
      
      // Update daily totals
      day.dailyTotals.calories += additionalCalories;
      
      // Update weekly averages
      const days = Object.values(updatedMealPlan.weeklyPlan);
      updatedMealPlan.weeklyTotals.averageCalories = 
        days.reduce((sum, d) => sum + d.dailyTotals.calories, 0) / days.length;
      
      setMealPlan(updatedMealPlan);
    }
  };

  const dayNameMap: Record<string, string> = {
    segunda: "Segunda-feira",
    terca: "Terça-feira",
    quarta: "Quarta-feira",
    quinta: "Quinta-feira",
    sexta: "Sexta-feira",
    sabado: "Sábado",
    domingo: "Domingo"
  };

  if (!mealPlan) {
    return (
      <div className="text-center p-6">
        <p className="text-gray-500">Nenhum plano alimentar disponível</p>
        <Button onClick={() => setMealPlan(createEmptyMealPlan())} className="mt-4">
          Criar Plano Vazio
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Plano Alimentar Semanal</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDownloadPDF}>
            Baixar PDF
          </Button>
          {onRefresh && (
            <Button variant="outline" onClick={handleRefresh}>
              Atualizar
            </Button>
          )}
        </div>
      </div>

      <Tabs value={selectedDay} onValueChange={setSelectedDay}>
        <TabsList className="mb-4">
          {Object.entries(dayNameMap).map(([day, dayName]) => (
            <TabsTrigger key={day} value={day}>
              {dayName}
            </TabsTrigger>
          ))}
        </TabsList>

        {Object.keys(dayNameMap).map(day => (
          <TabsContent key={day} value={day}>
            {mealPlan.weeklyPlan[day as keyof typeof mealPlan.weeklyPlan] && (
              <Card className="p-6">
                <h3 className="text-xl font-bold mb-4">
                  {mealPlan.weeklyPlan[day as keyof typeof mealPlan.weeklyPlan].dayName}
                </h3>
                
                {/* Café da Manhã */}
                <div className="mb-6">
                  <h4 className="text-lg font-semibold mb-2">Café da Manhã</h4>
                  <p className="text-gray-600 mb-2">
                    {mealPlan.weeklyPlan[day as keyof typeof mealPlan.weeklyPlan].meals.cafeDaManha.description}
                  </p>
                  <ul className="list-disc pl-5 mb-2">
                    {mealPlan.weeklyPlan[day as keyof typeof mealPlan.weeklyPlan].meals.cafeDaManha.foods.map((food, idx) => (
                      <li key={idx}>
                        {food.name} - {food.portion} {food.unit}
                        <p className="text-sm text-gray-500">{food.details}</p>
                      </li>
                    ))}
                  </ul>
                  <p className="text-sm">
                    <span className="font-medium">Calorias:</span> {mealPlan.weeklyPlan[day as keyof typeof mealPlan.weeklyPlan].meals.cafeDaManha.calories} kcal
                  </p>
                </div>
                
                {/* Lanche da Manhã */}
                <div className="mb-6">
                  <h4 className="text-lg font-semibold mb-2">Lanche da Manhã</h4>
                  <p className="text-gray-600 mb-2">
                    {mealPlan.weeklyPlan[day as keyof typeof mealPlan.weeklyPlan].meals.lancheDaManha.description}
                  </p>
                  <ul className="list-disc pl-5 mb-2">
                    {mealPlan.weeklyPlan[day as keyof typeof mealPlan.weeklyPlan].meals.lancheDaManha.foods.map((food, idx) => (
                      <li key={idx}>
                        {food.name} - {food.portion} {food.unit}
                        <p className="text-sm text-gray-500">{food.details}</p>
                      </li>
                    ))}
                  </ul>
                  <p className="text-sm">
                    <span className="font-medium">Calorias:</span> {mealPlan.weeklyPlan[day as keyof typeof mealPlan.weeklyPlan].meals.lancheDaManha.calories} kcal
                  </p>
                </div>
                
                {/* Almoço */}
                <div className="mb-6">
                  <h4 className="text-lg font-semibold mb-2">Almoço</h4>
                  <p className="text-gray-600 mb-2">
                    {mealPlan.weeklyPlan[day as keyof typeof mealPlan.weeklyPlan].meals.almoco.description}
                  </p>
                  <ul className="list-disc pl-5 mb-2">
                    {mealPlan.weeklyPlan[day as keyof typeof mealPlan.weeklyPlan].meals.almoco.foods.map((food, idx) => (
                      <li key={idx}>
                        {food.name} - {food.portion} {food.unit}
                        <p className="text-sm text-gray-500">{food.details}</p>
                      </li>
                    ))}
                  </ul>
                  <p className="text-sm">
                    <span className="font-medium">Calorias:</span> {mealPlan.weeklyPlan[day as keyof typeof mealPlan.weeklyPlan].meals.almoco.calories} kcal
                  </p>
                </div>
                
                {/* Lanche da Tarde */}
                <div className="mb-6">
                  <h4 className="text-lg font-semibold mb-2">Lanche da Tarde</h4>
                  <p className="text-gray-600 mb-2">
                    {mealPlan.weeklyPlan[day as keyof typeof mealPlan.weeklyPlan].meals.lancheDaTarde.description}
                  </p>
                  <ul className="list-disc pl-5 mb-2">
                    {mealPlan.weeklyPlan[day as keyof typeof mealPlan.weeklyPlan].meals.lancheDaTarde.foods.map((food, idx) => (
                      <li key={idx}>
                        {food.name} - {food.portion} {food.unit}
                        <p className="text-sm text-gray-500">{food.details}</p>
                      </li>
                    ))}
                  </ul>
                  <p className="text-sm">
                    <span className="font-medium">Calorias:</span> {mealPlan.weeklyPlan[day as keyof typeof mealPlan.weeklyPlan].meals.lancheDaTarde.calories} kcal
                  </p>
                </div>
                
                {/* Jantar */}
                <div className="mb-6">
                  <h4 className="text-lg font-semibold mb-2">Jantar</h4>
                  <p className="text-gray-600 mb-2">
                    {mealPlan.weeklyPlan[day as keyof typeof mealPlan.weeklyPlan].meals.jantar.description}
                  </p>
                  <ul className="list-disc pl-5 mb-2">
                    {mealPlan.weeklyPlan[day as keyof typeof mealPlan.weeklyPlan].meals.jantar.foods.map((food, idx) => (
                      <li key={idx}>
                        {food.name} - {food.portion} {food.unit}
                        <p className="text-sm text-gray-500">{food.details}</p>
                      </li>
                    ))}
                  </ul>
                  <p className="text-sm">
                    <span className="font-medium">Calorias:</span> {mealPlan.weeklyPlan[day as keyof typeof mealPlan.weeklyPlan].meals.jantar.calories} kcal
                  </p>
                </div>
                
                {/* Totais do Dia */}
                <div className="mt-8 pt-4 border-t">
                  <h4 className="text-lg font-semibold mb-3">Totais do Dia</h4>
                  <div className="grid grid-cols-5 gap-4 text-center">
                    <div>
                      <p className="text-sm text-gray-500">Calorias</p>
                      <p className="font-semibold">{mealPlan.weeklyPlan[day as keyof typeof mealPlan.weeklyPlan].dailyTotals.calories} kcal</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Proteínas</p>
                      <p className="font-semibold">{mealPlan.weeklyPlan[day as keyof typeof mealPlan.weeklyPlan].dailyTotals.protein}g</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Carboidratos</p>
                      <p className="font-semibold">{mealPlan.weeklyPlan[day as keyof typeof mealPlan.weeklyPlan].dailyTotals.carbs}g</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Gorduras</p>
                      <p className="font-semibold">{mealPlan.weeklyPlan[day as keyof typeof mealPlan.weeklyPlan].dailyTotals.fats}g</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Fibras</p>
                      <p className="font-semibold">{mealPlan.weeklyPlan[day as keyof typeof mealPlan.weeklyPlan].dailyTotals.fiber}g</p>
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Weekly Averages */}
      <Card className="p-6 mt-6">
        <h3 className="text-xl font-semibold mb-4">Médias Semanais</h3>
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

      {/* Recommendations */}
      {mealPlan.recommendations && (
        <Card className="p-6 mt-6">
          <h3 className="text-xl font-semibold mb-4">Recomendações</h3>
          
          <div className="mb-4">
            <h4 className="font-medium mb-2">Recomendações Gerais</h4>
            <p className="text-gray-700">{mealPlan.recommendations.general}</p>
          </div>
          
          <div className="mb-4">
            <h4 className="font-medium mb-2">Recomendações Pré-Treino</h4>
            <p className="text-gray-700">{mealPlan.recommendations.preworkout}</p>
          </div>
          
          <div className="mb-4">
            <h4 className="font-medium mb-2">Recomendações Pós-Treino</h4>
            <p className="text-gray-700">{mealPlan.recommendations.postworkout}</p>
          </div>
          
          {mealPlan.recommendations.timing && mealPlan.recommendations.timing.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Horários Recomendados</h4>
              <ul className="list-disc pl-5">
                {mealPlan.recommendations.timing.map((item, idx) => (
                  <li key={idx} className="text-gray-700">{item}</li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

export default MenuController;
