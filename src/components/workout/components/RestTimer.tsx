
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PlayCircle, PauseCircle, RotateCcw } from "lucide-react";

interface RestTimerProps {
  duration: number;
  onComplete?: () => void;
}

export const RestTimer = ({ duration, onComplete }: RestTimerProps) => {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isActive, setIsActive] = useState(false);
  
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((time) => {
          if (time <= 1) {
            setIsActive(false);
            onComplete?.();
            return 0;
          }
          return time - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isActive, timeLeft, onComplete]);

  const toggleTimer = () => setIsActive(!isActive);
  
  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(duration);
  };

  const progress = ((duration - timeLeft) / duration) * 100;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-2xl font-bold">{timeLeft}s</span>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="icon"
            onClick={toggleTimer}
          >
            {isActive ? (
              <PauseCircle className="h-5 w-5" />
            ) : (
              <PlayCircle className="h-5 w-5" />
            )}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={resetTimer}
          >
            <RotateCcw className="h-5 w-5" />
          </Button>
        </div>
      </div>
      <Progress value={progress} />
    </div>
  );
};
