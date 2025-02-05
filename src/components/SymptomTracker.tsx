import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Activity } from "lucide-react";

const SymptomTracker = () => {
  const { toast } = useToast();

  const handleSymptomLog = () => {
    toast({
      title: "Sintomas registrados",
      description: "Seu registro foi salvo com sucesso.",
    });
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="flex flex-row items-center space-x-2">
        <Activity className="w-6 h-6 text-primary-500" />
        <CardTitle className="text-2xl text-primary-500">
          Registro de Sintomas
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
              <SymptomCheckbox label="Inchaço" />
              <SymptomCheckbox label="Gases" />
              <SymptomCheckbox label="Dor Abdominal" />
              <SymptomCheckbox label="Náusea" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Observações
            </label>
            <textarea
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              rows={3}
              placeholder="Descreva seus sintomas em detalhes"
            />
          </div>
        </div>
        <Button
          onClick={handleSymptomLog}
          className="w-full bg-primary-500 hover:bg-primary-600 text-white"
        >
          Registrar Sintomas
        </Button>
      </CardContent>
    </Card>
  );
};

const SymptomCheckbox = ({ label }: { label: string }) => (
  <label className="flex items-center space-x-2">
    <input type="checkbox" className="rounded text-primary-500" />
    <span className="text-sm text-gray-700">{label}</span>
  </label>
);

export default SymptomTracker;