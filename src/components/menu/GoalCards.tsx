
import { Card } from "@/components/ui/card";
import { Scale, ArrowRight, Dumbbell } from "lucide-react";
import { cn } from "@/lib/utils";

export type Goal = "lose_weight" | "maintain" | "gain_mass";

interface GoalCardsProps {
  selectedGoal: Goal | null;
  onSelect: (goal: Goal) => void;
}

const goals = [
  {
    id: "lose_weight",
    label: "Perder peso",
    icon: Scale,
    color: "bg-[#FFE8E8]",
    hoverColor: "hover:bg-[#FFD5D5]",
    borderColor: "border-red-200",
    iconColor: "text-red-500",
    factor: 0.8
  },
  {
    id: "maintain",
    label: "Manter peso",
    icon: ArrowRight,
    color: "bg-[#E8F4FF]",
    hoverColor: "hover:bg-[#D5EBFF]",
    borderColor: "border-blue-200",
    iconColor: "text-blue-500",
    factor: 1
  },
  {
    id: "gain_mass",
    label: "Ganhar massa",
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
              <span className="text-lg font-medium text-gray-700 text-center">
                {goal.label}
              </span>
            </div>
          </Card>
        );
      })}
    </div>
  );
};
