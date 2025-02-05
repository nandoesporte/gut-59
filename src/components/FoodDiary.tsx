
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { useState } from "react";
import { supabase } from "@/lib/supabase";

const FoodDiary = () => {
  const { toast } = useToast();
  const [mealType, setMealType] = useState("");
  const [phase, setPhase] = useState("");
  const [foods, setFoods] = useState("");
  const [waterPercentage, setWaterPercentage] = useState(55);
  const [isLoading, setIsLoading] = useState(false);

  const handleFoodLog = async () => {
    if (!mealType || !phase || !foods) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('food_diary')
        .insert([{
          meal_type: mealType,
          phase,
          foods,
          water_percentage: waterPercentage,
          created_at: new Date().toISOString()
        }]);

      if (error) throw error;

      toast({
        title: "Refeição registrada",
        description: "Seu registro alimentar foi salvo com sucesso.",
      });

      // Reset form
      setMealType("");
      setPhase("");
      setFoods("");
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar seu registro. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddWater = () => {
    const newPercentage = Math.min(waterPercentage + 12.5, 100);
    setWaterPercentage(newPercentage);
    
    // Opcional: Salvar no Supabase
    supabase
      .from('water_intake')
      .insert([{
        percentage: newPercentage,
        created_at: new Date().toISOString()
      }])
      .then(({ error }) => {
        if (error) console.error('Error saving water intake:', error);
      });
  };

  return (
    <div className="space-y-6">
      <Card className="bg-white shadow-sm border-none">
        <CardContent className="p-6">
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Refeição atual</h2>
              <Select value={mealType} onValueChange={setMealType}>
                <SelectTrigger className="w-full bg-gray-50 border-gray-200">
                  <SelectValue placeholder="Selecione a refeição" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cafe">Café da manhã</SelectItem>
                  <SelectItem value="almoco">Almoço</SelectItem>
                  <SelectItem value="jantar">Jantar</SelectItem>
                  <SelectItem value="lanche">Lanche</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Ingestão de água</h2>
              <div className="w-32 h-32 mx-auto">
                <CircularProgressbar
                  value={waterPercentage}
                  text={`${waterPercentage}%`}
                  styles={buildStyles({
                    textSize: '16px',
                    pathColor: '#34D399',
                    textColor: '#34D399',
                    trailColor: '#E5E7EB',
                  })}
                />
              </div>
              <div className="mt-4 flex justify-center">
                <Button
                  onClick={handleAddWater}
                  className="bg-primary-50 hover:bg-primary-100 text-primary-500"
                  variant="ghost"
                >
                  + Adicionar 200ml
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fase do Protocolo
                </label>
                <Select value={phase} onValueChange={setPhase}>
                  <SelectTrigger className="w-full bg-gray-50 border-gray-200">
                    <SelectValue placeholder="Selecione a fase" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fase1">Fase 1 - Remoção e Desintoxicação</SelectItem>
                    <SelectItem value="fase2">Fase 2 - Reequilíbrio da Microbiota</SelectItem>
                    <SelectItem value="fase3">Fase 3 - Reparo e Manutenção</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Alimentos Consumidos
                </label>
                <Select value={foods} onValueChange={setFoods}>
                  <SelectTrigger className="w-full bg-gray-50 border-gray-200">
                    <SelectValue placeholder="Selecione os alimentos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ovos">Ovos mexidos com abacate</SelectItem>
                    <SelectItem value="frango">Frango grelhado com legumes</SelectItem>
                    <SelectItem value="sopa">Sopa de legumes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              onClick={handleFoodLog}
              disabled={isLoading}
              className="w-full bg-primary-500 hover:bg-primary-600 text-white"
            >
              {isLoading ? "Salvando..." : "Registrar Refeição"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FoodDiary;
