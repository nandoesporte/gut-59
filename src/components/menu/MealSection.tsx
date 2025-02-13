
import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";

interface ProtocolFood {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  food_group_id: number;
}

interface MealSectionProps {
  title: string;
  Icon: LucideIcon;
  foods: ProtocolFood[];
}

export const MealSection = ({ title, Icon, foods }: MealSectionProps) => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Icon className="h-5 w-5" />
        {title}
      </h2>
      <div className="mt-4 grid grid-cols-3 gap-3">
        {foods.map((food) => (
          <Button
            key={food.id}
            variant="outline"
            className="flex items-center justify-center p-2 h-auto text-sm"
          >
            {food.name}
          </Button>
        ))}
      </div>
    </div>
  );
};
