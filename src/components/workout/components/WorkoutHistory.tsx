
import React from 'react';
import { Card } from '@/components/ui/card';
import { WorkoutPlan } from '../types/workout-plan';
import { Download, FileText } from 'lucide-react';
import { generateWorkoutPDF } from '../utils/pdf-generator';

interface WorkoutHistoryProps {
  plans: WorkoutPlan[];
}

const WorkoutHistory: React.FC<WorkoutHistoryProps> = ({ plans }) => {
  return (
    <div className="space-y-4">
      {plans.map((plan) => (
        <Card key={plan.id} className="p-4">
          <div className="flex flex-col md:flex-row justify-between items-start gap-4">
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-2">
                Plano de {plan.goal === 'lose_weight' ? 'Emagrecimento' : 
                         plan.goal === 'gain_mass' ? 'Ganho de Massa' : 
                         'Manutenção'}
              </h3>
              <p className="text-sm text-gray-600">
                Período: {new Date(plan.start_date).toLocaleDateString()} - {new Date(plan.end_date).toLocaleDateString()}
              </p>
            </div>
            <div className="flex gap-2">
              <div 
                className="cursor-pointer hover:bg-gray-100 p-2 rounded-lg"
                onClick={() => generateWorkoutPDF(plan)}
              >
                <Download className="h-5 w-5 text-gray-600" />
              </div>
              <div className="cursor-pointer hover:bg-gray-100 p-2 rounded-lg">
                <FileText className="h-5 w-5 text-gray-600" />
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default WorkoutHistory;
