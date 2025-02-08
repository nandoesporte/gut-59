
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import { Droplets, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import 'react-circular-progressbar/dist/styles.css';

export const WaterTracker = () => {
  const { toast } = useToast();
  const [waterPercentage, setWaterPercentage] = useState(0);

  useEffect(() => {
    fetchTodayWaterIntake();
  }, []);

  const fetchTodayWaterIntake = async () => {
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

      // Get today's date in Brasilia timezone
      const today = new Date();
      const brasiliaDate = new Date(today.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
      brasiliaDate.setHours(0, 0, 0, 0);

      const { data: waterIntake, error } = await supabase
        .from('water_intake')
        .select('amount_ml')
        .eq('user_id', user.id)
        .eq('intake_date', brasiliaDate.toISOString().split('T')[0]);

      if (error) throw error;

      // Calculate total water intake for today
      const totalWater = waterIntake?.reduce((sum, record) => sum + (record.amount_ml || 0), 0) || 0;
      
      // Assuming 4000ml as daily goal (100%)
      const percentage = Math.min(100, Math.round((totalWater / 4000) * 100));
      setWaterPercentage(percentage);

    } catch (error) {
      console.error('Error fetching water intake:', error);
      toast({
        title: "Erro ao carregar",
        description: "Não foi possível carregar o consumo de água.",
        variant: "destructive",
      });
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

      // Get current date in Brasilia timezone
      const brasiliaDate = new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' });

      const { error } = await supabase
        .from('water_intake')
        .insert({
          user_id: user.id,
          amount_ml: 200,
          intake_date: new Date(brasiliaDate).toISOString().split('T')[0]
        });

      if (error) throw error;

      // Update the percentage after adding water
      await fetchTodayWaterIntake();

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
    <Card className="bg-white shadow-sm border-none">
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Droplets className="w-6 h-6 text-primary-500" />
          <h2 className="text-xl font-semibold text-gray-900">Ingestão de água</h2>
        </div>
        <div className="w-32 h-32 mx-auto">
          <CircularProgressbar
            value={waterPercentage}
            text={`${waterPercentage}%`}
            styles={buildStyles({
              textSize: '18px',
              pathColor: '#34D399',
              textColor: '#34D399',
              trailColor: '#E5E7EB',
            })}
          />
        </div>
        <div className="mt-4 flex justify-center">
          <Button
            onClick={handleAddWater}
            className="bg-primary-50 hover:bg-primary-100 text-primary-500 text-base"
            variant="ghost"
          >
            <Plus className="w-5 h-5 mr-2" />
            Adicionar 200ml
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
