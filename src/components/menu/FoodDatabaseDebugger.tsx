
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const FoodDatabaseDebugger = () => {
  const [diagnosticInfo, setDiagnosticInfo] = useState<{
    connectionStatus: string;
    foodsTableExists: boolean;
    foodsCount: number | null;
    sampleFood: any | null;
    error: string | null;
  }>({
    connectionStatus: "Verificando...",
    foodsTableExists: false,
    foodsCount: null,
    sampleFood: null,
    error: null
  });
  
  const [isRunning, setIsRunning] = useState(false);

  const runDiagnostic = async () => {
    setIsRunning(true);
    try {
      // Test basic connection with a simple query to an existing table
      const { data: connectionTest, error: connectionError } = await supabase
        .from('protocol_foods')
        .select('count(*)', { count: 'exact', head: true });
      
      if (connectionError) {
        setDiagnosticInfo(prev => ({
          ...prev,
          connectionStatus: "Falha",
          error: `Erro de conexão: ${connectionError.message}`
        }));
        return;
      }
      
      // Check if protocol_foods table exists and get count
      const { count, error: countError } = await supabase
        .from('protocol_foods')
        .select('*', { count: 'exact', head: true });
        
      const foodsTableExists = !countError;
      let foodsCount = count || 0;
      let sampleFood = null;
      
      if (foodsTableExists && foodsCount > 0) {
        // Get a sample food
        const { data: foodSample, error: sampleError } = await supabase
          .from('protocol_foods')
          .select('*')
          .limit(1);
          
        if (!sampleError && foodSample && foodSample.length > 0) {
          sampleFood = foodSample[0];
        }
      }
      
      setDiagnosticInfo({
        connectionStatus: "OK",
        foodsTableExists,
        foodsCount,
        sampleFood,
        error: null
      });
    } catch (error) {
      setDiagnosticInfo(prev => ({
        ...prev,
        connectionStatus: "Falha",
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }));
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Card className="p-4 space-y-4 my-4 bg-yellow-50 border-yellow-300">
      <h3 className="text-lg font-semibold">🔍 Diagnóstico do Banco de Dados</h3>
      
      <Button 
        onClick={runDiagnostic} 
        disabled={isRunning}
        variant="outline"
        className="w-full mb-4"
      >
        {isRunning ? "Executando diagnóstico..." : "Executar Diagnóstico"}
      </Button>
      
      {diagnosticInfo.error && (
        <div className="p-3 bg-red-100 text-red-800 rounded-md text-sm">
          <p className="font-bold">Erro:</p>
          <p>{diagnosticInfo.error}</p>
        </div>
      )}
      
      <div className="text-sm space-y-2">
        <p><strong>Status da Conexão:</strong> {diagnosticInfo.connectionStatus}</p>
        <p><strong>Tabela 'protocol_foods' existe:</strong> {diagnosticInfo.foodsTableExists ? "✅ Sim" : "❌ Não"}</p>
        
        {diagnosticInfo.foodsCount !== null && (
          <p><strong>Quantidade de alimentos:</strong> {diagnosticInfo.foodsCount}</p>
        )}
        
        {diagnosticInfo.sampleFood && (
          <div>
            <p><strong>Exemplo de alimento:</strong></p>
            <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
              {JSON.stringify(diagnosticInfo.sampleFood, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </Card>
  );
};
