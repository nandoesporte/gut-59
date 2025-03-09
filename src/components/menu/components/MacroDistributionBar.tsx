
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface MacroDistributionBarProps {
  macros: {
    protein: number;
    carbs: number;
    fats: number;
  };
}

export const MacroDistributionBar = ({ macros }: MacroDistributionBarProps) => {
  const total = macros.protein + macros.carbs + macros.fats;
  
  // Avoid division by zero
  if (total === 0) {
    return <div className="w-full h-4 bg-gray-100 rounded-full"></div>;
  }

  const proteinPercentage = (macros.protein / total) * 100;
  const carbsPercentage = (macros.carbs / total) * 100;
  const fatsPercentage = (macros.fats / total) * 100;

  return (
    <TooltipProvider>
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-gray-500">
          <div>
            <span className="inline-block w-3 h-3 bg-blue-500 rounded-full mr-1"></span>
            Proteínas {Math.round(proteinPercentage)}%
          </div>
          <div>
            <span className="inline-block w-3 h-3 bg-green-500 rounded-full mr-1"></span>
            Carboidratos {Math.round(carbsPercentage)}%
          </div>
          <div>
            <span className="inline-block w-3 h-3 bg-yellow-500 rounded-full mr-1"></span>
            Gorduras {Math.round(fatsPercentage)}%
          </div>
        </div>
        
        <div className="w-full h-5 rounded-full overflow-hidden flex">
          <Tooltip>
            <TooltipTrigger asChild>
              <div 
                className="bg-blue-500 h-full" 
                style={{ width: `${proteinPercentage}%` }}
              />
            </TooltipTrigger>
            <TooltipContent>
              <p>Proteínas: {macros.protein}g ({Math.round(proteinPercentage)}%)</p>
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <div 
                className="bg-green-500 h-full" 
                style={{ width: `${carbsPercentage}%` }}
              />
            </TooltipTrigger>
            <TooltipContent>
              <p>Carboidratos: {macros.carbs}g ({Math.round(carbsPercentage)}%)</p>
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <div 
                className="bg-yellow-500 h-full" 
                style={{ width: `${fatsPercentage}%` }}
              />
            </TooltipTrigger>
            <TooltipContent>
              <p>Gorduras: {macros.fats}g ({Math.round(fatsPercentage)}%)</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
};
