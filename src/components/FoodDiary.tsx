
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { supabase } from "@/integrations/supabase/client";

const FoodDiary = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [mealType, setMealType] = useState<string>("");
  const [phase, setPhase] = useState<string>("");
  const [selectedFood, setSelectedFood] = useState<string>("");
  const [waterPercentage, setWaterPercentage] = useState(55);

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
          description: selectedFood,
        });

      if (error) throw error;

      toast({
        title: "Refeição registrada",
        description: "Seu registro alimentar foi salvo com sucesso.",
      });

      // Reset form
      setMealType("");
      setPhase("");
      setSelectedFood("");
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

  const handleAddWater = async () => {
    try {
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
        .from('water_intake')
        .insert({
          user_id: user.id,
          amount_ml: 200,
        });

      if (error) throw error;

      // Update water percentage (this is simplified, you might want to calculate based on daily total)
      setWaterPercentage(prev => Math.min(100, prev + 5));

      toast({
        title: "Água registrada",
        description: "200ml de água registrados com sucesso.",
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Erro ao registrar",
        description: "Não foi possível registrar a água. Tente novamente.",
        variant: "destructive",
      });
    }
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
                  <SelectItem value="breakfast">Café da manhã</SelectItem>
                  <SelectItem value="lunch">Almoço</SelectItem>
                  <SelectItem value="dinner">Jantar</SelectItem>
                  <SelectItem value="snack">Lanche</SelectItem>
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
                    <SelectItem value="1">Fase 1 - Remoção e Desintoxicação</SelectItem>
                    <SelectItem value="2">Fase 2 - Reequilíbrio da Microbiota</SelectItem>
                    <SelectItem value="3">Fase 3 - Reparo e Manutenção</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Alimentos Consumidos
                </label>
                <Select value={selectedFood} onValueChange={setSelectedFood}>
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
              disabled={loading}
              className="w-full bg-primary-500 hover:bg-primary-600 text-white"
            >
              {loading ? "Registrando..." : "Registrar Refeição"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FoodDiary;
