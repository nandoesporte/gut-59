
import { Card } from "@/components/ui/card";
import { Heart, Droplets, Brain, Scale, Dumbbell } from "lucide-react";
import { cn } from "@/lib/utils";

export type HealthCondition = 
  | "hipertensao" 
  | "diabetes" 
  | "depressao_ansiedade" 
  | "perda_peso" 
  | "ganho_massa";

interface HealthConditionCardsProps {
  selectedCondition: HealthCondition | null;
  onSelect: (condition: HealthCondition) => void;
}

const conditions = [
  {
    id: "hipertensao",
    label: "Hipertensão",
    icon: Heart,
    color: "bg-[#FDE1D3]",
    hoverColor: "hover:bg-[#FCD1BB]",
    borderColor: "border-orange-200",
    iconColor: "text-red-500"
  },
  {
    id: "diabetes",
    label: "Diabetes",
    icon: Droplets,
    color: "bg-[#D3E4FD]",
    hoverColor: "hover:bg-[#C1D8F9]",
    borderColor: "border-blue-200",
    iconColor: "text-blue-500"
  },
  {
    id: "depressao_ansiedade",
    label: "Depressão e Ansiedade",
    icon: Brain,
    color: "bg-[#E5DEFF]",
    hoverColor: "hover:bg-[#D7CDFF]",
    borderColor: "border-purple-200",
    iconColor: "text-purple-500"
  },
  {
    id: "perda_peso",
    label: "Perda de Peso",
    icon: Scale,
    color: "bg-[#F2FCE2]",
    hoverColor: "hover:bg-[#E5F7CC]",
    borderColor: "border-green-200",
    iconColor: "text-green-500"
  },
  {
    id: "ganho_massa",
    label: "Ganho de Massa",
    icon: Dumbbell,
    color: "bg-[#FEF7CD]",
    hoverColor: "hover:bg-[#FDF2B3]",
    borderColor: "border-yellow-200",
    iconColor: "text-yellow-600"
  }
];

export const HealthConditionCards = ({ selectedCondition, onSelect }: HealthConditionCardsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {conditions.map((condition) => {
        const Icon = condition.icon;
        const isSelected = selectedCondition === condition.id;
        
        return (
          <Card
            key={condition.id}
            className={cn(
              "p-6 cursor-pointer transition-all duration-200 transform hover:scale-105",
              condition.color,
              condition.hoverColor,
              condition.borderColor,
              isSelected ? "ring-2 ring-primary-500 ring-offset-2" : ""
            )}
            onClick={() => onSelect(condition.id as HealthCondition)}
          >
            <div className="flex flex-col items-center space-y-3">
              <Icon className={cn("w-8 h-8", condition.iconColor)} />
              <span className="text-lg font-medium text-gray-700 text-center">
                {condition.label}
              </span>
            </div>
          </Card>
        );
      })}
    </div>
  );
};
