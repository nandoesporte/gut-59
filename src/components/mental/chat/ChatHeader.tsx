
import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BrainCircuit } from "lucide-react";

export const ChatHeader: React.FC = () => {
  return (
    <Alert variant="default" className="mb-4 bg-blue-50 border-blue-200">
      <BrainCircuit className="h-4 w-4 text-blue-600" />
      <AlertDescription className="text-blue-800">
        Essa mensagem será excluída imediatamente após fechar este chat. Não armazenamos suas mensagens!
      </AlertDescription>
    </Alert>
  );
};
