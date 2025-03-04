
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, RotateCcw, Zap } from "lucide-react";

interface WorkoutErrorProps {
  onReset: () => void;
  errorMessage: string;
}

export const WorkoutError = ({ onReset, errorMessage }: WorkoutErrorProps) => {
  const isInitializationError = errorMessage.includes("inicialização") || 
                               errorMessage.includes("booted") || 
                               errorMessage.includes("função de geração");
                               
  const isNetworkError = errorMessage.includes("conexão") || 
                         errorMessage.includes("API") || 
                         errorMessage.includes("timeout");

  return (
    <Card className="w-full max-w-lg mx-auto border-none overflow-hidden">
      <CardContent className="p-8">
        <div className="flex flex-col items-center text-center space-y-6">
          <div className="p-4 bg-red-100 dark:bg-red-900/20 rounded-full">
            {isInitializationError ? (
              <Zap className="w-12 h-12 text-red-500" />
            ) : isNetworkError ? (
              <RefreshCw className="w-12 h-12 text-red-500" />
            ) : (
              <AlertTriangle className="w-12 h-12 text-red-500" />
            )}
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-semibold">Erro ao Gerar Plano de Treino</h3>
            <p className="text-muted-foreground">{errorMessage}</p>
          </div>

          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-4 rounded-md text-sm">
            {isInitializationError ? (
              <div className="space-y-2">
                <p className="font-medium">Erro de inicialização do serviço</p>
                <p>Isso geralmente ocorre quando o serviço está sobrecarregado ou em manutenção.</p>
                <p>Recomendamos:</p>
                <ul className="text-left list-disc pl-5 space-y-1">
                  <li>Recarregar a página completa</li>
                  <li>Tentar novamente em alguns minutos</li>
                </ul>
              </div>
            ) : isNetworkError ? (
              <div className="space-y-2">
                <p className="font-medium">Erro de rede ou tempo limite excedido</p>
                <p>Verifique sua conexão com a internet e tente novamente.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="font-medium">Dicas para resolver o problema:</p>
                <ul className="text-left list-disc pl-5 space-y-1">
                  <li>Verifique suas preferências e tente novamente</li>
                  <li>Tente com diferentes tipos de exercícios</li>
                </ul>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {isInitializationError && (
              <Button 
                variant="default" 
                onClick={() => window.location.reload()}
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Recarregar Página
              </Button>
            )}
            <Button 
              variant={isInitializationError ? "outline" : "default"} 
              onClick={onReset}
              className="gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Voltar às Preferências
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
