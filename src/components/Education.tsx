import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Book } from "lucide-react";

const Education = () => {
  return (
    <div className="space-y-6">
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="flex flex-row items-center space-x-2">
          <Book className="w-6 h-6 text-primary-500" />
          <CardTitle className="text-2xl text-primary-500">
            Conteúdo Educativo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6">
            {educationalContent.map((content, index) => (
              <article
                key={index}
                className="p-4 border rounded-lg hover:shadow-md transition-shadow"
              >
                <h3 className="text-lg font-semibold text-primary-500 mb-2">
                  {content.title}
                </h3>
                <p className="text-gray-600 mb-4">{content.description}</p>
                <a
                  href="#"
                  className="text-primary-500 hover:text-primary-600 font-medium"
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

const educationalContent = [
  {
    title: "Microbiota Intestinal: O que você precisa saber",
    description:
      "Aprenda sobre o papel fundamental das bactérias intestinais na sua saúde.",
  },
  {
    title: "Fibras: Seus aliados na saúde intestinal",
    description:
      "Descubra como diferentes tipos de fibras podem melhorar seu funcionamento intestinal.",
  },
  {
    title: "Probióticos e Prebióticos",
    description:
      "Entenda a diferença entre probióticos e prebióticos e como eles podem te ajudar.",
  },
];

export default Education;