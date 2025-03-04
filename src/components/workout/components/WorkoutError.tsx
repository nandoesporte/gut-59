
import { Button } from "@/components/ui/button";
import { RotateCcw, AlertCircle, Settings, Wifi, RefreshCw, Clock } from "lucide-react";
import { useNavigate } from 'react-router-dom';

interface WorkoutErrorProps {
  onReset: () => void;
  errorMessage?: string;
}

export const WorkoutError = ({ onReset, errorMessage }: WorkoutErrorProps) => {
  const navigate = useNavigate();
  
  // Determine error type
  const isGroqKeyError = errorMessage?.includes("Groq API key") || 
                         errorMessage?.includes("API Groq") ||
                         errorMessage?.includes("Invalid API Key") ||
                         errorMessage?.includes("invalid_api_key") ||
                         errorMessage?.includes("Validation errors");
                         
  const isGroqJsonError = errorMessage?.includes("Groq API Error") && 
                          errorMessage?.includes("json_validate_failed");

  const isConnectionError = errorMessage?.includes("Failed to send a request") || 
                           errorMessage?.includes("Failed to fetch") ||
                           errorMessage?.includes("Network Error") ||
                           errorMessage?.includes("net::ERR") ||
                           errorMessage?.includes("ECONNREFUSED") ||
                           errorMessage?.includes("timeout") ||
                           errorMessage?.includes("AbortError") ||
                           errorMessage?.includes("connection closed") ||
                           errorMessage?.includes("Connection closed") ||
                           errorMessage?.includes("Erro de conexão");

  const isShutdownError = errorMessage?.includes("shutdown") || 
                          errorMessage?.includes("timeout") ||
                          errorMessage?.includes("aborted") ||
                          errorMessage?.includes("net::ERR_CONNECTION_RESET") ||
                          errorMessage?.includes("connection reset");
                          
  const isEmptyResponseError = errorMessage?.includes("resposta vazia") ||
                              errorMessage?.includes("Resposta não contém plano") ||
                              errorMessage?.includes("Não foi possível gerar o plano de treino - resposta vazia");

  const hasValidationErrors = errorMessage?.includes("Validation errors");
  const hasParsingErrors = errorMessage?.includes("Error parsing workout plan JSON") || 
                           errorMessage?.includes("SyntaxError") ||
                           errorMessage?.includes("json_validate_failed");

  return (
    <div className="text-center space-y-4 p-12 border border-red-200 rounded-lg bg-red-50 dark:bg-red-900/10">
      <div className="flex justify-center">
        <div className="bg-red-100 dark:bg-red-900/20 p-3 rounded-full">
          {isConnectionError ? (
            <Wifi className="w-8 h-8 text-red-600 dark:text-red-400" />
          ) : isEmptyResponseError ? (
            <Clock className="w-8 h-8 text-red-600 dark:text-red-400" />
          ) : (
            <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          )}
        </div>
      </div>
      
      <h3 className="text-xl font-semibold text-red-600 dark:text-red-400">
        {isConnectionError 
          ? "Erro de conexão ao gerar o plano de treino" 
          : isEmptyResponseError
          ? "O serviço não retornou um plano de treino válido"
          : "Erro ao gerar o plano de treino com Trenner2025"}
      </h3>
      
      <p className="text-muted-foreground">
        {errorMessage || "Não foi possível gerar seu plano. Por favor, tente novamente."}
      </p>

      <div className="bg-red-100 dark:bg-red-900/10 p-4 rounded-lg text-left text-sm max-w-2xl mx-auto">
        <p className="font-semibold mb-2">Como resolver:</p>
        <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
          {isGroqKeyError ? (
            <>
              <li>É necessário configurar uma chave API válida da Groq na página de administração</li>
              {hasValidationErrors && (
                <li className="text-red-600">
                  A chave atual contém erros de validação e precisa ser substituída por uma nova chave válida
                </li>
              )}
              <li>O agente Trenner2025 usa a API Groq com o modelo Llama 3 para funcionar</li>
              <li>Obtenha uma chave gratuita em <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="underline text-blue-600 dark:text-blue-400">console.groq.com/keys</a></li>
              <li>As chaves da Groq sempre começam com <code className="bg-red-200 dark:bg-red-800/30 p-1 rounded text-xs">gsk_</code> seguido por uma string alfanumérica</li>
              <li>Vá para <code className="bg-red-200 dark:bg-red-800/30 p-1 rounded text-xs">Admin &gt; Treino &gt; Modelos de IA</code> e adicione a chave da API</li>
              <li>Se você já adicionou uma chave, verifique se ela está correta e válida</li>
            </>
          ) : isGroqJsonError ? (
            <>
              <li>O modelo de IA falhou ao gerar um JSON válido para o plano de treino</li>
              <li>Este é um erro na resposta do serviço Groq (Llama 3)</li>
              <li>Tente simplificar suas preferências de treino e gerar novamente</li>
              <li>Por exemplo, selecione menos tipos de exercícios ou equipamentos</li>
              <li>Se o problema persistir, você pode tentar novamente mais tarde</li>
              <li>O erro pode ser temporário devido à instabilidade do modelo</li>
            </>
          ) : isConnectionError ? (
            <>
              <li>Não foi possível conectar ao serviço de geração de plano de treino</li>
              <li>Verifique sua conexão com a internet e tente novamente</li>
              <li>Se você está usando uma VPN ou proxy, tente desativá-los temporariamente</li>
              <li>O serviço pode estar temporariamente indisponível. Aguarde alguns minutos e tente novamente</li>
              <li>Se o problema persistir, pode haver uma interrupção no serviço</li>
              <li>Você também pode tentar usar um navegador diferente ou limpar o cache</li>
              <li><strong>Tente recarregar a página completamente</strong> para restaurar a conexão</li>
            </>
          ) : isEmptyResponseError ? (
            <>
              <li>O serviço foi executado com sucesso, mas não retornou um plano de treino válido</li>
              <li>Este pode ser um problema temporário do serviço</li>
              <li>Tente simplificar suas preferências de treino e gerar novamente</li>
              <li>Tente novamente em alguns minutos</li>
              <li>Você pode verificar na aba "Resposta da IA" se há alguma informação sobre o problema</li>
              <li>Se o problema persistir, entre em contato com o suporte</li>
            </>
          ) : isShutdownError ? (
            <>
              <li>O serviço de geração de plano de treino foi interrompido ou atingiu o tempo limite</li>
              <li>Isso pode acontecer quando o servidor está sobrecarregado ou quando a solicitação é muito complexa</li>
              <li>Tente simplificar suas preferências de treino (selecione menos tipos de exercícios)</li>
              <li>Tente novamente em alguns minutos quando o servidor estiver menos ocupado</li>
              <li>Se o problema persistir, entre em contato com o suporte técnico</li>
            </>
          ) : hasParsingErrors ? (
            <>
              <li>Ocorreu um erro ao processar a resposta do modelo de IA</li>
              <li>Isso pode acontecer quando o modelo gera uma resposta malformatada</li>
              <li>Tente simplificar suas preferências de treino e gerar novamente</li>
              <li>Selecione menos tipos de exercícios ou equipamentos</li>
              <li>Se o problema persistir, entre em contato com o suporte</li>
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
          <Button onClick={() => navigate('/admin')} variant="default" className="bg-blue-600 hover:bg-blue-700">
            <Settings className="w-4 h-4 mr-2" />
            Ir para Configurações
          </Button>
        )}
        
        <Button 
          onClick={onReset} 
          variant="outline" 
          className="border-red-200 hover:bg-red-100 dark:hover:bg-red-900/20"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Tentar Novamente
        </Button>
        
        {isConnectionError && (
          <Button 
            onClick={() => window.location.reload()} 
            variant="default" 
            className="bg-blue-600 hover:bg-blue-700"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Recarregar Página
          </Button>
        )}
      </div>
    </div>
  );
};
