
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, FileClock, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { SavedMealPlanDetails } from "./components/SavedMealPlanDetails";
import { toast } from "sonner";

export const MealPlanHistory = () => {
  const [savedPlans, setSavedPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    fetchSavedPlans();
  }, []);

  const fetchSavedPlans = async () => {
    setLoading(true);
    try {
      console.log("Fetching saved meal plans from database...");
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log("No authenticated user found, skipping meal plan history fetch");
        setLoading(false);
        return;
      }
      
      const { data: plans, error } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) {
        console.error("Error fetching meal plans:", error);
        toast.error("Erro ao carregar histórico de planos alimentares");
      } else {
        console.log(`Fetched ${plans?.length || 0} saved meal plans`);
        setSavedPlans(plans || []);
      }
    } catch (err) {
      console.error("Unexpected error fetching meal plans:", err);
      toast.error("Erro ao carregar histórico de planos alimentares");
    } finally {
      setLoading(false);
    }
  };

  const handleViewPlan = (plan: any) => {
    setSelectedPlan(plan);
    setShowDetails(true);
  };

  const handleClose = () => {
    setShowDetails(false);
    setSelectedPlan(null);
  };

  if (loading) {
    return (
      <Card className="p-6 text-center">
        <div className="flex items-center justify-center space-x-2">
          <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
          <span className="text-gray-500">Carregando histórico...</span>
        </div>
      </Card>
    );
  }

  if (savedPlans.length === 0) {
    return null; // Don't show anything if there are no saved plans
  }

  return (
    <>
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <FileClock className="h-5 w-5 text-green-600" />
          Histórico de Planos Alimentares
        </h2>
        
        <div className="space-y-3">
          {savedPlans.map((plan) => (
            <div key={plan.id} className="border rounded-lg p-3 hover:bg-gray-50 transition-colors">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-medium">
                    Plano de {plan.calories} kcal
                  </h3>
                  <p className="text-sm text-gray-500">
                    Criado {formatDistanceToNow(new Date(plan.created_at), { addSuffix: true, locale: ptBR })}
                  </p>
                </div>
                <Button 
                  variant="ghost" 
                  onClick={() => handleViewPlan(plan)}
                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                >
                  Ver <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {showDetails && selectedPlan && (
        <SavedMealPlanDetails plan={selectedPlan} onClose={handleClose} />
      )}
    </>
  );
};
