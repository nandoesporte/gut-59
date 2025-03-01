
import { Loader2 } from "lucide-react";

export const MenuLoader = () => {
  return (
    <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-4">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
      <div className="text-center px-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Gerando seu plano alimentar personalizado...
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          Este processo pode levar de 1 a 2 minutos.
          <br />
          Por favor, aguarde enquanto preparamos seu cardápio.
        </p>
      </div>
    </div>
  );
};
