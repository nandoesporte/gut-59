
import * as React from "react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCcw, Download } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { NutriPreferences, MealPlan } from "./types";
import { toast } from "sonner";

interface NutriPlanDisplayProps {
  preferences: NutriPreferences;
  onReset: () => void;
}

export const NutriPlanDisplay = ({ preferences, onReset }: NutriPlanDisplayProps) => {
  const { data: plan, isLoading } = useQuery({
    queryKey: ['nutri-plan', preferences],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Usuário não autenticado");

      const response = await supabase.functions.invoke('generate-meal-plan', {
        body: { preferences, userId: userData.user.id }
      });

      if (response.error) throw response.error;
      return response.data as MealPlan;
    }
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
            <p>Gerando seu plano nutricional personalizado...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!plan) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-gray-500">
            Erro ao gerar o plano nutricional. Por favor, tente novamente.
          </p>
          <Button onClick={onReset} className="mt-4 w-full">
            Tentar Novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Seu Plano Nutricional</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onReset}>
            <RefreshCcw className="w-4 h-4 mr-2" />
            Refazer
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Baixar PDF
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Necessidade Calórica Diária: {plan.totalCalories} kcal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {Object.entries(plan.meals).map(([mealName, meal]) => (
            <div key={mealName} className="space-y-2">
              <h3 className="font-semibold text-lg capitalize">{mealName}</h3>
              <p className="text-sm text-gray-500">{meal.calories} kcal</p>
              <div className="space-y-2">
                {meal.foods.map((food, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{food.name}</p>
                      <p className="text-sm text-gray-500">
                        {food.portion}g • {food.calories} kcal
                      </p>
                    </div>
                    <div className="text-sm text-gray-500">
                      <p>Carb: {food.macros.carbs}g</p>
                      <p>Prot: {food.macros.protein}g</p>
                      <p>Gord: {food.macros.fats}g</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};
