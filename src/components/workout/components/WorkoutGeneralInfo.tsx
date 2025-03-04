
import { WorkoutPlan } from "../types/workout-plan";

interface WorkoutGeneralInfoProps {
  plan: WorkoutPlan;
}

export const WorkoutGeneralInfo = ({ plan }: WorkoutGeneralInfoProps) => {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-medium border-b pb-2 mb-2">Informações Gerais</h3>
      <p><strong>Objetivo:</strong> {plan.goal}</p>
      <p><strong>Data de Início:</strong> {new Date(plan.start_date).toLocaleDateString('pt-BR')}</p>
      <p><strong>Data de Término:</strong> {new Date(plan.end_date).toLocaleDateString('pt-BR')}</p>
    </div>
  );
};
