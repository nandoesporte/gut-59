
import { Card } from "@/components/ui/card";
import { Heart, Droplets, Brain } from "lucide-react";
import { cn } from "@/lib/utils";

export type HealthCondition = 
  | "hipertensao" 
  | "diabetes" 
  | "depressao_ansiedade";

interface HealthConditionCardsProps {
  selectedCondition: HealthCondition | null;
  onSelect: (condition: HealthCondition) => void;
}

const conditions = [
  {
    id: "hipertensao",
    label: "Hipertensão",
    icon: Heart,
    color: "bg-red-50",
    hoverColor: "hover:bg-red-100",
    borderColor: "border-red-200",
    iconColor: "text-red-500"
  },
  {
    id: "diabetes",
    label: "Diabetes",
    icon: Droplets,
    color: "bg-blue-50",
    hoverColor: "hover:bg-blue-100",
    borderColor: "border-blue-200",
    iconColor: "text-blue-500"
  },
  {
    id: "depressao_ansiedade",
    label: "Depressão e Ansiedade",
    icon: Brain,
    color: "bg-purple-50",
    hoverColor: "hover:bg-purple-100",
    borderColor: "border-purple-200",
    iconColor: "text-purple-500"
  }
];

export const HealthConditionCards = ({ selectedCondition, onSelect }: HealthConditionCardsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {conditions.map((condition) => {
        const Icon = condition.icon;
        const isSelected = selectedCondition === condition.id;
        
        return (
          <Card
            key={condition.id}
            className={cn(
              "p-6 cursor-pointer transition-all duration-200 transform hover:scale-102 shadow-sm hover:shadow-md",
              condition.color,
              condition.hoverColor,
              "border-transparent",
              isSelected ? "ring-2 ring-teal-500 ring-offset-2" : ""
            )}
            onClick={() => onSelect(condition.id as HealthCondition)}
          >
            <div className="flex flex-col items-center space-y-3">
              <div className={`p-2.5 rounded-full ${isSelected ? 'bg-white shadow-sm' : 'bg-white/70'}`}>
                <Icon className={cn("w-7 h-7", condition.iconColor)} />
              </div>
              <span className="text-lg font-medium text-gray-800 text-center">
                {condition.label}
              </span>
            </div>
          </Card>
        );
      })}
    </div>
  );
};
