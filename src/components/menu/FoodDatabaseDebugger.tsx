
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const FoodDatabaseDebugger = () => {
  const [diagnosticInfo, setDiagnosticInfo] = useState<{
    tables: string[];
    schemaExists: boolean;
    foodsTableExists: boolean;
    connection: string;
    foodsCount: number | null;
    sampleFood: any | null;
    error: string | null;
  }>({
    tables: [],
    schemaExists: false,
    foodsTableExists: false,
    connection: "Verificando...",
    foodsCount: null,
    sampleFood: null,
    error: null
  });
  
  const [isRunning, setIsRunning] = useState(false);

  const runDiagnostic = async () => {
    setIsRunning(true);
    try {
      // Verificar conexão básica
      const { data: tablesData, error: tablesError } = await supabase
        .from('pg_catalog.pg_tables')
        .select('tablename')
        .eq('schemaname', 'public');
      
      if (tablesError) {
        setDiagnosticInfo(prev => ({
          ...prev,
          connection: "Falha",
          error: `Erro ao verificar tabelas: ${tablesError.message}`
        }));
        return;
      }
      
      // Verificar existência da tabela protocol_foods
      const tables = tablesData?.map(t => t.tablename) || [];
      const foodsTableExists = tables.includes('protocol_foods');
      
      // Tentar buscar a contagem de alimentos
      let foodsCount = null;
      let sampleFood = null;
      
      if (foodsTableExists) {
        const { count, error: countError } = await supabase
          .from('protocol_foods')
          .select('*', { count: 'exact', head: true });
          
        if (!countError) {
          foodsCount = count;
          
          // Buscar um exemplo de alimento
          const { data: foodSample, error: sampleError } = await supabase
            .from('protocol_foods')
            .select('*')
            .limit(1);
            
          if (!sampleError && foodSample && foodSample.length > 0) {
            sampleFood = foodSample[0];
          }
        }
      }
      
      setDiagnosticInfo({
        tables,
        schemaExists: true,
        foodsTableExists,
        connection: "OK",
        foodsCount,
        sampleFood,
        error: null
      });
    } catch (error) {
      setDiagnosticInfo(prev => ({
        ...prev,
        connection: "Falha",
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
        <p><strong>Status da Conexão:</strong> {diagnosticInfo.connection}</p>
        <p><strong>Tabela 'protocol_foods' existe:</strong> {diagnosticInfo.foodsTableExists ? "✅ Sim" : "❌ Não"}</p>
        
        {diagnosticInfo.foodsCount !== null && (
          <p><strong>Quantidade de alimentos:</strong> {diagnosticInfo.foodsCount}</p>
        )}
        
        {diagnosticInfo.tables.length > 0 && (
          <div>
            <p><strong>Tabelas disponíveis:</strong></p>
            <ul className="list-disc pl-5">
              {diagnosticInfo.tables.map(table => (
                <li key={table}>{table}</li>
              ))}
            </ul>
          </div>
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
