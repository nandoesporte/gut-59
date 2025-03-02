
import { Card } from "@/components/ui/card";
import { InitialMenuContent } from "@/components/menu/InitialMenuContent";
import { CalorieCalculatorStep } from "@/components/menu/CalorieCalculatorStep";
import { FoodSelector } from "@/components/menu/FoodSelector";
import { DietaryPreferencesForm } from "@/components/menu/DietaryPreferencesForm";
import { MealPlanDisplay } from "@/components/menu/MealPlanDisplay";
import { MealPlanHistory } from "@/components/menu/MealPlanHistory";
import { MenuHeader } from "@/components/menu/MenuHeader";
import { useMenuController } from "@/components/menu/MenuController";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useRef } from "react";
import type { DietaryPreferences } from "@/components/menu/types";

const Menu = () => {
  const mealPlanRef = useRef<HTMLDivElement>(null);
  const restrictionsCardRef = useRef<HTMLDivElement>(null);
  
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
    handleConfirmFoodSelection,
    handleDietaryPreferences,
    setFormData,
  } = useMenuController();

  // Auto-scroll to meal plan when it's generated
  useEffect(() => {
    if (mealPlan && mealPlanRef.current) {
      console.log("Scrolling to meal plan section");
      mealPlanRef.current.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }
  }, [mealPlan]);
  
  // Auto-scroll to restrictions card when moving to step 3
  useEffect(() => {
    if (currentStep === 3 && restrictionsCardRef.current) {
      console.log("Scrolling to restrictions section");
      restrictionsCardRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  }, [currentStep]);

  // Debug para verificar as transições de etapa
  useEffect(() => {
    console.log("Etapa atual:", currentStep);
    console.log("Plano de refeição disponível:", !!mealPlan);
    if (mealPlan) {
      console.log("Detalhes do plano:", {
        temPlanoSemanal: !!mealPlan.weeklyPlan,
        diasDisponiveis: mealPlan.weeklyPlan ? Object.keys(mealPlan.weeklyPlan) : []
      });
    }
  }, [currentStep, mealPlan]);

  const handleRefreshMealPlan = async () => {
    try {
      // Se houver função para gerar novo plano, poderia ser chamada aqui
      // Por enquanto vamos apenas mostrar uma mensagem
      toast.info("Funcionalidade de atualização em desenvolvimento");
      return Promise.resolve();
    } catch (error) {
      console.error('Erro ao atualizar cardápio:', error);
      toast.error("Erro ao atualizar o cardápio");
      return Promise.reject(error);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <div className="text-center px-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Gerando seu plano alimentar personalizado...
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Este processo pode levar de 1 a 2 minutos.
            <br />
            Por favor, aguarde enquanto preparamos seu cardápio.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 py-4 sm:py-8">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Monte sua Dieta Personalizada</h1>
            <p className="text-gray-600 text-sm sm:text-base">Siga as etapas abaixo para criar seu plano alimentar</p>
          </div>

          <div className="space-y-6 sm:space-y-8">
            {/* Etapa 1: Cálculo de Calorias */}
            <Card className="p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold mb-4 flex items-center">
                <span className={`bg-${currentStep >= 1 ? 'green' : 'gray'}-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-2`}>1</span>
                Dados Básicos e Calorias
              </h2>
              {currentStep === 1 && (
                <CalorieCalculatorStep
                  formData={formData}
                  onInputChange={(field, value) => setFormData(prev => ({ ...prev, [field]: value }))}
                  onCalculate={handleCalculateCalories}
                  calorieNeeds={calorieNeeds}
                />
              )}
              {currentStep > 1 && (
                <div className="text-center py-2">
                  <p className="text-green-600 font-medium">✓ Calorias diárias calculadas: {calorieNeeds} kcal</p>
                  <button 
                    onClick={() => setCurrentStep(1)} 
                    className="text-sm text-gray-500 underline mt-2"
                  >
                    Editar
                  </button>
                </div>
              )}
            </Card>

            {/* Etapa 2: Seleção de Alimentos */}
            <Card className={`p-4 sm:p-6 ${currentStep < 2 ? 'opacity-70' : ''}`}>
              <h2 className="text-lg sm:text-xl font-semibold mb-4 flex items-center">
                <span className={`bg-${currentStep >= 2 ? 'green' : 'gray'}-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-2`}>2</span>
                Preferências Alimentares
              </h2>
              {currentStep === 2 && (
                <FoodSelector
                  protocolFoods={protocolFoods}
                  selectedFoods={selectedFoods}
                  onFoodSelection={handleFoodSelection}
                  totalCalories={totalCalories}
                  onBack={() => setCurrentStep(1)}
                  onConfirm={handleConfirmFoodSelection}
                />
              )}
              {currentStep > 2 && (
                <div className="text-center py-2">
                  <p className="text-green-600 font-medium">✓ {selectedFoods.length} alimentos selecionados</p>
                  <button 
                    onClick={() => setCurrentStep(2)} 
                    className="text-sm text-gray-500 underline mt-2"
                  >
                    Editar
                  </button>
                </div>
              )}
            </Card>

            {/* Etapa 3: Preferências Dietéticas */}
            <div ref={restrictionsCardRef}>
              <Card className={`p-4 sm:p-6 ${currentStep < 3 ? 'opacity-70' : ''}`}>
                <h2 className="text-lg sm:text-xl font-semibold mb-4 flex items-center">
                  <span className={`bg-${currentStep >= 3 ? 'green' : 'gray'}-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-2`}>3</span>
                  Restrições e Preferências
                </h2>
                {currentStep === 3 && (
                  <DietaryPreferencesForm
                    onSubmit={handleDietaryPreferences}
                    onBack={() => setCurrentStep(2)}
                  />
                )}
                {currentStep > 3 && (
                  <div className="text-center py-2">
                    <p className="text-green-600 font-medium">✓ Preferências dietéticas registradas</p>
                    <button 
                      onClick={() => setCurrentStep(3)} 
                      className="text-sm text-gray-500 underline mt-2"
                    >
                      Editar
                    </button>
                  </div>
                )}
              </Card>
            </div>

            {/* Etapa 4: Exibição do Plano */}
            {currentStep === 4 && mealPlan && (
              <div ref={mealPlanRef}>
                <Card className="p-4 sm:p-6">
                  <h2 className="text-lg sm:text-xl font-semibold mb-4 flex items-center">
                    <span className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-2">4</span>
                    Seu Plano Alimentar
                  </h2>
                  <MealPlanDisplay
                    mealPlan={mealPlan}
                    onRefresh={handleRefreshMealPlan}
                  />
                </Card>
              </div>
            )}

            {/* Histórico de Planos */}
            <MealPlanHistory />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Menu;
