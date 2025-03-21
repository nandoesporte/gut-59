
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
                               errorMessage.includes("função de geração") ||
                               errorMessage.includes("autenticado") ||
                               errorMessage.includes("autenticação") ||
                               errorMessage.includes("login") ||
                               errorMessage.includes("permissão necessária");
                               
  const isNetworkError = errorMessage.includes("conexão") || 
                         errorMessage.includes("API") || 
                         errorMessage.includes("timeout") ||
                         errorMessage.includes("non-2xx status code") ||
                         errorMessage.includes("Edge Function returned") ||
                         errorMessage.includes("Failed to send") ||
                         errorMessage.includes("Failed to fetch") ||
                         errorMessage.includes("rede");

  const isPermissionError = errorMessage.includes("permissão") ||
                           errorMessage.includes("acesso negado") ||
                           errorMessage.includes("não autorizado") ||
                           errorMessage.includes("admin") ||
                           errorMessage.includes("administrador");

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
            <p className="text-muted-foreground text-base">{errorMessage}</p>
          </div>

          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-4 rounded-md text-sm">
            {isInitializationError ? (
              <div className="space-y-2">
                <p className="font-medium">Erro de inicialização ou autenticação</p>
                <p>Isso geralmente ocorre quando você não está autenticado ou o serviço está sobrecarregado.</p>
                <p>Recomendamos:</p>
                <ul className="text-left list-disc pl-5 space-y-1">
                  <li>Verificar se você está logado na plataforma</li>
                  <li>Recarregar a página completa</li>
                  <li>Tentar novamente em alguns minutos</li>
                </ul>
              </div>
            ) : isNetworkError ? (
              <div className="space-y-2">
                <p className="font-medium">Erro de rede ou resposta do servidor</p>
                <p>O servidor retornou um erro ao processar sua solicitação.</p>
                <p>Recomendamos:</p>
                <ul className="text-left list-disc pl-5 space-y-1">
                  <li>Verificar sua conexão com a internet</li>
                  <li>Tentar novamente em alguns minutos</li>
                  <li>Se o problema persistir, entre em contato com o suporte</li>
                  <li>Isso pode ser um problema temporário com o servidor</li>
                </ul>
              </div>
            ) : isPermissionError ? (
              <div className="space-y-2">
                <p className="font-medium">Erro de permissão</p>
                <p>Você não tem permissão para acessar este recurso ou o acesso está temporariamente indisponível.</p>
                <p>Recomendamos:</p>
                <ul className="text-left list-disc pl-5 space-y-1">
                  <li>Verificar se você está logado com a conta correta</li>
                  <li>Tentar novamente em alguns minutos</li>
                  <li>Se o erro persistir, pode ser necessário contatar o administrador</li>
                </ul>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="font-medium">Dicas para resolver o problema:</p>
                <ul className="text-left list-disc pl-5 space-y-1">
                  <li>Verifique se você está logado</li>
                  <li>Verifique suas preferências e tente novamente</li>
                  <li>Tente com diferentes tipos de exercícios</li>
                  <li>Aguarde alguns minutos e tente novamente</li>
                  <li>Se o problema persistir, o serviço pode estar temporariamente indisponível</li>
                </ul>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {isInitializationError || isNetworkError ? (
              <Button 
                variant="default" 
                onClick={() => window.location.reload()}
                className="gap-2"
                size="lg"
              >
                <RefreshCw className="w-4 h-4" />
                Recarregar Página
              </Button>
            ) : null}
            <Button 
              variant={isInitializationError || isNetworkError ? "outline" : "default"} 
              onClick={onReset}
              className="gap-2"
              size="lg"
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
