
import { Loader2 } from "lucide-react";

interface WorkoutLoadingStateProps {
  message: string;
}

export const WorkoutLoadingState = ({ message }: WorkoutLoadingStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 space-y-4 text-center animate-in fade-in-50">
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" />
        <div className="relative bg-primary/20 p-4 rounded-full">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      </div>
      <div className="space-y-2">
        <h3 className="text-xl font-semibold">{message}</h3>
        <p className="text-muted-foreground">
          Isso pode levar alguns segundos...
        </p>
      </div>
    </div>
  );
};
