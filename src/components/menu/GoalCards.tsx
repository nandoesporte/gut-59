
import { Card } from "@/components/ui/card";
import { Scale, ArrowRight, Dumbbell } from "lucide-react";
import { cn } from "@/lib/utils";

export type Goal = "weight_loss" | "maintenance" | "muscle_gain";

interface GoalCardsProps {
  selectedGoal: Goal | null;
  onSelect: (goal: Goal) => void;
}

const goals = [
  {
    id: "weight_loss",
    label: "Perder peso",
    description: "Foco em queima de gordura",
    icon: Scale,
    color: "bg-primary-50",
    hoverColor: "hover:bg-primary-100",
    borderColor: "border-primary-200",
    iconColor: "text-primary-500",
    factor: 0.8
  },
  {
    id: "maintenance",
    label: "Manter peso",
    description: "Melhorar condicionamento",
    icon: ArrowRight,
    color: "bg-[#E8F4FF]",
    hoverColor: "hover:bg-[#D5EBFF]",
    borderColor: "border-blue-200",
    iconColor: "text-blue-500",
    factor: 1
  },
  {
    id: "muscle_gain",
    label: "Ganhar massa",
    description: "Foco em hipertrofia",
    icon: Dumbbell,
    color: "bg-[#F2FCE2]",
    hoverColor: "hover:bg-[#E5F7CC]",
    borderColor: "border-green-200",
    iconColor: "text-green-500",
    factor: 1.2
  }
];

export const GoalCards = ({ selectedGoal, onSelect }: GoalCardsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {goals.map((goal) => {
        const Icon = goal.icon;
        const isSelected = selectedGoal === goal.id;
        
        return (
          <Card
            key={goal.id}
            className={cn(
              "p-6 cursor-pointer transition-all duration-200 transform hover:scale-105",
              goal.color,
              goal.hoverColor,
              goal.borderColor,
              isSelected ? "ring-2 ring-primary-500 ring-offset-2" : ""
            )}
            onClick={() => onSelect(goal.id as Goal)}
          >
            <div className="flex flex-col items-center space-y-3">
              <Icon className={cn("w-8 h-8", goal.iconColor)} />
              <div className="text-center">
                <span className="text-lg font-medium text-gray-700">
                  {goal.label}
                </span>
                <p className="text-sm text-gray-500 mt-1">
                  {goal.description}
                </p>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};
