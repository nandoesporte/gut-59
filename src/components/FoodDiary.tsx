import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { WaterTracker } from "./food-diary/WaterTracker";
import { MealForm } from "./food-diary/MealForm";

interface ProtocolFood {
  id: string;
  name: string;
  food_group: string;
  food_group_id: number;
  phase: number;
  phase_id: number;
}

interface FoodGroup {
  id: number;
  name: string;
  display_name: string;
}

interface MealType {
  id: number;
  name: string;
  display_name: string;
  phase: number | null;
}

const FoodDiary = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [mealType, setMealType] = useState<string>("");
  const [phase, setPhase] = useState<string>("");
  const [selectedFood, setSelectedFood] = useState<string>("");
  const [date, setDate] = useState<Date>(new Date());
  const [protocolFoods, setProtocolFoods] = useState<ProtocolFood[]>([]);
  const [foodGroups, setFoodGroups] = useState<FoodGroup[]>([]);
  const [mealTypes, setMealTypes] = useState<MealType[]>([]);
  const [selectedFoodGroup, setSelectedFoodGroup] = useState<number | null>(null);
  const [customFood, setCustomFood] = useState("");
  const [showCustomFood, setShowCustomFood] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch food groups
      const { data: groupsData, error: groupsError } = await supabase
        .from('food_groups')
        .select('*')
        .order('display_name');

      if (groupsError) throw groupsError;
      setFoodGroups(groupsData || []);

      // Fetch meal types
      const { data: mealTypesData, error: mealTypesError } = await supabase
        .from('meal_types')
        .select('*')
        .order('id');

      if (mealTypesError) throw mealTypesError;
      setMealTypes(mealTypesData || []);

      // Fetch protocol foods
      const { data: foodsData, error: foodsError } = await supabase
        .from('protocol_foods')
        .select('*')
        .order('name');

      if (foodsError) throw foodsError;
      setProtocolFoods(foodsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleFoodLog = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Erro",
          description: "Usuário não encontrado. Por favor, faça login novamente.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('meals')
        .insert({
          user_id: user.id,
          meal_type: mealType,
          protocol_phase: phase ? parseInt(phase) : null,
          protocol_food_id: showCustomFood ? null : selectedFood,
          custom_food: showCustomFood ? customFood : null,
          food_group_id: selectedFoodGroup,
          meal_date: format(date, 'yyyy-MM-dd'),
        });

      if (error) throw error;

      toast({
        title: "Refeição registrada",
        description: "Seu registro alimentar foi salvo com sucesso.",
      });

      setMealType("");
      setPhase("");
      setSelectedFood("");
      setCustomFood("");
      setShowCustomFood(false);
      setSelectedFoodGroup(null);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Erro ao registrar",
        description: "Não foi possível salvar sua refeição. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-primary-50 to-primary-100 p-6 rounded-lg shadow-sm">
        <h1 className="text-2xl font-bold text-primary-700 mb-2">Diário Alimentar</h1>
        <p className="text-primary-600">
          Acompanhe sua jornada de modulação intestinal registrando suas refeições diárias.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <MealForm
          loading={loading}
          mealTypes={mealTypes}
          foodGroups={foodGroups}
          protocolFoods={protocolFoods}
          onSubmit={handleFoodLog}
          mealType={mealType}
          setMealType={setMealType}
          phase={phase}
          setPhase={setPhase}
          selectedFood={selectedFood}
          setSelectedFood={setSelectedFood}
          date={date}
          setDate={setDate}
          selectedFoodGroup={selectedFoodGroup}
          setSelectedFoodGroup={setSelectedFoodGroup}
          customFood={customFood}
          setCustomFood={setCustomFood}
          showCustomFood={showCustomFood}
          setShowCustomFood={setShowCustomFood}
        />
        <WaterTracker />
      </div>
    </div>
  );
};

export default FoodDiary;
