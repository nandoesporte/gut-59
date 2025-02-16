
interface MacroDistributionBarProps {
  macros: {
    protein: number;
    carbs: number;
    fats: number;
  };
}

export const MacroDistributionBar = ({ macros }: MacroDistributionBarProps) => {
  const total = macros.protein + macros.carbs + macros.fats;
  const proteinPercentage = (macros.protein / total) * 100;
  const carbsPercentage = (macros.carbs / total) * 100;
  const fatsPercentage = (macros.fats / total) * 100;

  return (
    <div className="w-full h-4 rounded-full overflow-hidden flex">
      <div 
        className="bg-blue-500" 
        style={{ width: `${proteinPercentage}%` }}
        title={`Proteínas: ${Math.round(proteinPercentage)}%`}
      />
      <div 
        className="bg-green-500" 
        style={{ width: `${carbsPercentage}%` }}
        title={`Carboidratos: ${Math.round(carbsPercentage)}%`}
      />
      <div 
        className="bg-yellow-500" 
        style={{ width: `${fatsPercentage}%` }}
        title={`Gorduras: ${Math.round(fatsPercentage)}%`}
      />
    </div>
  );
};
