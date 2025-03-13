
import { Card } from "@/components/ui/card";
import { Scale, ArrowRight, Dumbbell } from "lucide-react";
import { cn } from "@/lib/utils";

export type Goal = "lose" | "maintain" | "gain";

interface GoalCardsProps {
  selectedGoal: Goal | null;
  onSelect: (goal: Goal) => void;
}

const goals = [
  {
    id: "lose",
    label: "Perder peso",
    description: "Foco em queima de gordura",
    icon: Scale,
    color: "bg-rose-50",
    hoverColor: "hover:bg-rose-100",
    borderColor: "border-rose-200",
    iconColor: "text-rose-500",
    factor: 0.8
  },
  {
    id: "maintain",
    label: "Manter peso",
    description: "Melhorar condicionamento",
    icon: ArrowRight,
    color: "bg-sky-50",
    hoverColor: "hover:bg-sky-100",
    borderColor: "border-sky-200",
    iconColor: "text-sky-500",
    factor: 1
  },
  {
    id: "gain",
    label: "Ganhar massa",
    description: "Foco em hipertrofia",
    icon: Dumbbell,
    color: "bg-emerald-50",
    hoverColor: "hover:bg-emerald-100",
    borderColor: "border-emerald-200",
    iconColor: "text-emerald-500",
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
              "p-6 cursor-pointer transition-all duration-300 transform hover:scale-102 shadow-sm hover:shadow-md",
              goal.color,
              goal.hoverColor,
              "border-transparent",
              isSelected ? "ring-2 ring-teal-500 ring-offset-2" : ""
            )}
            onClick={() => onSelect(goal.id as Goal)}
          >
            <div className="flex flex-col items-center space-y-3">
              <div className={`p-2.5 rounded-full ${isSelected ? 'bg-white shadow-sm' : `bg-white/70`}`}>
                <Icon className={cn("w-7 h-7", goal.iconColor)} />
              </div>
              <div className="text-center">
                <span className="text-lg font-medium text-gray-800">
                  {goal.label}
                </span>
                <p className="text-sm text-gray-500 mt-1.5">
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
