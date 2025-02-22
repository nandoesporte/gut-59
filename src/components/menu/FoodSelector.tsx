
import { Button } from "@/components/ui/button";
import { Coffee, Utensils, Apple, Moon } from "lucide-react";
import { toast } from "sonner";
import { initMercadoPago } from "@mercadopago/sdk-react";
import { FoodSelectionSection } from "./components/FoodSelectionSection";
import { PaymentSection } from "./components/PaymentSection";
import { usePaymentHandling } from "./hooks/usePaymentHandling";
import type { FoodSelectorProps } from "./types/food";

// Initialize MercadoPago
initMercadoPago('TEST-5cc34aa1-d681-40a3-9b1a-5648d21af83b', {
  locale: 'pt-BR'
});

export const FoodSelector = ({
  protocolFoods,
  selectedFoods,
  onFoodSelection,
  totalCalories,
  onBack,
  onConfirm,
}: FoodSelectorProps) => {
  const {
    isProcessingPayment,
    preferenceId,
    hasPaid,
    handlePaymentAndContinue
  } = usePaymentHandling();

  const handleConfirm = async () => {
    if (!hasPaid) {
      toast.error("É necessário realizar o pagamento para continuar");
      return;
    }

    if (selectedFoods.length === 0) {
      toast.error("Selecione pelo menos um alimento");
      return;
    }

    onConfirm();
  };

  // Organizar alimentos por grupo
  const breakfastFoods = protocolFoods.filter(food => food.food_group_id === 1);
  const lunchFoods = protocolFoods.filter(food => food.food_group_id === 2);
  const snackFoods = protocolFoods.filter(food => food.food_group_id === 3);
  const dinnerFoods = protocolFoods.filter(food => food.food_group_id === 4);

  return (
    <div className="space-y-8 max-w-4xl mx-auto p-4">
      <div className="text-center space-y-3">
        <h2 className="text-2xl font-semibold text-gray-900">Opções de Preferência dos Alimentos</h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Selecione suas opções preferidas de alimentos para cada refeição. A IA utilizará suas escolhas para gerar um cardápio personalizado e balanceado.
        </p>
      </div>

      {!hasPaid && (
        <PaymentSection
          isProcessing={isProcessingPayment}
          preferenceId={preferenceId}
          onPayment={handlePaymentAndContinue}
        />
      )}

      <div className="space-y-6">
        <FoodSelectionSection
          title="Café da manhã"
          icon={<Coffee className="h-6 w-6 text-green-600" />}
          foods={breakfastFoods}
          selectedFoods={selectedFoods}
          onFoodSelection={onFoodSelection}
          disabled={!hasPaid}
        />

        <FoodSelectionSection
          title="Almoço"
          icon={<Utensils className="h-6 w-6 text-green-600" />}
          foods={lunchFoods}
          selectedFoods={selectedFoods}
          onFoodSelection={onFoodSelection}
          disabled={!hasPaid}
        />

        <FoodSelectionSection
          title="Lanche da Manhã e Tarde"
          icon={<Apple className="h-6 w-6 text-green-600" />}
          foods={snackFoods}
          selectedFoods={selectedFoods}
          onFoodSelection={onFoodSelection}
          disabled={!hasPaid}
        />

        <FoodSelectionSection
          title="Jantar"
          icon={<Moon className="h-6 w-6 text-green-600" />}
          foods={dinnerFoods}
          selectedFoods={selectedFoods}
          onFoodSelection={onFoodSelection}
          disabled={!hasPaid}
        />
      </div>

      <div className="sticky bottom-0 bg-white border-t pt-4 mt-8">
        <div className="flex justify-between gap-4 max-w-4xl mx-auto">
          <Button 
            variant="outline" 
            onClick={onBack}
            className="px-6"
          >
            Voltar
          </Button>
          <Button 
            disabled={!hasPaid || selectedFoods.length === 0} 
            onClick={handleConfirm}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white max-w-md"
          >
            Confirmar Seleção ({selectedFoods.length} alimentos)
          </Button>
        </div>
      </div>
    </div>
  );
};
