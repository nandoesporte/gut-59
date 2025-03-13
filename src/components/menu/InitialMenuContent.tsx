
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import SymptomTracker from "@/components/SymptomTracker";
import Education from "@/components/Education";
import ShoppingList from "@/components/ShoppingList";
import { VideoInstructionDialog } from "@/components/instruction/VideoInstructionDialog";
import { Lightbulb, CheckCircle2 } from "lucide-react";

interface InitialMenuContentProps {
  onStartDiet: () => void;
}

export const InitialMenuContent = ({ onStartDiet }: InitialMenuContentProps) => {
  return (
    <div className="space-y-8">
      <VideoInstructionDialog />
      
      <Card className="w-full rounded-lg border-none shadow-md overflow-hidden">
        <div className="bg-gradient-to-r from-cyan-50 to-teal-50 p-4 flex items-center gap-3">
          <div className="bg-cyan-100 p-2 rounded-full">
            <Lightbulb className="h-5 w-5 text-cyan-600" />
          </div>
          <h3 className="text-lg font-semibold text-cyan-800">Sobre o Protocolo</h3>
        </div>
        <div className="p-6">
          <p className="text-lg text-gray-700 leading-relaxed">
            Descubra o Protocolo de Modulação Intestinal, desenvolvido pelas nossas nutricionistas 
            especialistas, para ajudar você a alcançar um equilíbrio digestivo e melhorar sua saúde 
            intestinal.
          </p>
          
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-start gap-3 p-4 bg-cyan-50 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-cyan-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-cyan-800">Abordagem Cientifica</h4>
                <p className="text-sm text-cyan-700/80 mt-1">
                  Baseado em pesquisas e evidências médicas atualizadas.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-cyan-50 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-cyan-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-cyan-800">Personalização</h4>
                <p className="text-sm text-cyan-700/80 mt-1">
                  Adaptado às suas necessidades e condições específicas.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="w-full rounded-lg">
        <Education />
      </div>

      <div className="w-full rounded-lg">
        <SymptomTracker />
      </div>

      <Card className="w-full border-none shadow-md overflow-hidden">
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 flex items-center gap-3">
          <div className="bg-amber-100 p-2 rounded-full">
            <CheckCircle2 className="h-5 w-5 text-amber-600" />
          </div>
          <h3 className="text-lg font-semibold text-amber-800">Lista de Compras</h3>
        </div>
        <div className="p-4">
          <ScrollArea className="h-[500px] pr-4">
            <ShoppingList />
          </ScrollArea>
        </div>
      </Card>
    </div>
  );
};
