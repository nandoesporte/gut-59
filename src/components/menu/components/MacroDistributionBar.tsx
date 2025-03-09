
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface MacroDistributionBarProps {
  protein: number;
  carbs: number;
  fats: number;
}

export const MacroDistributionBar = ({ protein, carbs, fats }: MacroDistributionBarProps) => {
  const total = protein + carbs + fats;
  const proteinPercentage = total > 0 ? Math.round((protein / total) * 100) : 0;
  const carbsPercentage = total > 0 ? Math.round((carbs / total) * 100) : 0;
  const fatsPercentage = total > 0 ? Math.round((fats / total) * 100) : 0;

  // Ajuste para garantir que a soma seja 100%
  const adjustedProteinPercentage = proteinPercentage;
  const adjustedCarbsPercentage = carbsPercentage;
  const adjustedFatsPercentage = 100 - proteinPercentage - carbsPercentage;

  return (
    <div className="space-y-2">
      <div className="flex h-6 w-full overflow-hidden rounded-full bg-gray-100">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className="bg-blue-500 h-full transition-all duration-500"
                style={{ width: `${adjustedProteinPercentage}%` }}
              />
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-medium">Proteínas: {protein}g ({proteinPercentage}%)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className="bg-green-500 h-full transition-all duration-500"
                style={{ width: `${adjustedCarbsPercentage}%` }}
              />
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-medium">Carboidratos: {carbs}g ({carbsPercentage}%)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className="bg-amber-500 h-full transition-all duration-500"
                style={{ width: `${adjustedFatsPercentage}%` }}
              />
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-medium">Gorduras: {fats}g ({fatsPercentage}%)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="flex justify-between text-xs text-gray-500">
        <div className="flex items-center">
          <div className="w-3 h-3 bg-blue-500 rounded-full mr-1"></div>
          <span>Proteínas ({proteinPercentage}%)</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-green-500 rounded-full mr-1"></div>
          <span>Carboidratos ({carbsPercentage}%)</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-amber-500 rounded-full mr-1"></div>
          <span>Gorduras ({fatsPercentage}%)</span>
        </div>
      </div>
    </div>
  );
};
