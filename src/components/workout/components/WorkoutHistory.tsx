
import React from 'react';
import { Card } from '@/components/ui/card';
import { WorkoutPlan } from '../types/workout-plan';
import { Download, FileText, Trash2 } from 'lucide-react';
import { generateWorkoutPDF } from '../utils/pdf-generator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface WorkoutHistoryProps {
  plans: WorkoutPlan[];
}

const WorkoutHistory: React.FC<WorkoutHistoryProps> = ({ plans }) => {
  const handleDelete = async (planId: string) => {
    try {
      const { error } = await supabase
        .from('workout_plans')
        .delete()
        .eq('id', planId);

      if (error) throw error;
      
      toast.success('Plano de treino excluído com sucesso');
      // Força um reload da página para atualizar a lista
      window.location.reload();
    } catch (error) {
      console.error('Erro ao excluir plano:', error);
      toast.error('Erro ao excluir o plano de treino');
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold mb-4">Histórico de Treinos</h2>
      {plans.map((plan) => (
        <Accordion type="single" collapsible key={plan.id}>
          <AccordionItem value={plan.id}>
            <Card className="p-4">
              <div className="flex flex-col space-y-4">
                <div className="flex justify-between items-start">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="text-left">
                      <h3 className="text-lg font-semibold">
                        Plano de {plan.goal === 'lose_weight' ? 'Emagrecimento' : 
                                 plan.goal === 'gain_mass' ? 'Ganho de Massa' : 
                                 'Manutenção'}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Período: {new Date(plan.start_date).toLocaleDateString()} - {new Date(plan.end_date).toLocaleDateString()}
                      </p>
                    </div>
                  </AccordionTrigger>
                  <div className="flex gap-2">
                    <button
                      className="cursor-pointer hover:bg-gray-100 p-2 rounded-lg"
                      onClick={() => generateWorkoutPDF(plan)}
                    >
                      <Download className="h-5 w-5 text-gray-600" />
                    </button>
                    <button
                      className="cursor-pointer hover:bg-red-100 p-2 rounded-lg"
                      onClick={() => handleDelete(plan.id)}
                    >
                      <Trash2 className="h-5 w-5 text-red-600" />
                    </button>
                  </div>
                </div>

                <AccordionContent>
                  <div className="mt-4 space-y-6">
                    {plan.workout_sessions?.map((session) => (
                      <div key={session.id} className="border-t pt-4">
                        <h4 className="font-semibold mb-2">Dia {session.day_number}</h4>
                        
                        {session.warmup_description && (
                          <div className="mb-3">
                            <p className="text-sm font-medium text-gray-700">Aquecimento:</p>
                            <p className="text-sm text-gray-600">{session.warmup_description}</p>
                          </div>
                        )}

                        <div className="space-y-2">
                          {session.session_exercises?.map((exercise) => (
                            <div key={exercise.id} className="bg-gray-50 p-3 rounded-md">
                              <p className="font-medium">{exercise.exercise?.name}</p>
                              <p className="text-sm text-gray-600">
                                {exercise.sets} séries x {exercise.reps} repetições
                                {exercise.rest_time_seconds && ` - Descanso: ${exercise.rest_time_seconds}s`}
                              </p>
                            </div>
                          ))}
                        </div>

                        {session.cooldown_description && (
                          <div className="mt-3">
                            <p className="text-sm font-medium text-gray-700">Desaquecimento:</p>
                            <p className="text-sm text-gray-600">{session.cooldown_description}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </div>
            </Card>
          </AccordionItem>
        </Accordion>
      ))}
    </div>
  );
};

export default WorkoutHistory;
