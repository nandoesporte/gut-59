
import { Button } from "@/components/ui/button";
import { RotateCcw, AlertCircle, Settings } from "lucide-react";
import { useNavigate } from 'react-router-dom';

interface WorkoutErrorProps {
  onReset: () => void;
  errorMessage?: string;
}

export const WorkoutError = ({ onReset, errorMessage }: WorkoutErrorProps) => {
  const navigate = useNavigate();
  const isGroqKeyError = errorMessage?.includes("Groq API key") || 
                         errorMessage?.includes("Chave API Groq");

  return (
    <div className="text-center space-y-4 p-12 border border-red-200 rounded-lg bg-red-50 dark:bg-red-900/10">
      <div className="flex justify-center">
        <div className="bg-red-100 dark:bg-red-900/20 p-3 rounded-full">
          <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
        </div>
      </div>
      
      <h3 className="text-xl font-semibold text-red-600 dark:text-red-400">
        Erro ao gerar o plano de treino com Trenner2025
      </h3>
      
      <p className="text-muted-foreground">
        {errorMessage || "Não foi possível gerar seu plano. Por favor, tente novamente."}
      </p>

      <div className="bg-red-100 dark:bg-red-900/10 p-4 rounded-lg text-left text-sm max-w-2xl mx-auto">
        <p className="font-semibold mb-2">Possíveis soluções:</p>
        <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
          {isGroqKeyError ? (
            <>
              <li>Configure a chave da API Groq na página de administração</li>
              <li>O agente Trenner2025 requer a API Groq para funcionar corretamente</li>
              <li>Obtenha uma chave gratuita em <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="underline">console.groq.com/keys</a></li>
            </>
          ) : (
            <>
              <li>Verifique sua conexão com a internet e tente novamente</li>
              <li>O servidor pode estar sobrecarregado. Aguarde alguns minutos e tente novamente</li>
              <li>O modelo Trenner2025 (Llama 3) pode estar temporariamente indisponível na API Groq</li>
              <li>Tente mudar algumas preferências de treino para simplificar a solicitação</li>
            </>
          )}
          <li>Entre em contato com o suporte se o problema persistir</li>
        </ul>
      </div>
      
      <div className="pt-2 flex justify-center gap-4">
        {isGroqKeyError && (
          <Button onClick={() => navigate('/admin')} variant="default">
            <Settings className="w-4 h-4 mr-2" />
            Ir para Configurações
          </Button>
        )}
        <Button onClick={onReset} variant="outline" className="border-red-200 hover:bg-red-100 dark:hover:bg-red-900/20">
          <RotateCcw className="w-4 h-4 mr-2" />
          Tentar Novamente
        </Button>
      </div>
    </div>
  );
};
