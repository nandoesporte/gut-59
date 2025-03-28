import { Button } from "@/components/ui/button";
import { Coffee, Utensils, Apple, Moon, AlertTriangle, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { usePaymentHandling } from "./hooks/usePaymentHandling";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ProtocolFood } from "./types";
import { FOOD_GROUP_MAP } from "./hooks/useProtocolFoods";

interface FoodSelectorProps {
  protocolFoods: ProtocolFood[];
  selectedFoods: string[];
  onFoodSelection: (foodId: string, food?: ProtocolFood) => void;
  totalCalories: number;
  onBack: () => void;
  onConfirm: () => Promise<boolean> | void;
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
  onFoodSelection: (foodId: string, food?: ProtocolFood) => void;
}) => (
  <Card className="p-6 space-y-4 shadow-lg hover:shadow-xl transition-shadow">
    <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
      <div className="bg-green-50 p-2 rounded-lg">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {foods.length > 0 ? (
        foods.map((food) => (
          <Button
            key={food.id}
            variant={selectedFoods.includes(food.id) ? "default" : "outline"}
            onClick={() => onFoodSelection(food.id, food)}
            className={`
              h-auto py-3 px-4 w-full text-left justify-start
              ${selectedFoods.includes(food.id)
                ? 'bg-green-100 border-green-500 text-green-700 hover:bg-green-200 hover:text-green-800'
                : 'hover:bg-green-50 hover:border-green-200'}
            `}
          >
            <span className="truncate">{food.name}</span>
          </Button>
        ))
      ) : (
        <div className="text-gray-500 text-center p-4 col-span-2">
          Nenhum alimento encontrado para esta categoria
        </div>
      )}
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
  const [isConfirming, setIsConfirming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const checkPaymentRequirement = async () => {
      try {
        const { data: paymentSettings, error: settingsError } = await supabase
          .from('payment_settings')
          .select('is_active')
          .eq('plan_type', 'nutrition')
          .single();

        if (settingsError) {
          console.error('Erro ao verificar configurações de pagamento:', settingsError);
          return;
        }

        if (!paymentSettings?.is_active) {
          setPaymentRequired(false);
          return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.id) return;

        const { data: planAccess } = await supabase
          .from('plan_access')
          .select('payment_required')
          .eq('user_id', user.id)
          .eq('plan_type', 'nutrition')
          .maybeSingle();

        setPaymentRequired(planAccess?.payment_required !== false);
      } catch (error) {
        console.error('Erro ao verificar requisito de pagamento:', error);
      }
    };

    checkPaymentRequirement();
  }, []);

  useEffect(() => {
    console.log("FoodSelector rendered with:", {
      foodsCount: protocolFoods.length,
      selectedFoodsCount: selectedFoods.length,
      breakfastFoods: protocolFoods.filter(f => f.food_group_id === 1).length,
      lunchFoods: protocolFoods.filter(f => f.food_group_id === 2).length,
      snackFoods: protocolFoods.filter(f => f.food_group_id === 3).length,
      dinnerFoods: protocolFoods.filter(f => f.food_group_id === 4).length
    });
  }, [protocolFoods, selectedFoods]);

  const handleConfirm = async () => {
    console.log("Botão Confirmar Seleção clicado");
    
    if (isConfirming) {
      console.log("Botão já foi clicado, evitando duplo clique");
      return;
    }
    
    if (selectedFoods.length === 0) {
      toast.error("Selecione pelo menos um alimento");
      return;
    }

    if (paymentRequired && !hasPaid) {
      setShowPaymentDialog(true);
      return;
    }

    try {
      console.log("Chamando função onConfirm...");
      setIsConfirming(true);
      toast.loading("Processando sua seleção...");
      
      document.querySelectorAll('button').forEach(btn => {
        if (btn.textContent?.includes('Confirmar Seleção')) {
          btn.setAttribute('disabled', 'true');
        }
      });
      
      const result = await onConfirm();
      
      console.log("Resultado da função onConfirm:", result);
      
      if (result === false) {
        console.error("Falha ao confirmar seleção de alimentos");
        toast.error("Erro ao salvar suas preferências alimentares. Tente novamente.");
      } else {
        console.log("Confirmação de seleção de alimentos bem-sucedida");
        toast.success("Seleção confirmada com sucesso!");
      }
    } catch (error) {
      console.error("Erro ao processar a confirmação:", error);
      toast.error("Erro ao processar sua seleção. Tente novamente.");
    } finally {
      setIsConfirming(false);
      document.querySelectorAll('button').forEach(btn => {
        if (btn.textContent?.includes('Confirmar Seleção')) {
          btn.removeAttribute('disabled');
        }
      });
    }
  };

  const breakfastFoods = protocolFoods.filter(food => food.food_group_id === 1);
  const morningSnackFoods = protocolFoods.filter(food => food.food_group_id === 2);
  const lunchFoods = protocolFoods.filter(food => food.food_group_id === 3);
  const afternoonSnackFoods = protocolFoods.filter(food => food.food_group_id === 4);
  const dinnerFoods = protocolFoods.filter(food => food.food_group_id === 5);
  
  const uncategorizedFoods = protocolFoods.filter(food => food.food_group_id === null);

  const hasBreakfastFoods = breakfastFoods.length > 0;
  const hasMorningSnackFoods = morningSnackFoods.length > 0;
  const hasLunchFoods = lunchFoods.length > 0;
  const hasAfternoonSnackFoods = afternoonSnackFoods.length > 0;
  const hasDinnerFoods = dinnerFoods.length > 0;
  const hasUncategorizedFoods = uncategorizedFoods.length > 0;

  const hasFoods = protocolFoods.length > 0;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-gray-600">Carregando opções de alimentos...</p>
      </div>
    );
  }

  if (!hasFoods) {
    return (
      <div className="space-y-8 w-full pb-24">
        <div className="text-center space-y-3">
          <h2 className="text-2xl font-semibold text-gray-900">Opções de Preferência dos Alimentos</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Selecione suas opções preferidas de alimentos para cada refeição. A IA utilizará suas escolhas para gerar um cardápio personalizado e balanceado.
          </p>
        </div>

        <Card className="p-8 text-center space-y-4">
          <div className="flex justify-center">
            <AlertTriangle size={48} className="text-yellow-500" />
          </div>
          <h3 className="text-xl font-semibold">Nenhum alimento encontrado</h3>
          <p className="text-gray-600">
            Não foi possível carregar os alimentos do banco de dados. Por favor, tente novamente ou entre em contato com o suporte.
          </p>
          <Button
            onClick={onBack}
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            Voltar
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 w-full pb-24">
      <div className="text-center space-y-3">
        <h2 className="text-2xl font-semibold text-gray-900">Opções de Preferência dos Alimentos</h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Selecione suas opções preferidas de alimentos para cada refeição. A IA utilizará suas escolhas para gerar um cardápio personalizado e balanceado.
        </p>
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 max-w-xl mx-auto">
          <p className="text-sm text-yellow-700">
            <strong>Dica:</strong> Após selecionar seus alimentos preferidos, clique no botão "Confirmar Seleção" 
            no final da página ou na barra inferior para avançar para a próxima etapa.
          </p>
        </div>
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
        {hasBreakfastFoods && (
          <MealSection
            title="Café da Manhã"
            icon={<Coffee className="h-6 w-6 text-green-600" />}
            foods={breakfastFoods}
            selectedFoods={selectedFoods}
            onFoodSelection={onFoodSelection}
          />
        )}

        {hasMorningSnackFoods && (
          <MealSection
            title="Lanche da Manhã"
            icon={<Apple className="h-6 w-6 text-green-600" />}
            foods={morningSnackFoods}
            selectedFoods={selectedFoods}
            onFoodSelection={onFoodSelection}
          />
        )}

        {hasLunchFoods && (
          <MealSection
            title="Almoço"
            icon={<Utensils className="h-6 w-6 text-green-600" />}
            foods={lunchFoods}
            selectedFoods={selectedFoods}
            onFoodSelection={onFoodSelection}
          />
        )}

        {hasAfternoonSnackFoods && (
          <MealSection
            title="Lanche da Tarde"
            icon={<Apple className="h-6 w-6 text-green-600" />}
            foods={afternoonSnackFoods}
            selectedFoods={selectedFoods}
            onFoodSelection={onFoodSelection}
          />
        )}

        {hasDinnerFoods && (
          <MealSection
            title="Jantar"
            icon={<Moon className="h-6 w-6 text-green-600" />}
            foods={dinnerFoods}
            selectedFoods={selectedFoods}
            onFoodSelection={onFoodSelection}
          />
        )}

        {hasUncategorizedFoods && (
          <MealSection
            title="Outros Alimentos"
            icon={<Utensils className="h-6 w-6 text-gray-600" />}
            foods={uncategorizedFoods}
            selectedFoods={selectedFoods}
            onFoodSelection={onFoodSelection}
          />
        )}
      </div>

      {hasFoods && !hasBreakfastFoods && !hasMorningSnackFoods && !hasLunchFoods && 
       !hasAfternoonSnackFoods && !hasDinnerFoods && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Nenhum alimento categorizado encontrado</h3>
          <p className="text-gray-600">
            Existem alimentos no banco de dados, mas eles não estão categorizados por tipo de refeição.
            Acesse o painel administrativo para categorizar os alimentos.
          </p>
        </div>
      )}

      <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 text-center">
        <p className="text-sm text-green-700 mb-3">
          <strong>Você selecionou {selectedFoods.length} alimentos.</strong><br/>
          Clique abaixo para confirmar sua seleção e prosseguir para a próxima etapa.
        </p>
        <Button 
          onClick={handleConfirm}
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 text-base sm:text-lg font-bold rounded-md shadow-sm w-full sm:w-auto"
          size="lg"
          disabled={isConfirming}
        >
          {isConfirming ? "Processando..." : "✓ Confirmar Seleção e Continuar"}
        </Button>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t py-3 px-3 md:px-8 shadow-md z-10">
        <div className="max-w-4xl mx-auto flex justify-between items-center gap-2 sm:gap-4">
          <Button 
            variant="outline" 
            onClick={onBack}
            className="shrink-0 text-xs sm:text-sm"
            disabled={isConfirming}
          >
            Voltar
          </Button>
          <Button 
            onClick={handleConfirm}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold text-xs sm:text-sm rounded-md"
            size="default"
            disabled={isConfirming}
          >
            {isConfirming ? "Processando..." : `Confirmar (${selectedFoods.length})`}
          </Button>
        </div>
      </div>
    </div>
  );
};
