
import { useEffect } from "react";
import { toast } from "sonner";
import { useMenuController } from "@/components/menu/MenuController";
import { MenuLoader } from "@/components/menu/MenuLoader";
import { MenuSteps } from "@/components/menu/MenuSteps";
import { MenuPageHeader } from "@/components/menu/MenuPageHeader";

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
    handleConfirmFoodSelection,
    handleDietaryPreferences,
    setFormData,
    regenerateMealPlan,
  } = useMenuController();

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
      toast.info("Gerando novo plano alimentar...");
      await regenerateMealPlan();
      return Promise.resolve();
    } catch (error) {
      console.error('Erro ao atualizar cardápio:', error);
      toast.error("Erro ao atualizar o cardápio");
      return Promise.reject(error);
    }
  };

  if (loading) {
    return <MenuLoader />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 py-4 sm:py-8">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
          <MenuPageHeader />

          <MenuSteps 
            currentStep={currentStep}
            setCurrentStep={setCurrentStep}
            calorieNeeds={calorieNeeds}
            selectedFoods={selectedFoods}
            protocolFoods={protocolFoods}
            totalCalories={totalCalories}
            mealPlan={mealPlan}
            formData={formData}
            handleCalculateCalories={handleCalculateCalories}
            handleFoodSelection={handleFoodSelection}
            handleConfirmFoodSelection={handleConfirmFoodSelection}
            handleDietaryPreferences={handleDietaryPreferences}
            setFormData={setFormData}
            regenerateMealPlan={handleRefreshMealPlan}
          />
        </div>
      </div>
    </div>
  );
};

export default Menu;
