
import { format } from "date-fns";
import { Droplets, ChevronDown, ChevronUp } from "lucide-react";
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface WaterIntake {
  id: string;
  amount_ml: number | null;
  created_at: string | null;
  user_id: string;
}

interface WaterIntakeSectionProps {
  date: Date;
}

const WaterIntakeSection = ({ date }: WaterIntakeSectionProps) => {
  const [waterIntake, setWaterIntake] = useState<WaterIntake[]>([]);
  const [showWaterIntake, setShowWaterIntake] = useState(true);

  useEffect(() => {
    fetchWaterIntake();
  }, [date]);

  const fetchWaterIntake = async () => {
    try {
      const { data, error } = await supabase
        .from('water_intake')
        .select<'water_intake', WaterIntake>('*')
        .eq('created_at::date', format(date, 'yyyy-MM-dd'))
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWaterIntake(data || []);
    } catch (error) {
      console.error('Error fetching water intake:', error);
    }
  };

  return (
    <Card className="bg-white shadow-sm border-none">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Droplets className="w-5 h-5 text-primary-500" />
            <h2 className="text-lg font-semibold text-gray-900">Consumo de Água</h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowWaterIntake(!showWaterIntake)}
          >
            {showWaterIntake ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </Button>
        </div>

        {showWaterIntake && (
          <div className="space-y-4">
            {waterIntake.length === 0 ? (
              <p className="text-gray-500 text-center">Nenhum registro de consumo de água para este dia.</p>
            ) : (
              waterIntake.map((water) => (
                <Card key={water.id} className="bg-gray-50">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">
                        {water.created_at && format(new Date(water.created_at), 'HH:mm')}
                      </span>
                      <div className="flex items-center gap-2">
                        <Droplets className="w-4 h-4 text-primary-500" />
                        <span className="font-medium text-gray-900">{water.amount_ml}ml</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
            {waterIntake.length > 0 && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">Total do dia:</span>
                  <span className="font-semibold text-primary-500">
                    {waterIntake.reduce((total, water) => total + (water.amount_ml || 0), 0)}ml
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WaterIntakeSection;
