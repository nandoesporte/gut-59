
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export const MenuHeader = ({ onStart }: { onStart: () => void }) => {
  return (
    <div className="space-y-8">
      <Card className="p-6">
        <div className="text-center space-y-6">
          <h1 className="text-2xl font-bold text-gray-900">Como Montar sua Dieta?</h1>
          <p className="text-gray-600">
            Nosso sistema utiliza inteligência artificial elaborada por profissionais especializados, mestres e doutores na área de nutrição e saúde, para criar um plano alimentar personalizado com base nos seus dados e preferências. Combinamos tecnologia avançada com conhecimento científico para oferecer a você um cardápio equilibrado, adaptado ao seu estilo de vida e objetivos nutricionais
          </p>
        </div>

        <div className="mt-8">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="how">
              <AccordionTrigger>Como funciona?</AccordionTrigger>
              <AccordionContent>
                O nosso sistema utiliza inteligência artificial para criar um plano alimentar personalizado 
                baseado nos seus dados e preferências.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="receive">
              <AccordionTrigger>Como receber a Dieta?</AccordionTrigger>
              <AccordionContent>
                Após preencher seus dados, você receberá um plano detalhado com todas as refeições 
                e recomendações personalizadas.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="start">
              <AccordionTrigger>Como começar?</AccordionTrigger>
              <AccordionContent>
                Clique no botão abaixo para começar a montar sua dieta personalizada.
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <Button 
            onClick={onStart}
            className="w-full mt-6 bg-green-500 hover:bg-green-600 text-white"
          >
            MONTAR MINHA DIETA
          </Button>
        </div>
      </Card>
    </div>
  );
};
