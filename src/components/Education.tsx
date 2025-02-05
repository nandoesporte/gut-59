import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Book } from "lucide-react";

const Education = () => {
  return (
    <div className="space-y-6">
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="flex flex-row items-center space-x-2">
          <Book className="w-6 h-6 text-primary-500" />
          <CardTitle className="text-2xl text-primary-500">
            Protocolo de Modulação Intestinal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6">
            {phases.map((phase, index) => (
              <article
                key={index}
                className="p-6 border rounded-lg hover:shadow-md transition-shadow bg-white"
              >
                <h3 className="text-xl font-semibold text-primary-500 mb-3">
                  Fase {index + 1}: {phase.title}
                </h3>
                <p className="text-gray-600 mb-4">{phase.description}</p>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Regras principais:</h4>
                    <ul className="list-disc list-inside text-gray-600 space-y-2">
                      {phase.rules.map((rule, ruleIndex) => (
                        <li key={ruleIndex} className="leading-relaxed">{rule}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Alimentos Recomendados:</h4>
                    <ul className="list-disc list-inside text-gray-600 space-y-2">
                      {phase.recommendedFoods.map((food, foodIndex) => (
                        <li key={foodIndex} className="leading-relaxed">{food}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Suplementos:</h4>
                    <ul className="list-disc list-inside text-gray-600 space-y-2">
                      {phase.supplements.map((supplement, suppIndex) => (
                        <li key={suppIndex} className="leading-relaxed">{supplement}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <button className="mt-4 text-primary-500 hover:text-primary-600 font-medium flex items-center space-x-1">
                  <span>Ler mais</span>
                  <span>→</span>
                </button>
              </article>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const phases = [
  {
    title: "Remoção e Desintoxicação",
    description: "Dias 1-7: Foco na redução da inflamação, eliminação de toxinas e agentes prejudiciais.",
    rules: [
      "Evitar glúten, lactose, açúcar e ultraprocessados",
      "Incluir proteínas magras e vegetais cozidos",
      "Beber 2-3 litros de água por dia",
      "Mastigar bem os alimentos (30 vezes)",
      "Evitar café e bebidas alcoólicas"
    ],
    recommendedFoods: [
      "Ovos e proteínas magras",
      "Vegetais cozidos",
      "Abacate e azeite de oliva",
      "Chás digestivos",
      "Caldo de ossos"
    ],
    supplements: [
      "Carvão ativado (se indicado)",
      "Glutamina (5g)",
      "Probióticos específicos",
      "Enzimas digestivas"
    ]
  },
  {
    title: "Reequilíbrio da Microbiota",
    description: "Dias 8-14: Reintrodução de boas bactérias e fortalecimento da digestão.",
    rules: [
      "Introduzir probióticos naturais",
      "Aumentar consumo de prebióticos",
      "Reintroduzir grãos leves",
      "Praticar atividade física leve",
      "Manter boa hidratação"
    ],
    recommendedFoods: [
      "Kefir e iogurte natural sem lactose",
      "Biomassa de banana verde",
      "Quinoa e amaranto",
      "Vegetais fermentados",
      "Kombucha"
    ],
    supplements: [
      "Probióticos específicos",
      "Glutamina (5g)",
      "Ômega 3",
      "Vitamina D"
    ]
  },
  {
    title: "Reparo e Manutenção",
    description: "Dias 15-21: Fortalecimento da barreira intestinal e equilíbrio a longo prazo.",
    rules: [
      "Reintrodução gradual de alimentos",
      "Manter probióticos e prebióticos",
      "Consumo regular de caldo de ossos",
      "Foco na redução do estresse",
      "Priorizar sono de qualidade"
    ],
    recommendedFoods: [
      "Feijões e lentilhas (pequenas porções)",
      "Laticínios fermentados",
      "Frutas e vegetais variados",
      "Proteínas de qualidade",
      "Grãos integrais"
    ],
    supplements: [
      "Probióticos de manutenção",
      "Colágeno",
      "Vitaminas do complexo B",
      "Magnésio"
    ]
  }
];

export default Education;