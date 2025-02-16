
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronDown } from "lucide-react";
import SymptomTracker from "@/components/SymptomTracker";
import Education from "@/components/Education";
import ShoppingList from "@/components/ShoppingList";
import { MenuHeader } from "./MenuHeader";
import { useState } from "react";

interface InitialMenuContentProps {
  onStartDiet: () => void;
}

export const InitialMenuContent = ({ onStartDiet }: InitialMenuContentProps) => {
  const [showShopping, setShowShopping] = useState(false);

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

        <Card className="bg-[#F2FCE2] shadow-sm border border-green-100">
          <div className="p-4">
            <Button
              variant="ghost"
              onClick={() => setShowShopping(!showShopping)}
              className="w-full flex justify-between items-center text-green-500 hover:text-green-600 hover:bg-green-50"
            >
              <span className="font-semibold">Lista de Compras</span>
              <ChevronDown className={`transform transition-transform ${showShopping ? 'rotate-180' : ''}`} />
            </Button>
            {showShopping && (
              <div className="mt-4">
                <ScrollArea className="h-[500px]">
                  <ShoppingList />
                </ScrollArea>
              </div>
            )}
          </div>
        </Card>
      </div>
    </>
  );
};
