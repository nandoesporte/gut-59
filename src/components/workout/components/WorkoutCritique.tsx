
import { ThumbsUp } from "lucide-react";
import { WorkoutPlan } from "../types/workout-plan";

interface WorkoutCritiqueProps {
  plan: WorkoutPlan;
}

export const WorkoutCritique = ({ plan }: WorkoutCritiqueProps) => {
  if (!plan.critique) return null;

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-medium border-b pb-2 mb-2">Análise do Plano</h3>
      
      {plan.critique.strengths && plan.critique.strengths.length > 0 && (
        <div className="mb-3">
          <p className="font-medium text-green-600 flex items-center">
            <ThumbsUp className="w-4 h-4 mr-1" /> Pontos Fortes:
          </p>
          <ul className="list-disc pl-5 mt-1">
            {plan.critique.strengths.map((strength: string, idx: number) => (
              <li key={idx}>{strength}</li>
            ))}
          </ul>
        </div>
      )}
      
      {plan.critique.suggestions && plan.critique.suggestions.length > 0 && (
        <div className="mb-3">
          <p className="font-medium text-amber-600">Sugestões:</p>
          <ul className="list-disc pl-5 mt-1">
            {plan.critique.suggestions.map((suggestion: string, idx: number) => (
              <li key={idx}>{suggestion}</li>
            ))}
          </ul>
        </div>
      )}
      
      {plan.critique.notes && (
        <div>
          <p className="font-medium text-gray-700">Notas Adicionais:</p>
          <p className="text-gray-600 mt-1">{plan.critique.notes}</p>
        </div>
      )}
    </div>
  );
};
