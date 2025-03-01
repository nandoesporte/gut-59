
import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Network, RefreshCw } from "lucide-react";

interface ErrorDisplayProps {
  errorMessage: string | null;
  networkError: boolean;
  useGroqFallback: boolean;
  handleRetry: () => void;
  switchToGroq: () => void;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  errorMessage,
  networkError,
  useGroqFallback,
  handleRetry,
  switchToGroq,
}) => {
  if (!errorMessage) return null;

  return (
    <Alert variant="destructive" className="mt-4">
      {networkError ? (
        <Network className="h-4 w-4" />
      ) : (
        <AlertTriangle className="h-4 w-4" />
      )}
      <AlertDescription className="flex flex-col space-y-2">
        <span>{errorMessage}</span>
        <div className="flex space-x-2 mt-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="bg-transparent" 
            onClick={handleRetry}
          >
            <RefreshCw className="h-4 w-4 mr-1" /> Tentar novamente
          </Button>
          
          {networkError && !useGroqFallback && (
            <Button 
              variant="outline" 
              size="sm" 
              className="bg-transparent" 
              onClick={switchToGroq}
            >
              <Network className="h-4 w-4 mr-1" /> Usar serviço alternativo
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
};
