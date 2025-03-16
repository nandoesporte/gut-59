
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RehabPlan } from '../types/rehab-plan';
import { ExerciseDisplay } from './ExerciseDisplay';
import { formatImageUrl } from '@/utils/imageUtils';
import { Bone, Calendar, Target, TrendingUp } from 'lucide-react';

interface RehabPlanDisplayProps {
  plan: RehabPlan;
}

export const RehabPlanDisplay = ({ plan }: RehabPlanDisplayProps) => {
  // Helper to render the goal in a user-friendly format
  const renderGoal = (goal: string | undefined) => {
    switch (goal) {
      case 'pain_relief': return 'Alívio de Dor';
      case 'mobility': return 'Mobilidade';
      case 'strength': return 'Fortalecimento';
      case 'return_to_sport': return 'Retorno ao Esporte';
      default: return 'Alívio de Dor';
    }
  };

  // Format condition to be more user-friendly
  const formatCondition = (condition: string | undefined) => {
    if (!condition) return 'Condição não especificada';
    
    switch (condition) {
      case 'patellofemoral': return 'Síndrome Patelofemoral';
      case 'ankle_sprain': return 'Entorse de Tornozelo';
      case 'disc_protrusion': return 'Protrusão Discal';
      case 'rotator_cuff': return 'Lesão do Manguito Rotador';
      case 'trochanteric_bursitis': return 'Bursite Trocantérica';
      case 'lateral_epicondylitis': return 'Epicondilite Lateral (Cotovelo de Tenista)';
      case 'shin_splints': return 'Canelite (Síndrome do Estresse Tibial Medial)';
      default: return condition.split('_').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
    }
  };

  // Get the days of the plan
  const getDays = () => {
    if (plan.days && Object.keys(plan.days).length > 0) {
      return Object.keys(plan.days).map(day => ({
        id: day,
        name: `Dia ${day}`,
        exercises: plan.days[day]?.exercises || []
      }));
    }
    
    // If we don't have days structure, try to create it from rehab sessions
    if (plan.rehab_sessions && plan.rehab_sessions.length > 0) {
      return plan.rehab_sessions.map(session => ({
        id: session.day_number.toString(),
        name: `Dia ${session.day_number}`,
        exercises: session.exercises || []
      }));
    }
    
    return [];
  };
  
  const days = getDays();

  // Get recommendations
  const getRecommendations = () => {
    if (Array.isArray(plan.recommendations)) {
      return plan.recommendations;
    }
    if (typeof plan.recommendations === 'string') {
      return [plan.recommendations];
    }
    return ["Siga o plano de exercícios conforme indicado.",
            "Realize os exercícios diariamente para melhores resultados.",
            "Se sentir dor intensa, pare imediatamente e consulte um profissional."];
  };
  
  const recommendations = getRecommendations();

  return (
    <Card className="border-none shadow-md overflow-hidden">
      <CardHeader className="bg-primary/5 border-b">
        <CardTitle className="flex flex-col gap-1">
          <span className="text-xl sm:text-2xl font-bold">{formatCondition(plan.condition)}</span>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mt-1">
            <div className="flex items-center gap-1">
              <Target className="w-4 h-4" />
              <span>{renderGoal(plan.goal?.toString())}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>Duração: {new Date(plan.end_date).getDate() - new Date(plan.start_date).getDate() || 14} dias</span>
            </div>
            <div className="flex items-center gap-1">
              <Bone className="w-4 h-4" />
              <span>Área: {plan.joint_area?.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') || 'Não especificada'}</span>
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="p-4 bg-primary/5">
          <h3 className="text-sm font-medium flex items-center gap-1.5 mb-2">
            <TrendingUp className="w-4 h-4" />
            Visão Geral
          </h3>
          <p className="text-sm text-muted-foreground">{plan.overview || "Plano de reabilitação personalizado para sua condição."}</p>
        </div>
        
        <div className="p-4 border-t">
          <h3 className="text-sm font-medium mb-2">Recomendações</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            {recommendations.map((rec, index) => (
              <li key={index}>{rec}</li>
            ))}
          </ul>
        </div>
        
        {days.length > 0 && (
          <div className="border-t">
            <Tabs defaultValue={days[0]?.id?.toString()}>
              <div className="px-4 pt-4">
                <TabsList className="w-full justify-start overflow-x-auto flex-nowrap">
                  {days.map((day) => (
                    <TabsTrigger 
                      key={day.id} 
                      value={day.id.toString()}
                      className="whitespace-nowrap"
                    >
                      {day.name}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
              
              {days.map((day) => (
                <TabsContent key={day.id} value={day.id.toString()} className="pt-2 pb-4 px-4">
                  <div className="space-y-4">
                    {day.exercises.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhum exercício para este dia.
                      </p>
                    ) : (
                      day.exercises.map((exercise, index) => (
                        <ExerciseDisplay
                          key={index}
                          name={exercise.name}
                          sets={exercise.sets}
                          reps={exercise.reps}
                          restTime={exercise.restTime || `${exercise.rest_time_seconds || 30}s`}
                          gifUrl={formatImageUrl(exercise.gifUrl)}
                          description={exercise.description || ''}
                          notes={exercise.notes || ''}
                        />
                      ))
                    )}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
