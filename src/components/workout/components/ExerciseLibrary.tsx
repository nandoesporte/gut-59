
import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from "@/components/ui/collapsible";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { 
  Library, 
  ChevronDown, 
  ChevronUp, 
  Search, 
  Dumbbell, 
  Target, 
  Tag, 
  MapPin 
} from "lucide-react";
import { Exercise } from "@/components/admin/exercises/types";

interface ExerciseCardProps {
  exercise: Exercise;
}

const ExerciseCard: React.FC<ExerciseCardProps> = ({ exercise }) => {
  const [expanded, setExpanded] = useState(false);
  const isMobile = useIsMobile();

  const getDifficultyColor = (difficulty: string) => {
    switch(difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100';
      case 'intermediate': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100';
      case 'advanced': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100';
      case 'expert': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100';
    }
  };

  const getExerciseTypeColor = (type: string) => {
    switch(type) {
      case 'strength': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100';
      case 'cardio': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100';
      case 'mobility': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100';
    }
  };

  return (
    <Card className="w-full overflow-hidden border hover:border-primary/20 transition-all">
      <CardContent className="p-3">
        <div className="space-y-2">
          <div className="flex justify-between items-start gap-2">
            <div>
              <h3 className="font-medium text-sm">{exercise.name}</h3>
              <div className="flex flex-wrap gap-1 mt-1">
                <Badge variant="outline" className={`text-xs ${getExerciseTypeColor(exercise.exercise_type)}`}>
                  {exercise.exercise_type}
                </Badge>
                <Badge variant="outline" className={`text-xs ${getDifficultyColor(exercise.difficulty)}`}>
                  {exercise.difficulty}
                </Badge>
                {exercise.muscle_group && (
                  <Badge variant="outline" className="text-xs">
                    {exercise.muscle_group.replace(/_/g, ' ')}
                  </Badge>
                )}
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0" 
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </Button>
          </div>

          {expanded && (
            <div className="pt-2 space-y-3 text-xs text-muted-foreground animate-slideDown">
              {exercise.gif_url && (
                <div className="flex justify-center">
                  <img 
                    src={exercise.gif_url} 
                    alt={exercise.name} 
                    className="h-36 object-cover rounded-md border"
                  />
                </div>
              )}
              
              {exercise.description && (
                <div>
                  <p className="font-medium text-xs text-foreground">Descrição:</p>
                  <p>{exercise.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="font-medium text-xs text-foreground">Séries:</p>
                  <p>{exercise.min_sets} - {exercise.max_sets}</p>
                </div>
                <div>
                  <p className="font-medium text-xs text-foreground">Repetições:</p>
                  <p>{exercise.min_reps} - {exercise.max_reps}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export const ExerciseLibrary = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [filteredExercises, setFilteredExercises] = useState<Exercise[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('type');
  const isMobile = useIsMobile();

  useEffect(() => {
    fetchExercises();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredExercises(exercises);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = exercises.filter(exercise => 
        exercise.name.toLowerCase().includes(query) ||
        (exercise.description && exercise.description.toLowerCase().includes(query)) ||
        exercise.exercise_type.toLowerCase().includes(query) ||
        (exercise.muscle_group && exercise.muscle_group.toLowerCase().includes(query)) ||
        exercise.difficulty.toLowerCase().includes(query)
      );
      setFilteredExercises(filtered);
    }
  }, [searchQuery, exercises]);

  const fetchExercises = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .order('name');

      if (error) throw error;
      setExercises(data || []);
      setFilteredExercises(data || []);
    } catch (error) {
      console.error('Error fetching exercises:', error);
    } finally {
      setLoading(false);
    }
  };

  const groupByType = () => {
    const groups: Record<string, Exercise[]> = {};
    filteredExercises.forEach(exercise => {
      const type = exercise.exercise_type || 'other';
      if (!groups[type]) groups[type] = [];
      groups[type].push(exercise);
    });
    return groups;
  };

  const groupByMuscle = () => {
    const groups: Record<string, Exercise[]> = {};
    filteredExercises.forEach(exercise => {
      const muscle = exercise.muscle_group || 'other';
      if (!groups[muscle]) groups[muscle] = [];
      groups[muscle].push(exercise);
    });
    return groups;
  };

  const groupByLocation = () => {
    // Simplified location grouping based on equipment needed
    const groups: Record<string, Exercise[]> = {
      'gym': [],
      'home': [],
      'anywhere': []
    };
    
    filteredExercises.forEach(exercise => {
      if (exercise.equipment_needed && exercise.equipment_needed.length > 0 && 
          exercise.equipment_needed.some(eq => ['barbell', 'dumbbell', 'machine', 'cable'].includes(eq))) {
        groups['gym'].push(exercise);
      } else if (exercise.equipment_needed && exercise.equipment_needed.length > 0) {
        groups['home'].push(exercise);
      } else {
        groups['anywhere'].push(exercise);
      }
    });
    return groups;
  };

  const groupByGoal = () => {
    // Simplified goal grouping
    const groups: Record<string, Exercise[]> = {
      'strength': [],
      'cardio': [],
      'mobility': [],
      'weight_loss': [],
      'muscle_gain': []
    };
    
    filteredExercises.forEach(exercise => {
      if (exercise.exercise_type === 'strength') {
        groups['strength'].push(exercise);
        if (exercise.is_compound_movement) {
          groups['muscle_gain'].push(exercise);
        }
      } else if (exercise.exercise_type === 'cardio') {
        groups['cardio'].push(exercise);
        groups['weight_loss'].push(exercise);
      } else if (exercise.exercise_type === 'mobility') {
        groups['mobility'].push(exercise);
      }
    });
    return groups;
  };

  const renderExerciseGroups = (groups: Record<string, Exercise[]>) => {
    return Object.entries(groups).map(([groupName, groupExercises]) => (
      <div key={groupName} className="mb-4">
        <h3 className="text-sm font-semibold mb-2 capitalize">
          {groupName.replace(/_/g, ' ')} ({groupExercises.length})
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {groupExercises.slice(0, 9).map(exercise => (
            <ExerciseCard key={exercise.id} exercise={exercise} />
          ))}
        </div>
        {groupExercises.length > 9 && (
          <Button variant="link" size="sm" className="mt-1">
            Ver mais {groupExercises.length - 9} exercícios
          </Button>
        )}
      </div>
    ));
  };

  const formatCaption = (count: number) => {
    return count === 1 ? '1 exercício encontrado' : `${count} exercícios encontrados`;
  };

  return (
    <Collapsible 
      open={isOpen} 
      onOpenChange={setIsOpen} 
      className="w-full border rounded-lg mb-4 bg-card"
    >
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <Library className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Biblioteca de Exercícios</h3>
        </div>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm">
            {isOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </CollapsibleTrigger>
      </div>
      
      <CollapsibleContent className="px-4 pb-4 pt-2">
        <div className="mb-4 relative">
          <Input
            placeholder="Pesquisar exercícios..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        </div>
        
        <Tabs defaultValue="type" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start mb-4">
            <TabsTrigger value="type" className="flex gap-1 items-center">
              <Dumbbell className="h-4 w-4" />
              <span>Tipo</span>
            </TabsTrigger>
            <TabsTrigger value="muscle" className="flex gap-1 items-center">
              <Tag className="h-4 w-4" />
              <span>Grupo Muscular</span>
            </TabsTrigger>
            <TabsTrigger value="location" className="flex gap-1 items-center">
              <MapPin className="h-4 w-4" />
              <span>Local</span>
            </TabsTrigger>
            <TabsTrigger value="goal" className="flex gap-1 items-center">
              <Target className="h-4 w-4" />
              <span>Objetivo</span>
            </TabsTrigger>
          </TabsList>
          
          <div className="text-xs text-muted-foreground mb-3">
            {formatCaption(filteredExercises.length)}
          </div>
          
          {loading ? (
            <div className="flex justify-center p-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <ScrollArea className="h-[400px] pr-4">
              <TabsContent value="type" className="m-0">
                {renderExerciseGroups(groupByType())}
              </TabsContent>
              
              <TabsContent value="muscle" className="m-0">
                {renderExerciseGroups(groupByMuscle())}
              </TabsContent>
              
              <TabsContent value="location" className="m-0">
                {renderExerciseGroups(groupByLocation())}
              </TabsContent>
              
              <TabsContent value="goal" className="m-0">
                {renderExerciseGroups(groupByGoal())}
              </TabsContent>
            </ScrollArea>
          )}
        </Tabs>
      </CollapsibleContent>
    </Collapsible>
  );
};
