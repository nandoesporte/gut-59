
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
    if (!goal || typeof goal !== 'string') return 'Alívio de Dor';
    
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
    if (!condition || typeof condition !== 'string') return 'Condição não especificada';
    
    switch (condition) {
      case 'patellofemoral': return 'Síndrome Patelofemoral';
      case 'ankle_sprain': return 'Entorse de Tornozelo';
      case 'disc_protrusion': return 'Protrusão Discal';
      case 'rotator_cuff': return 'Lesão do Manguito Rotador';
      case 'trochanteric_bursitis': return 'Bursite Trocantérica';
      case 'lateral_epicondylitis': return 'Epicondilite Lateral (Cotovelo de Tenista)';
      case 'shin_splints': return 'Canelite (Síndrome do Estresse Tibial Medial)';
      default: return typeof condition === 'string' 
        ? condition.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
        : 'Condição não especificada';
    }
  };

  // Get the days of the plan
  const getDays = () => {
    if (plan.days && typeof plan.days === 'object' && Object.keys(plan.days).length > 0) {
      return Object.keys(plan.days).map(day => ({
        id: day,
        name: `Dia ${day.replace('day', '')}`,
        exercises: Array.isArray(plan.days[day]?.exercises) ? plan.days[day]?.exercises || [] : []
      }));
    }
    
    // If we don't have days structure, try to create it from rehab sessions
    if (Array.isArray(plan.rehab_sessions) && plan.rehab_sessions.length > 0) {
      return plan.rehab_sessions.map(session => ({
        id: String(session.day_number || '1'),
        name: `Dia ${session.day_number || ''}`,
        exercises: Array.isArray(session.exercises) ? session.exercises || [] : []
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
  
  // Safely get the overview text
  const getOverview = () => {
    if (typeof plan.overview === 'string') {
      return plan.overview;
    }
    if (plan.overview && typeof plan.overview === 'object') {
      // If it's an object, try to extract useful information
      const overviewObj = plan.overview as Record<string, any>;
      if (overviewObj.approach && typeof overviewObj.approach === 'string') {
        return overviewObj.approach;
      }
      if (overviewObj.condition && typeof overviewObj.condition === 'string') {
        return `Plano para ${overviewObj.condition}`;
      }
      // Convert to string if possible
      try {
        return JSON.stringify(plan.overview);
      } catch (e) {
        return "Plano de reabilitação personalizado para sua condição.";
      }
    }
    return "Plano de reabilitação personalizado para sua condição.";
  };

  const overview = getOverview();

  // Safe goal value for display
  const goalDisplay = 
    typeof plan.goal === 'object' || !plan.goal
      ? 'Alívio de Dor' 
      : renderGoal(typeof plan.goal === 'string' ? plan.goal : undefined);

  // Safe joint area value for display
  const jointAreaDisplay = 
    typeof plan.joint_area === 'object' || !plan.joint_area
      ? 'Área não especificada'
      : String(plan.joint_area).split('_').map(word => 
          typeof word === 'string' ? word.charAt(0).toUpperCase() + word.slice(1) : ''
        ).join(' ');

  // Calculate duration safely
  const calculateDuration = () => {
    try {
      if (!plan.start_date || !plan.end_date) return 14;
      
      const startDate = new Date(plan.start_date);
      const endDate = new Date(plan.end_date);
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return 14;
      
      // Calculate the difference in days
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return diffDays || 14; // Default to 14 if calculation fails
    } catch (error) {
      console.error("Error calculating duration:", error);
      return 14;
    }
  };

  return (
    <Card className="border-none shadow-md overflow-hidden">
      <CardHeader className="bg-primary/5 border-b">
        <CardTitle className="flex flex-col gap-1">
          <span className="text-xl sm:text-2xl font-bold">{formatCondition(plan.condition as string)}</span>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mt-1">
            <div className="flex items-center gap-1">
              <Target className="w-4 h-4" />
              <span>{goalDisplay}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>Duração: {calculateDuration()} dias</span>
            </div>
            <div className="flex items-center gap-1">
              <Bone className="w-4 h-4" />
              <span>Área: {jointAreaDisplay}</span>
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
          <p className="text-sm text-muted-foreground">{overview}</p>
        </div>
        
        <div className="p-4 border-t">
          <h3 className="text-sm font-medium mb-2">Recomendações</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            {recommendations.map((rec, index) => (
              <li key={index}>{typeof rec === 'string' ? rec : 'Recomendação não disponível'}</li>
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
                      day.exercises.map((exercise, index) => {
                        if (!exercise || typeof exercise !== 'object') {
                          return null;
                        }
                        
                        return (
                          <ExerciseDisplay
                            key={index}
                            name={typeof exercise.name === 'string' ? exercise.name : 'Exercício sem nome'}
                            sets={exercise.sets}
                            reps={exercise.reps}
                            restTime={
                              typeof exercise.restTime === 'string' 
                                ? exercise.restTime 
                                : typeof exercise.rest_time_seconds === 'number' || typeof exercise.rest_time_seconds === 'string'
                                  ? `${exercise.rest_time_seconds}s`
                                  : '30s'
                            }
                            gifUrl={formatImageUrl(
                              typeof exercise.gifUrl === 'string' ? exercise.gifUrl : 
                              typeof exercise.gif_url === 'string' ? exercise.gif_url : undefined
                            )}
                            description={
                              typeof exercise.description === 'string' 
                                ? exercise.description 
                                : ''
                            }
                            notes={
                              typeof exercise.notes === 'string' 
                                ? exercise.notes 
                                : ''
                            }
                            exerciseType={
                              typeof exercise.exerciseType === 'string'
                                ? exercise.exerciseType
                                : typeof exercise.exercise_type === 'string'
                                  ? exercise.exercise_type
                                  : 'strength'
                            }
                          />
                        );
                      })
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
