
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Activity } from "lucide-react";
import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://vdrbuawpzeqokdspwbnm.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkcmJ1YXdwemVxb2tkc3B3Ym5tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDk5MjA1MzcsImV4cCI6MjAyNTQ5NjUzN30.XS_XFoWc0Nw-vT6VlwQMwFWn2Dj7ExLuA47oHKu5k3M"
);

interface Symptom {
  id: number;
  created_at: string;
  discomfort_level: number;
  symptoms: string[];
  notes: string;
}

const SymptomTracker = () => {
  const { toast } = useToast();
  const [discomfortLevel, setDiscomfortLevel] = useState(0);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSymptomToggle = (symptom: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(symptom)
        ? prev.filter((s) => s !== symptom)
        : [...prev, symptom]
    );
  };

  const handleSymptomLog = async () => {
    try {
      setIsLoading(true);
      const { error } = await supabase.from("symptoms").insert([
        {
          discomfort_level: discomfortLevel,
          symptoms: selectedSymptoms,
          notes: notes,
        },
      ]);

      if (error) throw error;

      toast({
        title: "Sintomas registrados",
        description: "Seu registro foi salvo com sucesso.",
      });

      // Reset form
      setDiscomfortLevel(0);
      setSelectedSymptoms([]);
      setNotes("");
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Erro ao registrar",
        description: "Não foi possível salvar seus sintomas.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
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
              onChange={(e) => setDiscomfortLevel(Number(e.target.value))}
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
              {["Normal", "Inchaço", "Gases", "Dor Abdominal", "Náusea"].map(
                (symptom) => (
                  <SymptomCheckbox
                    key={symptom}
                    label={symptom}
                    checked={selectedSymptoms.includes(symptom)}
                    onChange={() => handleSymptomToggle(symptom)}
                  />
                )
              )}
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
          disabled={isLoading}
          className="w-full bg-primary-500 hover:bg-primary-600 text-white"
        >
          {isLoading ? "Salvando..." : "Registrar Sintomas"}
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
