
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion";
import { ChevronRight, Apple, HelpCircle, Calendar } from "lucide-react";

export const MenuHeader = ({ onStart }: { onStart: () => void }) => {
  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-none shadow-md">
        <div className="bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 p-6">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold text-emerald-800">Como Montar sua Dieta?</h1>
            <p className="text-emerald-700/80 leading-relaxed max-w-2xl mx-auto">
              Nosso sistema utiliza inteligência artificial elaborada por profissionais especializados, 
              mestres e doutores na área de nutrição e saúde, para criar um plano alimentar 
              personalizado com base nos seus dados e preferências.
            </p>
          </div>

          <div className="mt-8 bg-white rounded-xl p-5 shadow-sm">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="how" className="border-b border-emerald-100">
                <AccordionTrigger className="hover:text-emerald-700 py-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-emerald-100 p-2 rounded-full">
                      <HelpCircle className="h-4 w-4 text-emerald-600" />
                    </div>
                    <span>Como funciona?</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-emerald-700/80 pl-12">
                  O nosso sistema utiliza inteligência artificial para criar um plano alimentar personalizado 
                  baseado nos seus dados e preferências.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="receive" className="border-b border-emerald-100">
                <AccordionTrigger className="hover:text-emerald-700 py-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-emerald-100 p-2 rounded-full">
                      <Calendar className="h-4 w-4 text-emerald-600" />
                    </div>
                    <span>Como receber a Dieta?</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-emerald-700/80 pl-12">
                  Após preencher seus dados, você receberá um plano detalhado com todas as refeições 
                  e recomendações personalizadas.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="start" className="border-0">
                <AccordionTrigger className="hover:text-emerald-700 py-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-emerald-100 p-2 rounded-full">
                      <Apple className="h-4 w-4 text-emerald-600" />
                    </div>
                    <span>Como começar?</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-emerald-700/80 pl-12">
                  Clique no botão abaixo para começar a montar sua dieta personalizada.
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <Button 
              onClick={onStart}
              className="w-full mt-6 bg-green-500 hover:bg-green-600 text-white font-medium flex items-center justify-center gap-2 h-12"
            >
              MONTAR MINHA DIETA
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
