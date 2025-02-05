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
                className="p-4 border rounded-lg hover:shadow-md transition-shadow"
              >
                <h3 className="text-lg font-semibold text-primary-500 mb-2">
                  Fase {index + 1}: {phase.title}
                </h3>
                <p className="text-gray-600 mb-2">{phase.description}</p>
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-700">Regras principais:</h4>
                  <ul className="list-disc list-inside text-gray-600 space-y-1">
                    {phase.rules.map((rule, ruleIndex) => (
                      <li key={ruleIndex}>{rule}</li>
                    ))}
                  </ul>
                </div>
                <a
                  href="#"
                  className="inline-block mt-4 text-primary-500 hover:text-primary-600 font-medium"
                >
                  Ler mais →
                </a>
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
    description:
      "Dias 1-7: Foco na redução da inflamação, eliminação de toxinas e agentes prejudiciais.",
    rules: [
      "Evitar glúten, lactose, açúcar e ultraprocessados",
      "Incluir proteínas magras e vegetais cozidos",
      "Beber 2-3 litros de água por dia",
      "Mastigar bem os alimentos (30 vezes)",
    ],
  },
  {
    title: "Reequilíbrio da Microbiota",
    description:
      "Dias 8-14: Reintrodução de boas bactérias e fortalecimento da digestão.",
    rules: [
      "Introduzir probióticos naturais",
      "Aumentar consumo de prebióticos",
      "Reintroduzir grãos leves",
      "Praticar atividade física leve",
    ],
  },
  {
    title: "Reparo e Manutenção",
    description:
      "Dias 15-21: Fortalecimento da barreira intestinal e equilíbrio a longo prazo.",
    rules: [
      "Reintrodução gradual de alimentos",
      "Manter probióticos e prebióticos",
      "Consumo regular de caldo de ossos",
      "Foco na redução do estresse",
    ],
  },
];

export default Education;