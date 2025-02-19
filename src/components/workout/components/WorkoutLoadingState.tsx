
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface WorkoutLoadingStateProps {
  message: string;
}

export const WorkoutLoadingState = ({ message }: WorkoutLoadingStateProps) => {
  return (
    <Card className="p-4 md:p-6">
      <div className="flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        <p className="text-lg font-medium text-center">{message}</p>
      </div>
    </Card>
  );
};
