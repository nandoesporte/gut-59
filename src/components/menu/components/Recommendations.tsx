
import { Card } from "@/components/ui/card";

interface RecommendationsProps {
  recommendations: {
    general?: string;
    timing?: string[];
  };
}

export const Recommendations = ({ recommendations }: RecommendationsProps) => {
  if (!recommendations.general && !recommendations.timing?.length) return null;

  return (
    <Card className="p-6 mt-6">
      <h3 className="font-semibold text-lg text-green-700 mb-4">Recomendações</h3>
      <div className="space-y-4 text-gray-700">
        {recommendations.general && (
          <p>{recommendations.general}</p>
        )}
        {recommendations.timing && (
          <ul className="list-disc pl-5 space-y-2">
            {recommendations.timing.map((tip, index) => (
              <li key={index}>{tip}</li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
};
