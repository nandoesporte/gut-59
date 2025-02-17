
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import SymptomTracker from "@/components/SymptomTracker";
import Education from "@/components/Education";
import ShoppingList from "@/components/ShoppingList";
import { MenuHeader } from "./MenuHeader";

interface InitialMenuContentProps {
  onStartDiet: () => void;
}

export const InitialMenuContent = ({ onStartDiet }: InitialMenuContentProps) => {
  return (
    <>
      <MenuHeader onStart={onStartDiet} />
      <div className="space-y-8 mt-8">
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
    </>
  );
};
