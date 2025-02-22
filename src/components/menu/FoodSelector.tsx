
import { Button } from "@/components/ui/button";
import { Coffee, Utensils, Apple, Moon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { useState } from "react";
import { createPayment, checkPaymentStatus } from "@/services/mercadopago";

interface ProtocolFood {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  food_group_id: number;
}

interface FoodSelectorProps {
  protocolFoods: ProtocolFood[];
  selectedFoods: string[];
  onFoodSelection: (foodId: string) => void;
  totalCalories: number;
  onBack: () => void;
  onConfirm: () => void;
}

const MealSection = ({
  title,
  icon,
  foods,
  selectedFoods,
  onFoodSelection,
  disabled
}: {
  title: string;
  icon: React.ReactNode;
  foods: ProtocolFood[];
  selectedFoods: string[];
  onFoodSelection: (foodId: string) => void;
  disabled?: boolean;
}) => (
  <Card className="p-6 space-y-4 shadow-lg hover:shadow-xl transition-shadow">
    <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
      <div className="bg-green-50 p-2 rounded-lg">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
    </div>
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {foods.map((food) => (
        <Button
          key={food.id}
          variant={selectedFoods.includes(food.id) ? "default" : "outline"}
          onClick={() => onFoodSelection(food.id)}
          disabled={disabled}
          className={`
            h-auto py-3 px-4 w-full text-left justify-start
            ${selectedFoods.includes(food.id)
              ? 'bg-green-100 border-green-500 text-green-700 hover:bg-green-200 hover:text-green-800'
              : 'hover:bg-green-50 hover:border-green-200'}
          `}
        >
          <span className="truncate">{food.name}</span>
        </Button>
      ))}
    </div>
  </Card>
);

export const FoodSelector = ({
  protocolFoods,
  selectedFoods,
  onFoodSelection,
  totalCalories,
  onBack,
  onConfirm,
}: FoodSelectorProps) => {
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [hasPaid, setHasPaid] = useState(false);

  const handlePaymentAndContinue = async () => {
    try {
      setIsProcessingPayment(true);
      const payment = await createPayment();
      
      // Abre o link de pagamento em uma nova janela
      window.open(payment.init_point, '_blank');

      // Inicia o polling para verificar o status do pagamento
      const checkInterval = setInterval(async () => {
        try {
          const isPaid = await checkPaymentStatus(payment.id);
          if (isPaid) {
            clearInterval(checkInterval);
            setHasPaid(true);
            toast.success("Pagamento confirmado! Você já pode selecionar os alimentos.");
          }
        } catch (error) {
          console.error('Erro ao verificar pagamento:', error);
        }
      }, 5000); // Verifica a cada 5 segundos

      // Para o polling após 10 minutos
      setTimeout(() => {
        clearInterval(checkInterval);
      }, 600000);

    } catch (error) {
      console.error('Erro ao processar pagamento:', error);
      toast.error("Erro ao processar pagamento. Por favor, tente novamente.");
    } finally {
      setIsProcessingPayment(false);
    }
  };

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
        <Card className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <div className="text-center space-y-4">
            <h3 className="text-xl font-semibold text-gray-800">
              Desbloqueie seu Plano Alimentar Personalizado
            </h3>
            <p className="text-gray-600">
              Por apenas R$ 19,90, tenha acesso ao seu plano alimentar personalizado com base nas suas preferências.
            </p>
            <Button
              onClick={handlePaymentAndContinue}
              disabled={isProcessingPayment}
              className="w-full max-w-md bg-green-500 hover:bg-green-600"
            >
              {isProcessingPayment ? 
                "Processando..." : 
                "Pagar R$ 19,90 e Continuar"
              }
            </Button>
          </div>
        </Card>
      )}

      <div className="space-y-6">
        <MealSection
          title="Café da manhã"
          icon={<Coffee className="h-6 w-6 text-green-600" />}
          foods={breakfastFoods}
          selectedFoods={selectedFoods}
          onFoodSelection={onFoodSelection}
          disabled={!hasPaid}
        />

        <MealSection
          title="Almoço"
          icon={<Utensils className="h-6 w-6 text-green-600" />}
          foods={lunchFoods}
          selectedFoods={selectedFoods}
          onFoodSelection={onFoodSelection}
          disabled={!hasPaid}
        />

        <MealSection
          title="Lanche da Manhã e Tarde"
          icon={<Apple className="h-6 w-6 text-green-600" />}
          foods={snackFoods}
          selectedFoods={selectedFoods}
          onFoodSelection={onFoodSelection}
          disabled={!hasPaid}
        />

        <MealSection
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
