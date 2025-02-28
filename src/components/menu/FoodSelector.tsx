
import { Button } from "@/components/ui/button";
import { Coffee, Utensils, Apple, Moon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { usePaymentHandling } from "./hooks/usePaymentHandling";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

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
  onFoodSelection
}: {
  title: string;
  icon: React.ReactNode;
  foods: ProtocolFood[];
  selectedFoods: string[];
  onFoodSelection: (foodId: string) => void;
}) => (
  <Card className="p-6 space-y-4 shadow-lg hover:shadow-xl transition-shadow">
    <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
      <div className="bg-green-50 p-2 rounded-lg">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {foods.map((food) => (
        <Button
          key={food.id}
          variant={selectedFoods.includes(food.id) ? "default" : "outline"}
          onClick={() => onFoodSelection(food.id)}
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
  const { isProcessingPayment, hasPaid, handlePaymentAndContinue } = usePaymentHandling();
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentRequired, setPaymentRequired] = useState(true);

  useEffect(() => {
    const checkPaymentRequirement = async () => {
      try {
        // Verificar configuração global de pagamento
        const { data: paymentSettings, error: settingsError } = await supabase
          .from('payment_settings')
          .select('is_active')
          .eq('plan_type', 'nutrition')
          .single();

        if (settingsError) {
          console.error('Erro ao verificar configurações de pagamento:', settingsError);
          return;
        }

        // Se o pagamento não estiver ativo globalmente
        if (!paymentSettings?.is_active) {
          setPaymentRequired(false);
          return;
        }

        // Verificar acesso específico do usuário
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.id) return;

        const { data: planAccess } = await supabase
          .from('plan_access')
          .select('payment_required')
          .eq('user_id', user.id)
          .eq('plan_type', 'nutrition')
          .maybeSingle();

        // Se o usuário tiver acesso especial sem necessidade de pagamento
        setPaymentRequired(planAccess?.payment_required !== false);
      } catch (error) {
        console.error('Erro ao verificar requisito de pagamento:', error);
      }
    };

    checkPaymentRequirement();
  }, []);

  const handleConfirm = async () => {
    if (selectedFoods.length === 0) {
      toast.error("Selecione pelo menos um alimento");
      return;
    }

    if (paymentRequired && !hasPaid) {
      setShowPaymentDialog(true);
      return;
    }

    // Salvar os alimentos selecionados e prosseguir
    onConfirm();
  };

  const breakfastFoods = protocolFoods.filter(food => food.food_group_id === 1);
  const lunchFoods = protocolFoods.filter(food => food.food_group_id === 2);
  const snackFoods = protocolFoods.filter(food => food.food_group_id === 3);
  const dinnerFoods = protocolFoods.filter(food => food.food_group_id === 4);

  return (
    <div className="space-y-8 w-full">
      <div className="text-center space-y-3">
        <h2 className="text-2xl font-semibold text-gray-900">Opções de Preferência dos Alimentos</h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Selecione suas opções preferidas de alimentos para cada refeição. A IA utilizará suas escolhas para gerar um cardápio personalizado e balanceado.
        </p>
      </div>

      {paymentRequired && (
        <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Desbloqueie seu Plano Alimentar Personalizado</DialogTitle>
            </DialogHeader>
            <div className="text-center space-y-4 py-4">
              <p className="text-gray-600">
                Por apenas R$ 19,90, tenha acesso ao seu plano alimentar personalizado com base nas suas preferências.
              </p>
              <Button
                onClick={() => {
                  handlePaymentAndContinue();
                  setShowPaymentDialog(false);
                }}
                disabled={isProcessingPayment}
                className="w-full max-w-md bg-green-500 hover:bg-green-600"
              >
                {isProcessingPayment ? 
                  "Processando..." : 
                  "Pagar R$ 19,90 e Continuar"
                }
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <div className="space-y-6">
        <MealSection
          title="Café da manhã"
          icon={<Coffee className="h-6 w-6 text-green-600" />}
          foods={breakfastFoods}
          selectedFoods={selectedFoods}
          onFoodSelection={onFoodSelection}
        />

        <MealSection
          title="Almoço"
          icon={<Utensils className="h-6 w-6 text-green-600" />}
          foods={lunchFoods}
          selectedFoods={selectedFoods}
          onFoodSelection={onFoodSelection}
        />

        <MealSection
          title="Lanche da Manhã e Tarde"
          icon={<Apple className="h-6 w-6 text-green-600" />}
          foods={snackFoods}
          selectedFoods={selectedFoods}
          onFoodSelection={onFoodSelection}
        />

        <MealSection
          title="Jantar"
          icon={<Moon className="h-6 w-6 text-green-600" />}
          foods={dinnerFoods}
          selectedFoods={selectedFoods}
          onFoodSelection={onFoodSelection}
        />
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t py-4 px-4 md:px-8">
        <div className="max-w-4xl mx-auto flex justify-between items-center gap-4">
          <Button 
            variant="outline" 
            onClick={onBack}
            className="shrink-0"
          >
            Voltar
          </Button>
          <Button 
            onClick={handleConfirm}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white max-w-sm"
          >
            Confirmar Seleção ({selectedFoods.length} alimentos)
          </Button>
        </div>
      </div>
    </div>
  );
};
