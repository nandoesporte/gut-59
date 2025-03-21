
import { useState, useEffect } from 'react';
import { 
  ChevronDown, 
  ChevronUp, 
  Search, 
  Dumbbell, 
  Tag, 
  MapPin, 
  Target,
  ArrowLeft,
  Image
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Exercise } from '@/components/admin/exercises/types';
import { toast } from 'sonner';
import { formatImageUrl } from '@/utils/imageUtils';
import { Skeleton } from '@/components/ui/skeleton';

const ExerciseLibrary = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [filteredExercises, setFilteredExercises] = useState<Exercise[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [activeCategory, setActiveCategory] = useState('type');

  useEffect(() => {
    fetchExercises();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredExercises(exercises);
    } else {
      const filtered = exercises.filter(exercise => 
        exercise.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exercise.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredExercises(filtered);
    }
  }, [searchTerm, exercises]);

  const fetchExercises = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching exercises:', error);
        toast.error('Erro ao carregar exercícios');
        return;
      }

      setExercises(data || []);
      setFilteredExercises(data || []);
    } catch (error) {
      console.error('Error fetching exercises:', error);
      toast.error('Erro ao carregar exercícios');
    } finally {
      setIsLoading(false);
    }
  };

  const getExercisesByType = (type: string) => {
    return filteredExercises.filter(ex => ex.exercise_type === type);
  };

  const getExercisesByMuscleGroup = (group: string) => {
    return filteredExercises.filter(ex => ex.muscle_group === group);
  };

  const getExercisesByEquipment = (location: string) => {
    // Check if equipment_needed includes the specified location
    return filteredExercises.filter(ex => 
      ex.equipment_needed?.includes(location) || 
      (location === 'no_equipment' && (!ex.equipment_needed || ex.equipment_needed.length === 0))
    );
  };

  const getExercisesByGoal = (goal: string) => {
    return filteredExercises.filter(ex => ex.goals?.includes(goal));
  };

  const handleExerciseSelect = (exercise: Exercise) => {
    setSelectedExercise(exercise);
  };

  const handleBack = () => {
    setSelectedExercise(null);
  };

  // Exercise thumbnail component
  const ExerciseThumbnail = ({ exercise }: { exercise: Exercise }) => {
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);
    const imageUrl = formatImageUrl(exercise.gif_url);
    
    return (
      <div 
        onClick={() => handleExerciseSelect(exercise)}
        className="cursor-pointer hover:scale-105 transition-transform"
      >
        <div className="aspect-square w-full h-24 relative overflow-hidden rounded-md border bg-muted/40">
          {!imageLoaded && !imageError && (
            <Skeleton className="absolute inset-0 h-full w-full" />
          )}
          
          {imageError || !exercise.gif_url ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center">
              <Image className="h-6 w-6 text-muted-foreground mb-1" />
              <span className="text-xs text-muted-foreground line-clamp-2">
                {exercise.name}
              </span>
            </div>
          ) : (
            <img 
              src={imageUrl}
              alt={exercise.name}
              className={`object-cover h-full w-full ${imageLoaded ? 'block' : 'hidden'}`}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
              loading="lazy"
            />
          )}
          
          <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1">
            <p className="text-white text-xs truncate">{exercise.name}</p>
          </div>
        </div>
      </div>
    );
  };

  // Exercise grid component for displaying thumbnails
  const ExerciseGrid = ({ exercises }: { exercises: Exercise[] }) => {
    if (isLoading) {
      return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="aspect-square h-24 rounded-md" />
          ))}
        </div>
      );
    }
    
    if (exercises.length === 0) {
      return (
        <p className="text-muted-foreground text-sm py-2">
          Nenhum exercício encontrado
        </p>
      );
    }
    
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[320px] overflow-y-auto p-1">
        {exercises.map(exercise => (
          <ExerciseThumbnail key={exercise.id} exercise={exercise} />
        ))}
      </div>
    );
  };

  return (
    <Card className="w-full border border-primary/10 mb-4 animate-slideDown overflow-hidden">
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2">
              <Dumbbell className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-medium">Biblioteca de Exercícios</h3>
            </div>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              {isOpen ? 
                <ChevronUp className="h-4 w-4" /> : 
                <ChevronDown className="h-4 w-4" />
              }
            </Button>
          </div>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="overflow-hidden transition-all data-[state=closed]:animate-slideUp data-[state=open]:animate-slideDown">
          <div className="p-4 border-t">
            {selectedExercise ? (
              <div className="space-y-4">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleBack}
                  className="mb-2"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar para a lista
                </Button>
                
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="w-full md:w-1/3 bg-card rounded-lg overflow-hidden border">
                    {selectedExercise.gif_url ? (
                      <div className="aspect-square relative overflow-hidden bg-muted">
                        <img 
                          src={formatImageUrl(selectedExercise.gif_url)} 
                          alt={selectedExercise.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="aspect-square flex items-center justify-center bg-muted text-muted-foreground">
                        Imagem não disponível
                      </div>
                    )}
                  </div>
                  
                  <div className="w-full md:w-2/3 space-y-4">
                    <h2 className="text-xl font-bold">{selectedExercise.name}</h2>
                    
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="bg-primary/10">
                        {selectedExercise.exercise_type === 'strength' ? 'Força' : 
                         selectedExercise.exercise_type === 'cardio' ? 'Cardio' : 'Mobilidade'}
                      </Badge>
                      <Badge variant="outline" className="bg-secondary/10">
                        {selectedExercise.muscle_group}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-muted-foreground">Detalhes do Exercício</h3>
                      <p className="text-sm">{selectedExercise.description || 'Sem descrição disponível.'}</p>
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-muted-foreground">Séries e Repetições Recomendadas</h3>
                      <p className="text-sm">
                        {selectedExercise.min_sets}-{selectedExercise.max_sets} séries x{' '}
                        {selectedExercise.min_reps}-{selectedExercise.max_reps} repetições
                      </p>
                      <p className="text-sm">
                        Descanso: {selectedExercise.rest_time_seconds}s entre séries
                      </p>
                    </div>
                    
                    {selectedExercise.equipment_needed && selectedExercise.equipment_needed.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="text-sm font-medium text-muted-foreground">Equipamento Necessário</h3>
                        <div className="flex flex-wrap gap-1">
                          {selectedExercise.equipment_needed.map(equipment => (
                            <Badge key={equipment} variant="outline" className="text-xs">
                              {equipment}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar exercícios..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                
                <Tabs defaultValue="type" value={activeCategory} onValueChange={setActiveCategory}>
                  <TabsList className="grid grid-cols-4 mb-4">
                    <TabsTrigger value="type" className="flex items-center gap-1">
                      <Dumbbell className="h-4 w-4" />
                      <span className="hidden sm:inline">Tipo</span>
                    </TabsTrigger>
                    <TabsTrigger value="muscle" className="flex items-center gap-1">
                      <Tag className="h-4 w-4" />
                      <span className="hidden sm:inline">Grupo Muscular</span>
                    </TabsTrigger>
                    <TabsTrigger value="location" className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span className="hidden sm:inline">Local</span>
                    </TabsTrigger>
                    <TabsTrigger value="goal" className="flex items-center gap-1">
                      <Target className="h-4 w-4" />
                      <span className="hidden sm:inline">Objetivo</span>
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="type" className="mt-0">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card className="shadow-sm hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <h4 className="font-medium mb-2">Força</h4>
                          <ExerciseGrid exercises={getExercisesByType('strength')} />
                        </CardContent>
                      </Card>
                      
                      <Card className="shadow-sm hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <h4 className="font-medium mb-2">Cardio</h4>
                          <ExerciseGrid exercises={getExercisesByType('cardio')} />
                        </CardContent>
                      </Card>
                      
                      <Card className="shadow-sm hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <h4 className="font-medium mb-2">Mobilidade</h4>
                          <ExerciseGrid exercises={getExercisesByType('mobility')} />
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="muscle" className="mt-0">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {['chest', 'back', 'legs', 'shoulders', 'arms', 'core'].map(group => (
                        <Card key={group} className="shadow-sm hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <h4 className="font-medium mb-2 capitalize">
                              {group === 'chest' ? 'Peito' : 
                              group === 'back' ? 'Costas' : 
                              group === 'legs' ? 'Pernas' : 
                              group === 'shoulders' ? 'Ombros' : 
                              group === 'arms' ? 'Braços' : 'Core'}
                            </h4>
                            <ExerciseGrid exercises={getExercisesByMuscleGroup(group)} />
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="location" className="mt-0">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {['gym', 'home', 'outdoors', 'no_equipment'].map(location => (
                        <Card key={location} className="shadow-sm hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <h4 className="font-medium mb-2">
                              {location === 'gym' ? 'Academia' : 
                              location === 'home' ? 'Casa' : 
                              location === 'outdoors' ? 'Ao ar livre' : 
                              'Sem equipamento'}
                            </h4>
                            <ExerciseGrid exercises={getExercisesByEquipment(location)} />
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="goal" className="mt-0">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {['strength', 'hypertrophy', 'endurance', 'weight_loss', 'flexibility'].map(goal => (
                        <Card key={goal} className="shadow-sm hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <h4 className="font-medium mb-2">
                              {goal === 'strength' ? 'Força' : 
                              goal === 'hypertrophy' ? 'Hipertrofia' : 
                              goal === 'endurance' ? 'Resistência' : 
                              goal === 'weight_loss' ? 'Perda de peso' : 
                              'Flexibilidade'}
                            </h4>
                            <ExerciseGrid exercises={getExercisesByGoal(goal)} />
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
              </>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default ExerciseLibrary;
