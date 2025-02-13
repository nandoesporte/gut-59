
import { Dumbbell } from "lucide-react";

interface TrainingSectionProps {
  preworkout: string;
  postworkout: string;
}

export const TrainingSection = ({ preworkout, postworkout }: TrainingSectionProps) => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Dumbbell className="h-5 w-5" />
        Treinos e Atividades
      </h2>
      <div className="mt-4 space-y-4">
        <div>
          <h4 className="font-medium mb-2">Pré-treino:</h4>
          <p className="text-gray-600">{preworkout}</p>
        </div>
        <div>
          <h4 className="font-medium mb-2">Pós-treino:</h4>
          <p className="text-gray-600">{postworkout}</p>
        </div>
      </div>
    </div>
  );
};
