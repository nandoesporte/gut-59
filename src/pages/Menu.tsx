
import { Card } from "@/components/ui/card";
import { InitialMenuContent } from "@/components/menu/InitialMenuContent";
import { CalorieCalculatorStep } from "@/components/menu/CalorieCalculatorStep";
import { FoodSelector } from "@/components/menu/FoodSelector";
import { DietaryPreferencesForm } from "@/components/menu/DietaryPreferencesForm";
import { MealPlanDisplay } from "@/components/menu/MealPlanDisplay";
import { MenuHeader } from "@/components/menu/MenuHeader";
import { useMenuController } from "@/components/menu/MenuController";
import { Loader2 } from "lucide-react";
import { MealPlanHistory } from "@/components/menu/MealPlanHistory";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Menu = () => {
  const {
    currentStep,
    setCurrentStep,
    calorieNeeds,
    selectedFoods,
    protocolFoods,
    totalCalories,
    mealPlan,
    formData,
    loading,
    handleCalculateCalories,
    handleFoodSelection,
    handleDietaryPreferences,
    setFormData,
  } = useMenuController();

  const [historyPlans, setHistoryPlans] = useState<any[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);

  const fetchMealPlans = useCallback(async () => {
    try {
      setIsHistoryLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      
      if (!userData.user) {
        toast.error("Usuário não autenticado");
        return;
      }

      const { data, error } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('user_id', userData.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setHistoryPlans(data || []);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
      toast.error("Erro ao carregar histórico de planos alimentares");
    } finally {
      setIsHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMealPlans();
  }, [fetchMealPlans]);

  const renderStep = () => {
    if (loading && currentStep !== 1.5) {
      return (
        <div className="w-full flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-green-500" />
        </div>
      );
    }

    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-8">
            <MenuHeader onStart={() => setCurrentStep(1.5)} />
            <MealPlanHistory 
              isLoading={isHistoryLoading}
              historyPlans={historyPlans}
              onRefresh={fetchMealPlans}
            />
            <InitialMenuContent onStartDiet={() => setCurrentStep(1.5)} />
          </div>
        );
      case 1.5:
        return (
          <CalorieCalculatorStep
            formData={formData}
            onInputChange={(field, value) => setFormData(prev => ({ ...prev, [field]: value }))}
            onCalculate={handleCalculateCalories}
            calorieNeeds={calorieNeeds}
          />
        );
      case 2:
        return (
          <FoodSelector
            protocolFoods={protocolFoods}
            selectedFoods={selectedFoods}
            onFoodSelection={handleFoodSelection}
            totalCalories={totalCalories}
            onBack={() => setCurrentStep(1.5)}
            onConfirm={() => setCurrentStep(3)}
          />
        );
      case 3:
        return (
          <DietaryPreferencesForm
            onSubmit={handleDietaryPreferences}
            onBack={() => setCurrentStep(2)}
          />
        );
      case 4:
        return (
          <div className="space-y-8">
            {mealPlan ? (
              <div>
                <MealPlanDisplay 
                  mealPlan={mealPlan} 
                  onRefresh={fetchMealPlans} 
                />
              </div>
            ) : (
              <Card className="p-6">
                <div className="text-center text-gray-500">
                  Aguarde enquanto geramos seu plano alimentar...
                </div>
              </Card>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {renderStep()}
        </div>
      </div>
    </div>
  );
};

export default Menu;
