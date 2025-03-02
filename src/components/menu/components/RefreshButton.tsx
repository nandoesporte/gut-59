
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

interface RefreshButtonProps {
  onRefresh: () => Promise<void>;
  refreshing: boolean;
  hasRefreshFunction: boolean;
}

export const RefreshButton = ({ onRefresh, refreshing, hasRefreshFunction }: RefreshButtonProps) => {
  return (
    <div className="mt-8 flex justify-center">
      <Button
        onClick={onRefresh}
        disabled={refreshing || !hasRefreshFunction}
        className="hover:bg-primary/5"
        variant="outline"
        size="lg"
      >
        <RotateCcw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
        {refreshing ? 'Atualizando...' : 'Atualizar Plano'}
      </Button>
    </div>
  );
};
