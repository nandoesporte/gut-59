
import { Card } from "@/components/ui/card";
import { InitialMenuContent } from "@/components/menu/InitialMenuContent";
import { CalorieCalculatorStep } from "@/components/menu/CalorieCalculatorStep";
import { FoodSelector } from "@/components/menu/FoodSelector";
import { DietaryPreferencesForm } from "@/components/menu/DietaryPreferencesForm";
import { MealPlanDisplay } from "@/components/menu/MealPlanDisplay";
import { MealPlanHistory } from "@/components/menu/MealPlanHistory";
import { MenuHeader } from "@/components/menu/MenuHeader";
import { useMenuController } from "@/components/menu/hooks/useMenuController";
import { Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useRef } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { type MenuStep } from "@/components/menu/types";

const Menu = () => {
  const mealPlanRef = useRef<HTMLDivElement>(null);
  const restrictionsCardRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  
  const {
    currentStep,
    setCurrentStep,
    isStepCompleted,
    mealPlan,
    isGenerating,
    userData,
    protocolFoods,
    selectedFoods,
    toggleFoodSelection,
    selectedFoodCount,
    loading,
    isLoadingFoods,
    foodsError,
    dietaryPreferences,
    formData,
    setFormData,
    calorieNeeds,
    handleCaloriesCalculated,
    handleFoodSelection,
    handleConfirmFoodSelection,
    handleDietaryPreferences,
    handleReset
  } = useMenuController();

  useEffect(() => {
    if (mealPlan && mealPlanRef.current) {
      console.log("Scrolling to meal plan section");
      mealPlanRef.current.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }
  }, [mealPlan]);
  
  useEffect(() => {
    if (currentStep === 'preferences' && restrictionsCardRef.current) {
      console.log("Scrolling to restrictions section");
      restrictionsCardRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  }, [currentStep]);

  useEffect(() => {
    console.log("Current step:", currentStep);
    console.log("Protocol foods count:", protocolFoods.length);
    console.log("Selected foods count:", selectedFoods.length);
    
    if (currentStep === 'foods') {
      console.log("Step 2 (food selection) is active");
      if (protocolFoods.length === 0) {
        console.log("Warning: No foods available for selection");
      }
    }
    
    if (mealPlan) {
      console.log("Plan has weeklyPlan?", !!mealPlan.weeklyPlan);
      console.log("Meal plan available:", {
        hasWeeklyPlan: !!mealPlan.weeklyPlan,
        availableDays: mealPlan.weeklyPlan ? Object.keys(mealPlan.weeklyPlan) : [],
        generatedBy: mealPlan.generatedBy || "unknown"
      });
    }
  }, [currentStep, protocolFoods, selectedFoods, mealPlan]);

  const handleRefreshMealPlan = async (): Promise<void> => {
    try {
      console.log("Refreshing meal plan");
      
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.warning("Faça login para gerar um novo plano");
        return;
      }
      
      // Reset to food selection step
      setCurrentStep('foods');
      
      toast.info("Voltando para seleção de alimentos. Você pode escolher novos alimentos para seu plano.");
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
            Por favor, aguarde enquanto o Nutri+ prepara seu cardápio.
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
            <p className="text-gray-600 text-sm sm:text-base">Siga as etapas abaixo para criar seu plano alimentar com o Nutri+</p>
          </div>

          <div className="space-y-6 sm:space-y-8">
            <Card className="p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold mb-4 flex items-center">
                <span className={`bg-${currentStep === 'calculator' || currentStep === 'foods' || currentStep === 'preferences' || currentStep === 'result' ? 'green' : 'gray'}-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-2`}>1</span>
                Dados Básicos e Calorias
              </h2>
              {currentStep === 'calculator' && (
                <CalorieCalculatorStep
                  formData={formData}
                  onInputChange={(field, value) => {
                    setFormData({
                      ...formData,
                      [field]: value
                    });
                  }}
                  onCalculate={handleCaloriesCalculated}
                  calorieNeeds={calorieNeeds}
                />
              )}
              {(currentStep === 'foods' || currentStep === 'preferences' || currentStep === 'result') && (
                <div className="text-center py-2">
                  <p className="text-green-600 font-medium">✓ Calorias diárias calculadas: {calorieNeeds} kcal</p>
                  <button 
                    onClick={() => setCurrentStep('calculator')} 
                    className="text-sm text-gray-500 underline mt-2 px-4 py-1 rounded-md hover:bg-gray-100 transition-colors"
                  >
                    Editar
                  </button>
                </div>
              )}
            </Card>

            <Card className={`p-4 sm:p-6 ${currentStep === 'initial' || currentStep === 'calculator' ? 'opacity-70' : ''}`}>
              <h2 className="text-lg sm:text-xl font-semibold mb-4 flex items-center">
                <span className={`bg-${currentStep === 'foods' || currentStep === 'preferences' || currentStep === 'result' ? 'green' : 'gray'}-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-2`}>2</span>
                Preferências Alimentares
              </h2>
              {currentStep === 'foods' && (
                <>
                  {foodsError ? (
                    <div className="p-6 text-center">
                      <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">Erro ao carregar alimentos</h3>
                      <p className="text-gray-600 mb-4">
                        {foodsError instanceof Error ? foodsError.message : 'Não foi possível carregar a lista de alimentos do banco de dados.'}
                      </p>
                      <button 
                        onClick={() => window.location.reload()} 
                        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-full w-full sm:w-auto"
                      >
                        Tentar Novamente
                      </button>
                    </div>
                  ) : protocolFoods.length === 0 ? (
                    <div className="p-6 text-center">
                      <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">Sem dados de alimentos</h3>
                      <p className="text-gray-600 mb-4">
                        Não foi possível carregar a lista de alimentos do banco de dados. Por favor, verifique se existem alimentos cadastrados no painel administrativo.
                      </p>
                      <button 
                        onClick={() => window.location.reload()} 
                        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-full w-full sm:w-auto"
                      >
                        Tentar Novamente
                      </button>
                    </div>
                  ) : (
                    <FoodSelector
                      protocolFoods={protocolFoods}
                      selectedFoods={selectedFoods}
                      onFoodSelection={handleFoodSelection}
                      totalCalories={0}
                      onBack={() => setCurrentStep('calculator')}
                      onConfirm={handleConfirmFoodSelection}
                    />
                  )}
                </>
              )}
              {(currentStep === 'preferences' || currentStep === 'result') && (
                <div className="text-center py-2">
                  <p className="text-green-600 font-medium">✓ {selectedFoods.length} alimentos selecionados</p>
                  <button 
                    onClick={() => setCurrentStep('foods')} 
                    className="text-sm text-gray-500 underline mt-2 px-4 py-1 rounded-md hover:bg-gray-100 transition-colors"
                  >
                    Editar
                  </button>
                </div>
              )}
            </Card>

            <div ref={restrictionsCardRef}>
              <Card id="dietary-restrictions-section" className={`p-4 sm:p-6 ${currentStep === 'initial' || currentStep === 'calculator' || currentStep === 'foods' ? 'opacity-70' : ''}`}>
                <h2 className="text-lg sm:text-xl font-semibold mb-4 flex items-center">
                  <span className={`bg-${currentStep === 'preferences' || currentStep === 'result' ? 'green' : 'gray'}-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-2`}>3</span>
                  Restrições e Preferências
                </h2>
                {currentStep === 'preferences' && (
                  <DietaryPreferencesForm
                    onSubmit={handleDietaryPreferences}
                    onBack={() => setCurrentStep('foods')}
                  />
                )}
                {currentStep === 'result' && (
                  <div className="text-center py-2">
                    <p className="text-green-600 font-medium">✓ Preferências dietéticas registradas</p>
                    <button 
                      onClick={() => setCurrentStep('preferences')} 
                      className="text-sm text-gray-500 underline mt-2 px-4 py-1 rounded-md hover:bg-gray-100 transition-colors"
                    >
                      Editar
                    </button>
                  </div>
                )}
              </Card>
            </div>

            {currentStep === 'result' && mealPlan && (
              <div ref={mealPlanRef}>
                <Card className="p-4 sm:p-6">
                  <h2 className="text-lg sm:text-xl font-semibold mb-4 flex items-center">
                    <span className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-2">4</span>
                    Seu Plano Alimentar Personalizado
                  </h2>
                  <MealPlanDisplay
                    mealPlan={mealPlan}
                    onRefresh={handleRefreshMealPlan}
                  />
                </Card>
              </div>
            )}

            <MealPlanHistory />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Menu;
