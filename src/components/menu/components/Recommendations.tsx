
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { InfoIcon, Dumbbell, Clock } from "lucide-react";

interface RecommendationsProps {
  recommendations: {
    general?: string;
    preworkout?: string;
    postworkout?: string;
    timing?: string[];
  };
}

// Função para traduzir recomendações comuns
const translateRecommendation = (text: string): string => {
  if (!text) return "";
  
  const translations: Record<string, string> = {
    // Recomendações gerais
    "Consume natural foods": "Consuma alimentos naturais",
    "Avoid processed": "Evite processados",
    "Stay hydrated": "Mantenha-se hidratado",
    "throughout the day": "ao longo do dia",
    "Eat a variety of": "Coma uma variedade de",
    "fruits and vegetables": "frutas e vegetais",
    "Prefer whole grains": "Prefira grãos integrais",
    "Limit sugar intake": "Limite a ingestão de açúcar",
    "Control portion sizes": "Controle o tamanho das porções",
    
    // Pré-treino
    "Consume easily digestible carbs": "Consuma carboidratos de fácil digestão",
    "before your workout": "antes do seu treino",
    "for energy": "para energia",
    "Avoid heavy meals": "Evite refeições pesadas",
    "before training": "antes do treino",
    
    // Pós-treino
    "After workout": "Após o treino",
    "combine proteins and carbs": "combine proteínas e carboidratos",
    "for muscle recovery": "para recuperação muscular",
    "Hydrate well": "Hidrate-se bem",
    "after exercise": "após o exercício",
    
    // Diversos
    "Eat breakfast": "Tome café da manhã",
    "within 1 hour of waking up": "dentro de 1 hora após acordar",
    "Keep meals": "Mantenha refeições",
    "3-4 hours apart": "com 3-4 horas de intervalo",
    "Include protein": "Inclua proteína",
    "in all meals": "em todas as refeições",
    "Drink 30-40ml of water": "Beba 30-40ml de água",
    "per kg of body weight": "por kg de peso corporal",
    "Avoid heavy meals": "Evite refeições pesadas",
    "2 hours before sleep": "2 horas antes de dormir"
  };
  
  let translated = text;
  
  // Substituir termos conhecidos
  Object.entries(translations).forEach(([en, pt]) => {
    translated = translated.replace(new RegExp(en, 'gi'), pt);
  });
  
  return translated;
};

export const Recommendations = ({ recommendations }: RecommendationsProps) => {
  if (!recommendations) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-lg mb-2 flex items-center">
        <InfoIcon className="mr-2 h-5 w-5 text-blue-500" />
        Recomendações Nutricionais
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {recommendations.general && (
          <Card>
            <CardContent className="p-4">
              <h4 className="font-semibold text-sm mb-2 text-gray-700">RECOMENDAÇÕES GERAIS</h4>
              <p className="text-sm text-gray-600">{translateRecommendation(recommendations.general)}</p>
            </CardContent>
          </Card>
        )}

        {recommendations.preworkout && (
          <Card>
            <CardContent className="p-4">
              <h4 className="font-semibold text-sm mb-2 text-gray-700 flex items-center">
                <Dumbbell className="mr-1 h-4 w-4 text-orange-500" />
                PRÉ-TREINO
              </h4>
              <p className="text-sm text-gray-600">{translateRecommendation(recommendations.preworkout)}</p>
            </CardContent>
          </Card>
        )}

        {recommendations.postworkout && (
          <Card>
            <CardContent className="p-4">
              <h4 className="font-semibold text-sm mb-2 text-gray-700 flex items-center">
                <Dumbbell className="mr-1 h-4 w-4 text-green-500" />
                PÓS-TREINO
              </h4>
              <p className="text-sm text-gray-600">{translateRecommendation(recommendations.postworkout)}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {recommendations.timing && recommendations.timing.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h4 className="font-semibold text-sm mb-2 text-gray-700 flex items-center">
              <Clock className="mr-1 h-4 w-4 text-purple-500" />
              CRONOGRAMA ALIMENTAR
            </h4>
            <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
              {recommendations.timing.map((tip, index) => (
                <li key={index}>{translateRecommendation(tip)}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
