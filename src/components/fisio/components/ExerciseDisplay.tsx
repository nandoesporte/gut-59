
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Clock, Info } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface ExerciseDisplayProps {
  name: string;
  sets: number;
  reps: number;
  restTime?: string;
  gifUrl?: string;
  description?: string;
  notes?: string;
}

export const ExerciseDisplay = ({
  name,
  sets,
  reps,
  restTime = '30s',
  gifUrl,
  description,
  notes
}: ExerciseDisplayProps) => {
  const [isOpen, setIsOpen] = React.useState(false);
  
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex flex-col md:flex-row w-full">
          <div className="w-full md:w-1/3 h-[180px] md:h-auto bg-gray-100 dark:bg-gray-800 overflow-hidden flex items-center justify-center">
            {gifUrl ? (
              <img 
                src={gifUrl} 
                alt={name} 
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/placeholder.svg';
                }}
              />
            ) : (
              <div className="flex items-center justify-center w-full h-full bg-gray-100 dark:bg-gray-800">
                <span className="text-gray-400 text-sm">Imagem não disponível</span>
              </div>
            )}
          </div>
          
          <div className="flex-1 p-4">
            <h3 className="font-medium text-lg mb-2">{name}</h3>
            
            <div className="flex flex-wrap gap-4 mb-3 text-sm">
              <div>
                <span className="font-medium">Séries:</span> {sets}
              </div>
              <div>
                <span className="font-medium">Repetições:</span> {reps}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span className="font-medium">Descanso:</span> {restTime}
              </div>
            </div>
            
            {(description || notes) && (
              <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-2">
                <CollapsibleTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-xs gap-1 h-auto py-1 px-2 text-muted-foreground hover:text-foreground"
                  >
                    {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    {isOpen ? "Ocultar detalhes" : "Ver detalhes"}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 text-sm">
                  {description && (
                    <div className="mb-2">
                      <p className="text-muted-foreground">{description}</p>
                    </div>
                  )}
                  
                  {notes && (
                    <div className="flex items-start gap-1 mt-2 text-xs text-muted-foreground bg-primary/5 p-2 rounded">
                      <Info className="w-3.5 h-3.5 mt-0.5 text-primary" />
                      <p>{notes}</p>
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
