
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Dumbbell, Clock, Stretch, Move } from 'lucide-react';

interface ExerciseDisplayProps {
  name: string;
  sets?: number | string;
  reps?: number | string;
  restTime?: string;
  description?: string;
  notes?: string;
  gifUrl?: string;
  exerciseType?: string;
}

export const ExerciseDisplay = ({
  name,
  sets = 3,
  reps = 10,
  restTime = '30s',
  description = '',
  notes = '',
  gifUrl,
  exerciseType = 'strength'
}: ExerciseDisplayProps) => {
  // Function to get icon based on exercise type
  const getExerciseIcon = () => {
    switch (exerciseType?.toLowerCase()) {
      case 'stretching':
        return <Stretch className="w-4 h-4 text-yellow-500" />;
      case 'mobility':
        return <Move className="w-4 h-4 text-blue-500" />;
      case 'strength':
      default:
        return <Dumbbell className="w-4 h-4 text-green-500" />;
    }
  };

  // Function to get color based on exercise type
  const getTypeColor = () => {
    switch (exerciseType?.toLowerCase()) {
      case 'stretching':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800';
      case 'mobility':
        return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800';
      case 'strength':
      default:
        return 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800';
    }
  };

  return (
    <Card className="overflow-hidden border">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Image/GIF section */}
        <div className="bg-gray-100 dark:bg-gray-800 flex items-center justify-center min-h-[180px] md:min-h-[220px]">
          {gifUrl ? (
            <img 
              src={gifUrl} 
              alt={name} 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-muted-foreground">
              <svg className="w-12 h-12 mb-2 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-xs">Imagem não disponível</span>
            </div>
          )}
        </div>
        
        {/* Exercise details */}
        <div className="p-4 md:col-span-2">
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-lg font-semibold">{name}</h3>
            <span className={`text-xs px-2 py-1 rounded-full border ${getTypeColor()} flex items-center gap-1`}>
              {getExerciseIcon()}
              {exerciseType?.charAt(0).toUpperCase() + exerciseType?.slice(1) || 'Força'}
            </span>
          </div>
          
          <div className="flex flex-wrap gap-3 mb-3">
            <div className="flex items-center gap-1 text-sm">
              <span className="font-medium">Séries:</span>
              <span>{sets}</span>
            </div>
            <div className="flex items-center gap-1 text-sm">
              <span className="font-medium">Repetições:</span>
              <span>{reps}</span>
            </div>
            <div className="flex items-center gap-1 text-sm">
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="font-medium">Descanso:</span>
              <span>{restTime}</span>
            </div>
          </div>
          
          {description && (
            <div className="mt-2">
              <h4 className="text-sm font-medium mb-1">Descrição</h4>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          )}
          
          {notes && (
            <div className="mt-2">
              <h4 className="text-sm font-medium mb-1">Notas</h4>
              <p className="text-sm text-muted-foreground">{notes}</p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
