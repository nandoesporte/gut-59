
import React from 'react';
import { RehabPlan } from '@/components/fisio/types/rehab-plan';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, Calendar } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface FisioHistoryViewProps {
  isLoading: boolean;
  historyPlans: RehabPlan[];
  onRefresh: () => void;
  selectedPlanId?: string | null;
}

export const FisioHistoryView = ({ 
  isLoading, 
  historyPlans, 
  onRefresh,
  selectedPlanId
}: FisioHistoryViewProps) => {
  const isMobile = useIsMobile();

  const renderGoal = (goal: string | undefined) => {
    if (!goal) return 'Alívio de Dor';
    
    switch (goal) {
      case 'pain_relief': return 'Alívio de Dor';
      case 'mobility': return 'Mobilidade';
      case 'strength': return 'Fortalecimento';
      case 'return_to_sport': return 'Retorno ao Esporte';
      default: return 'Alívio de Dor';
    }
  };

  const renderCondition = (condition: string | undefined) => {
    if (!condition) return 'Condição não especificada';
    
    switch (condition) {
      case 'patellofemoral': return 'Síndrome Patelofemoral';
      case 'ankle_sprain': return 'Entorse de Tornozelo';
      case 'disc_protrusion': return 'Protrusão Discal';
      case 'rotator_cuff': return 'Manguito Rotador';
      case 'trochanteric_bursitis': return 'Bursite Trocantérica';
      case 'lateral_epicondylitis': return 'Epicondilite Lateral';
      case 'shin_splints': return 'Canelite';
      default: return condition;
    }
  };

  const getOverviewText = (overview: any): string => {
    if (!overview) return "Plano de reabilitação personalizado";
    if (typeof overview === 'string') return overview;
    // Se for um objeto, tenta extrair informações úteis ou retorna um valor padrão
    if (typeof overview === 'object') {
      return "Plano de reabilitação personalizado";
    }
    return "Plano de reabilitação personalizado";
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Histórico de Planos</span>
            <Button variant="outline" size="sm" onClick={onRefresh} disabled className="gap-1">
              <RefreshCw className="h-4 w-4" />
              {!isMobile && <span>Atualizar</span>}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="flex flex-col space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-1/4" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (historyPlans.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Histórico de Planos</span>
            <Button variant="outline" size="sm" onClick={onRefresh} className="gap-1">
              <RefreshCw className="h-4 w-4" />
              {!isMobile && <span>Atualizar</span>}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-sm text-muted-foreground py-6">
            Você ainda não tem nenhum plano de reabilitação.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Histórico de Planos</span>
          <Button variant="outline" size="sm" onClick={onRefresh} className="gap-1">
            <RefreshCw className="h-4 w-4" />
            {!isMobile && <span>Atualizar</span>}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {historyPlans.map((plan) => (
            <Card 
              key={plan.id} 
              className={`overflow-hidden ${selectedPlanId === plan.id ? 'ring-2 ring-primary' : ''}`}
            >
              <CardContent className="p-4">
                <div className="flex flex-col">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">{renderCondition(plan.condition)}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Objetivo: {renderGoal(plan.goal?.toString())}
                      </p>
                    </div>
                    <div className="flex items-center text-xs text-muted-foreground gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDate(new Date(plan.start_date))}</span>
                    </div>
                  </div>
                  <div className="mt-2">
                    <p className="text-xs text-muted-foreground">
                      {getOverviewText(plan.overview)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
