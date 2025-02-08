
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const SymptomTracker = () => {
  const { toast } = useToast();
  const [discomfortLevel, setDiscomfortLevel] = useState(0);
  const [symptoms, setSymptoms] = useState({
    normal: false,
    bloating: false,
    gas: false,
    abdominalPain: false,
    nausea: false,
  });
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSymptomLog = async () => {
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
        .from('symptoms')
        .insert({
          user_id: user.id,
          discomfort_level: discomfortLevel,
          has_bloating: symptoms.bloating,
          has_gas: symptoms.gas,
          has_abdominal_pain: symptoms.abdominalPain,
          has_nausea: symptoms.nausea,
          notes,
        });

      if (error) throw error;

      toast({
        title: "Sintomas registrados",
        description: "Seu registro foi salvo com sucesso.",
      });

      // Reset form
      setDiscomfortLevel(0);
      setSymptoms({
        normal: false,
        bloating: false,
        gas: false,
        abdominalPain: false,
        nausea: false,
      });
      setNotes("");
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Erro ao registrar",
        description: "Não foi possível salvar seus sintomas. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSymptomChange = (symptom: keyof typeof symptoms) => {
    setSymptoms(prev => ({
      ...prev,
      [symptom]: !prev[symptom],
    }));
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="flex flex-row items-center space-x-2">
        <Activity className="w-6 h-6 text-primary-500" />
        <CardTitle className="text-2xl text-primary-500">
          Registro de Sintomas Diários
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Nível de Desconforto
            </label>
            <input
              type="range"
              min="0"
              max="10"
              value={discomfortLevel}
              onChange={(e) => setDiscomfortLevel(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>Sem dor</span>
              <span>Dor severa</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Sintomas Específicos
            </label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <SymptomCheckbox
                label="Normal"
                checked={symptoms.normal}
                onChange={() => handleSymptomChange('normal')}
              />
              <SymptomCheckbox
                label="Inchaço"
                checked={symptoms.bloating}
                onChange={() => handleSymptomChange('bloating')}
              />
              <SymptomCheckbox
                label="Gases"
                checked={symptoms.gas}
                onChange={() => handleSymptomChange('gas')}
              />
              <SymptomCheckbox
                label="Dor Abdominal"
                checked={symptoms.abdominalPain}
                onChange={() => handleSymptomChange('abdominalPain')}
              />
              <SymptomCheckbox
                label="Náusea"
                checked={symptoms.nausea}
                onChange={() => handleSymptomChange('nausea')}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Observações
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              rows={3}
              placeholder="Descreva seus sintomas em detalhes"
            />
          </div>
        </div>
        <Button
          onClick={handleSymptomLog}
          disabled={loading}
          className="w-full bg-primary-500 hover:bg-primary-600 text-white"
        >
          {loading ? "Registrando..." : "Registrar Sintomas"}
        </Button>
      </CardContent>
    </Card>
  );
};

const SymptomCheckbox = ({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) => (
  <label className="flex items-center space-x-2">
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className="rounded text-primary-500"
    />
    <span className="text-sm text-gray-700">{label}</span>
  </label>
);

export default SymptomTracker;
