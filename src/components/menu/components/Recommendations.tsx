
import { Card } from "@/components/ui/card";

interface RecommendationsProps {
  recommendations: {
    general?: string;
    preworkout?: string;
    postworkout?: string;
    timing?: string | string[];
  };
}

export const Recommendations = ({ recommendations }: RecommendationsProps) => {
  return (
    <Card className="p-6 mt-6">
      <h3 className="font-semibold text-lg text-green-700 mb-4">Recomendações</h3>
      <div className="space-y-4 text-gray-700">
        {recommendations.general && (
          <div>
            <h4 className="font-medium mb-2">Gerais:</h4>
            <p>{recommendations.general}</p>
          </div>
        )}
        
        {recommendations.preworkout && (
          <div>
            <h4 className="font-medium mb-2">Pré-treino:</h4>
            <p>{recommendations.preworkout}</p>
          </div>
        )}
        
        {recommendations.postworkout && (
          <div>
            <h4 className="font-medium mb-2">Pós-treino:</h4>
            <p>{recommendations.postworkout}</p>
          </div>
        )}
        
        {recommendations.timing && (
          <div>
            <h4 className="font-medium mb-2">Horários das refeições:</h4>
            {Array.isArray(recommendations.timing) ? (
              <ul className="list-disc pl-5 space-y-2">
                {recommendations.timing.map((tip, index) => (
                  <li key={index}>{tip}</li>
                ))}
              </ul>
            ) : (
              <p>{recommendations.timing}</p>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};
