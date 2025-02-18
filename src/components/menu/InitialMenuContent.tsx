
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import SymptomTracker from "@/components/SymptomTracker";
import Education from "@/components/Education";
import ShoppingList from "@/components/ShoppingList";
import { MenuHeader } from "./MenuHeader";
import { Dumbbell } from "lucide-react";

interface InitialMenuContentProps {
  onStartDiet: () => void;
}

export const InitialMenuContent = ({ onStartDiet }: InitialMenuContentProps) => {
  return (
    <div className="space-y-8">
      <MenuHeader onStart={onStartDiet} />
      
      <Card className="p-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Plano de Treino</h2>
            <Link to="/workout">
              <Button variant="outline" className="flex items-center gap-2">
                <Dumbbell className="w-5 h-5" />
                Acessar Treinos
              </Button>
            </Link>
          </div>
          <p className="text-gray-600">
            Acesse seu plano de treino personalizado, com exercícios específicos para seus objetivos e nível de condicionamento físico.
          </p>
        </div>
      </Card>

      <div className="bg-[#F2FCE2] rounded-lg shadow-sm p-6 border border-green-100">
        <p className="text-lg text-gray-700 leading-relaxed">
          Descubra o Protocolo de Modulação Intestinal, desenvolvido pelas nossas nutricionistas especialistas, para ajudar você a alcançar um equilíbrio digestivo e melhorar sua saúde intestinal.
        </p>
      </div>

      <div className="bg-[#F2FCE2] rounded-lg shadow-sm p-6 border border-green-100">
        <Education />
      </div>

      <div className="bg-[#F2FCE2] rounded-lg shadow-sm p-6 border border-green-100">
        <SymptomTracker />
      </div>

      <Card className="bg-[#F2FCE2] shadow-sm border border-green-100 p-4">
        <ScrollArea className="h-[500px]">
          <ShoppingList />
        </ScrollArea>
      </Card>
    </div>
  );
};
