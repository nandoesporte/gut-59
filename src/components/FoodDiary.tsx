
import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { WaterTracker } from "./food-diary/WaterTracker";
import { MealForm } from "./food-diary/MealForm";

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
  const [date, setDate] = useState<Date>(new Date());
  const [mealTypes, setMealTypes] = useState<MealType[]>([]);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [currentPhotoFile, setCurrentPhotoFile] = useState<File | null>(null);

  useEffect(() => {
    fetchMealTypes();
  }, []);

  const fetchMealTypes = async () => {
    try {
      const { data: mealTypesData, error: mealTypesError } = await supabase
        .from('meal_types')
        .select('*')
        .order('id');

      if (mealTypesError) throw mealTypesError;
      setMealTypes(mealTypesData || []);
    } catch (error) {
      console.error('Error fetching meal types:', error);
    }
  };

  const handlePhotoCapture = (file: File) => {
    setCurrentPhotoFile(file);
    setPhotoUrl(URL.createObjectURL(file));
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

      if (!currentPhotoFile) {
        toast({
          title: "Erro",
          description: "Por favor, tire uma foto da refeição.",
          variant: "destructive",
        });
        return;
      }

      // Upload photo to storage
      const fileExt = currentPhotoFile.name.split('.').pop();
      const filePath = `${user.id}/${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('meal-photos')
        .upload(filePath, currentPhotoFile);

      if (uploadError) throw uploadError;

      // Get public URL for the uploaded photo
      const { data: { publicUrl } } = supabase.storage
        .from('meal-photos')
        .getPublicUrl(filePath);

      // Save meal record with photo URL
      const { error } = await supabase
        .from('meals')
        .insert({
          user_id: user.id,
          meal_type: mealType,
          protocol_phase: phase ? parseInt(phase) : null,
          meal_date: format(date, 'yyyy-MM-dd'),
          photo_url: publicUrl,
        });

      if (error) throw error;

      toast({
        title: "Refeição registrada",
        description: "Seu registro alimentar foi salvo com sucesso.",
      });

      setMealType("");
      setPhase("");
      setPhotoUrl(null);
      setCurrentPhotoFile(null);
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
          onSubmit={handleFoodLog}
          mealType={mealType}
          setMealType={setMealType}
          phase={phase}
          setPhase={setPhase}
          date={date}
          setDate={setDate}
          photoUrl={photoUrl}
          onPhotoCapture={handlePhotoCapture}
        />
        <WaterTracker />
      </div>
    </div>
  );
};

export default FoodDiary;
