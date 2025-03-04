
import { WorkoutSession } from "../types/workout-plan";

interface TrainingLoadInfoProps {
  session: WorkoutSession;
}

export const TrainingLoadInfo = ({ session }: TrainingLoadInfoProps) => {
  if (!session.training_load) return null;
  
  return (
    <div className="bg-gray-100 rounded-lg p-4">
      <h4 className="font-medium text-gray-800 mb-2">Carga de Treino</h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {session.training_load.intensity && (
          <div>
            <span className="text-sm font-medium text-gray-700">Intensidade:</span>
            <p className="text-sm">{session.training_load.intensity}</p>
          </div>
        )}
        {session.training_load.volume && (
          <div>
            <span className="text-sm font-medium text-gray-700">Volume:</span>
            <p className="text-sm">{session.training_load.volume}</p>
          </div>
        )}
        {session.training_load.progression && (
          <div>
            <span className="text-sm font-medium text-gray-700">Progressão:</span>
            <p className="text-sm">{session.training_load.progression}</p>
          </div>
        )}
      </div>
    </div>
  );
};
