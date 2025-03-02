import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ProtocolFood, DietaryPreferences, MealPlan } from "./types";
import { useMutation } from "@tanstack/react-query";
import type { TransactionType } from "@/types/wallet";
import { generateMealPlan } from "./hooks/useMealPlanGeneration";
import { searchFood } from "./utils/food-api";

export interface CalorieCalculatorForm {
  weight: string;
  height: string;
  age: string;
  gender: "male" | "female";
  activityLevel: string;
  goal: string;
}

export const useMenuController = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<CalorieCalculatorForm>({
    weight: "70",
    height: "175",
    age: "30",
    gender: "male",
    activityLevel: "moderate",
    goal: "maintain",
  });
  const [calorieNeeds, setCalorieNeeds] = useState<number | null>(null);
  const [protocolFoods, setProtocolFoods] = useState<ProtocolFood[]>([]);
  const [selectedFoods, setSelectedFoods] = useState<string[]>([]);
  const [totalCalories, setTotalCalories] = useState(0);
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
  const [useNutriPlus, setUseNutriPlus] = useState(false);
  const [user, setUser] = useState<any>(null);

  const addTransactionMutation = useMutation({
    mutationFn: async ({
      amount,
      type,
      description,
      recipientId,
      qrCodeId,
    }: {
      amount: number;
      type: TransactionType;
      description?: string;
      recipientId?: string;
      qrCodeId?: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user?.id) {
        throw new Error("User not authenticated");
      }
      
      const { data: walletData, error: walletError } = await supabase
        .from("wallets")
        .select("id")
        .eq("user_id", userData.user.id)
        .single();
        
      if (walletError) {
        console.error("Error fetching wallet:", walletError);
        throw walletError;
      }
      
      const { data, error } = await supabase.from("fit_transactions").insert({
        amount,
        transaction_type: type,
        description,
        recipient_id: recipientId,
        qr_code_id: qrCodeId,
        wallet_id: walletData.id,
      });

      if (error) {
        console.error("Erro ao adicionar transação:", error);
        throw error;
      }

      console.log("Transação adicionada com sucesso:", data);
    },
  });

  useEffect(() => {
    const fetchFoods = async () => {
      try {
        const { data: foods, error } = await supabase
          .from("protocol_foods")
          .select("*");
        if (error) {
          throw new Error(`Erro ao buscar alimentos: ${error.message}`);
        }
        if (foods) {
          setProtocolFoods(foods);
        }
      } catch (err: any) {
        toast.error(err.message);
      }
    };

    supabase.auth.getUser().then((response) => {
      setUser(response.data?.user);
    });

    fetchFoods();
  }, []);

  useEffect(() => {
    const step = searchParams.get("step");
    if (step) {
      setCurrentStep(parseInt(step));
    }
  }, [searchParams]);

  const updateSearchParams = (step: number) => {
    setSearchParams({ step: step.toString() });
  };

  const handleCalculateCalories = () => {
    const { weight, height, age, gender, activityLevel, goal } = formData;
    let bmr: number;

    const ageNum = parseInt(age, 10);

    if (gender === "male") {
      bmr = 10 * parseFloat(weight) + 6.25 * parseFloat(height) - 5 * ageNum + 5;
    } else {
      bmr = 10 * parseFloat(weight) + 6.25 * parseFloat(height) - 5 * ageNum - 161;
    }

    let activityFactor: number;
    switch (activityLevel) {
      case "sedentary":
        activityFactor = 1.2;
        break;
      case "light":
        activityFactor = 1.375;
        break;
      case "moderate":
        activityFactor = 1.55;
        break;
      case "active":
        activityFactor = 1.725;
        break;
      case "veryActive":
        activityFactor = 1.9;
        break;
      default:
        activityFactor = 1.55;
    }

    let dailyCalories: number = bmr * activityFactor;

    if (goal === "lose") {
      dailyCalories -= 500;
    } else if (goal === "gain") {
      dailyCalories += 500;
    }

    setCalorieNeeds(Math.round(dailyCalories));
    updateSearchParams(2);
  };

  const handleFoodSelection = (foodId: string, food?: ProtocolFood) => {
    const isSelected = selectedFoods.includes(foodId);
    let newSelection = [...selectedFoods];

    if (isSelected) {
      newSelection = newSelection.filter((id) => id !== foodId);
    } else {
      newSelection = [...newSelection, foodId];
    }

    setSelectedFoods(newSelection);
    
    const total = newSelection.reduce((acc, id) => {
      const food = protocolFoods.find(f => f.id === id);
      return acc + (food?.calories || 0);
    }, 0);
    
    setTotalCalories(total);
  };

  const handleConfirmFoodSelection = () => {
    if (selectedFoods.length === 0) {
      toast.error("Selecione pelo menos um alimento");
      return;
    }

    updateSearchParams(3);
  };

  const handleDietaryPreferences = async (preferences: DietaryPreferences): Promise<boolean> => {
    setLoading(true);
    setLoadingMessage("Gerando seu plano alimentar personalizado...");

    try {
      const accessResult = await verifyPlanAccess();

      if (!accessResult.hasAccess && accessResult.requiresPayment) {
        const message =
          accessResult.message || "Pagamento necessário para gerar novo plano";
        console.log("Acesso negado:", message);
        toast.error(message);
        setLoading(false);
        return false;
      }

      if (!calorieNeeds) {
        toast.error("Por favor, calcule suas necessidades calóricas primeiro.");
        return false;
      }

      if (selectedFoods.length === 0) {
        toast.error("Por favor, selecione alguns alimentos.");
        return false;
      }

      if (!user) {
        toast.error("Usuário não autenticado. Por favor, faça login novamente.");
        return false;
      }

      const selectedFoodObjects = protocolFoods.filter(food => 
        selectedFoods.includes(food.id)
      );

      console.log("Iniciando geração do plano alimentar...");

      const mealPlanData = await generateMealPlan({
        userData: {
          id: user.id,
          weight: parseFloat(formData.weight),
          height: parseFloat(formData.height),
          age: parseInt(formData.age, 10),
          gender: formData.gender,
          activityLevel: formData.activityLevel,
          goal: formData.goal,
          dailyCalories: calorieNeeds,
        },
        selectedFoods: selectedFoodObjects,
        preferences: preferences,
        addTransaction: addTransactionMutation.mutate,
      });

      console.log("Plano alimentar gerado com sucesso:", mealPlanData);
      setMealPlan(mealPlanData);
      updateSearchParams(4);
      return true;
    } catch (error: any) {
      console.error("Erro ao gerar plano alimentar:", error);
      toast.error(
        error.message || "Erro ao gerar plano alimentar. Tente novamente."
      );
      return false;
    } finally {
      setLoading(false);
      setLoadingMessage(null);
    }
  };

  const verifyPlanAccess = async () => {
    if (!user) {
      console.error("Erro: Usuário não autenticado em verifyPlanAccess");
      toast.error("Usuário não autenticado");
      return { hasAccess: false };
    }

    console.log("Verificando acesso ao plano alimentar");
    try {
      const { data: premiumAccess } = await supabase
        .from("plan_access")
        .select("*")
        .eq("user_id", user.id)
        .eq("plan_type", "nutrition")
        .eq("is_active", true)
        .maybeSingle();

      if (premiumAccess) {
        console.log("Usuário tem acesso premium ao plano alimentar");
        return { hasAccess: true };
      }

      const { data: settings } = await supabase
        .from("payment_settings")
        .select("is_active, price")
        .eq("plan_type", "nutrition")
        .maybeSingle();

      const { data: grantData, error } = await supabase.functions.invoke(
        "grant-plan-access",
        {
          body: {
            userId: user.id,
            planType: "nutrition",
            incrementCount: true,
          },
        }
      );

      if (error) {
        console.error("Erro na verificação de acesso:", error);
        return { hasAccess: false, error: error.message };
      }

      console.log("Resposta da função grant-plan-access:", grantData);

      return {
        hasAccess: !grantData.requiresPayment,
        requiresPayment: grantData.requiresPayment || false,
        price: settings?.price || 0,
        message: grantData.message,
      };
    } catch (error) {
      console.error("Erro crítico na verificação de acesso:", error);
      return { hasAccess: false, error: "Erro na verificação de acesso" };
    }
  };

  return {
    currentStep,
    setCurrentStep,
    formData,
    setFormData,
    calorieNeeds,
    protocolFoods,
    selectedFoods,
    totalCalories,
    mealPlan,
    loading,
    loadingMessage,
    useNutriPlus,
    setUseNutriPlus,
    handleCalculateCalories,
    handleFoodSelection,
    handleConfirmFoodSelection,
    handleDietaryPreferences,
  };
};
