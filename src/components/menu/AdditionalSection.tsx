
import { Plus } from "lucide-react";

interface AdditionalSectionProps {
  recommendations: string;
}

export const AdditionalSection = ({ recommendations }: AdditionalSectionProps) => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Plus className="h-5 w-5" />
        Adicionais na Dieta
      </h2>
      <div className="mt-4">
        <p className="text-gray-600">{recommendations}</p>
      </div>
    </div>
  );
};
