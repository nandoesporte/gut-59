
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import SymptomTracker from "@/components/SymptomTracker";
import Education from "@/components/Education";
import ShoppingList from "@/components/ShoppingList";
import { VideoInstructionDialog } from "@/components/instruction/VideoInstructionDialog";

interface InitialMenuContentProps {
  onStartDiet: () => void;
}

export const InitialMenuContent = ({ onStartDiet }: InitialMenuContentProps) => {
  return (
    <div className="space-y-8">
      <VideoInstructionDialog />
      
      <div className="w-full rounded-lg p-6">
        <p className="text-lg text-gray-700 leading-relaxed">
          Descubra o Protocolo de Modulação Intestinal, desenvolvido pelas nossas nutricionistas especialistas, para ajudar você a alcançar um equilíbrio digestivo e melhorar sua saúde intestinal.
        </p>
      </div>

      <div className="w-full rounded-lg">
        <Education />
      </div>

      <div className="w-full rounded-lg">
        <SymptomTracker />
      </div>

      <Card className="w-full p-4">
        <ScrollArea className="h-[500px]">
          <ShoppingList />
        </ScrollArea>
      </Card>
    </div>
  );
};
