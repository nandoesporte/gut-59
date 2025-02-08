
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, ChevronDown, ChevronUp, Utensils, Droplets, Plus, History, List } from "lucide-react";
import { cn } from "@/lib/utils";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ProtocolFood {
  id: string;
  name: string;
  food_group: string;
  phase: number;
}

interface SavedMeal {
  id: string;
  meal_type: string;
  description: string;
  meal_date: string;
  created_at: string;
  protocol_food: ProtocolFood;
}

const FoodDiary = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [mealType, setMealType] = useState<string>("");
  const [phase, setPhase] = useState<string>("");
  const [selectedFood, setSelectedFood] = useState<string>("");
  const [waterPercentage, setWaterPercentage] = useState(55);
  const [date, setDate] = useState<Date>(new Date());
  const [protocolFoods, setProtocolFoods] = useState<ProtocolFood[]>([]);
  const [savedMeals, setSavedMeals] = useState<SavedMeal[]>([]);
  const [showSavedMeals, setShowSavedMeals] = useState(false);
  const [symptomData, setSymptomData] = useState<any[]>([]);
  const [stats, setStats] = useState({
    daysLogged: 0,
    averageDiscomfort: 0,
  });

  useEffect(() => {
    fetchProtocolFoods();
    fetchSavedMeals();
    fetchSymptomHistory();
  }, [date]);

  const fetchProtocolFoods = async () => {
    try {
      const { data, error } = await supabase
        .from('protocol_foods')
        .select('*')
        .order('food_group');

      if (error) throw error;
      setProtocolFoods(data || []);
    } catch (error) {
      console.error('Error fetching protocol foods:', error);
    }
  };

  const fetchSavedMeals = async () => {
    try {
      const { data, error } = await supabase
        .from('meals')
        .select(`
          *,
          protocol_food:protocol_food_id (*)
        `)
        .eq('meal_date', format(date, 'yyyy-MM-dd'))
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSavedMeals(data || []);
    } catch (error) {
      console.error('Error fetching saved meals:', error);
    }
  };

  const fetchSymptomHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Erro",
          description: "Usuário não encontrado. Por favor, faça login novamente.",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase
        .from('symptoms')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const formattedData = data.map(item => ({
        date: format(new Date(item.created_at), 'dd/MM'),
        discomfort: item.discomfort_level,
        bloating: item.has_bloating ? 1 : 0,
        gas: item.has_gas ? 1 : 0,
        abdominalPain: item.has_abdominal_pain ? 1 : 0,
        nausea: item.has_nausea ? 1 : 0,
      }));

      setSymptomData(formattedData);

      const totalDiscomfort = data.reduce((sum: number, item: any) => sum + (item.discomfort_level || 0), 0);
      const avgDiscomfort = data.length > 0 ? Number((totalDiscomfort / data.length).toFixed(1)) : 0;
      
      setStats({
        daysLogged: data.length,
        averageDiscomfort: avgDiscomfort,
      });

    } catch (error) {
      console.error('Error fetching symptom history:', error);
    }
  };

  const handleFoodLog = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Erro",
          description: "Usuário não encontrado. Por favor, faça login novamente.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('meals')
        .insert({
          user_id: user.id,
          meal_type: mealType,
          protocol_phase: phase ? parseInt(phase) : null,
          protocol_food_id: selectedFood,
          meal_date: format(date, 'yyyy-MM-dd'),
        });

      if (error) throw error;

      toast({
        title: "Refeição registrada",
        description: "Seu registro alimentar foi salvo com sucesso.",
      });

      setMealType("");
      setPhase("");
      setSelectedFood("");
      fetchSavedMeals();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Erro ao registrar",
        description: "Não foi possível salvar sua refeição. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddWater = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Erro",
          description: "Usuário não encontrado. Por favor, faça login novamente.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('water_intake')
        .insert({
          user_id: user.id,
          amount_ml: 200,
        });

      if (error) throw error;

      setWaterPercentage(prev => Math.min(100, prev + 5));

      toast({
        title: "Água registrada",
        description: "200ml de água registrados com sucesso.",
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Erro ao registrar",
        description: "Não foi possível registrar a água. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const groupedFoods = protocolFoods.reduce((acc, food) => {
    const key = food.food_group;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(food);
    return acc;
  }, {} as Record<string, ProtocolFood[]>);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-primary-50 to-primary-100 p-6 rounded-lg shadow-sm">
        <h1 className="text-2xl font-bold text-primary-700 mb-2">Diário Alimentar</h1>
        <p className="text-primary-600">
          Acompanhe sua jornada de modulação intestinal registrando suas refeições diárias.
        </p>
      </div>

      <Tabs defaultValue="register" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="register" className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Registrar
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="w-4 h-4" />
            Histórico
          </TabsTrigger>
          <TabsTrigger value="progress" className="flex items-center gap-2">
            <List className="w-4 h-4" />
            Progresso
          </TabsTrigger>
        </TabsList>

        <TabsContent value="register" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="bg-white shadow-sm border-none">
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Utensils className="w-5 h-5 text-primary-500" />
                      <h2 className="text-lg font-semibold text-gray-900">Nova Refeição</h2>
                    </div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(date, "dd/MM/yyyy")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="end">
                        <Calendar
                          mode="single"
                          selected={date}
                          onSelect={(date) => date && setDate(date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <Select value={mealType} onValueChange={setMealType}>
                    <SelectTrigger className="w-full bg-gray-50 border-gray-200">
                      <SelectValue placeholder="Selecione a refeição" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="breakfast">Café da manhã</SelectItem>
                      <SelectItem value="lunch">Almoço</SelectItem>
                      <SelectItem value="dinner">Jantar</SelectItem>
                      <SelectItem value="snack">Lanche</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fase do Protocolo
                      </label>
                      <Select value={phase} onValueChange={setPhase}>
                        <SelectTrigger className="w-full bg-gray-50 border-gray-200">
                          <SelectValue placeholder="Selecione a fase" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Fase 1 - Remoção e Desintoxicação</SelectItem>
                          <SelectItem value="2">Fase 2 - Reequilíbrio da Microbiota</SelectItem>
                          <SelectItem value="3">Fase 3 - Reparo e Manutenção</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Alimentos do Protocolo
                      </label>
                      <Accordion type="single" collapsible className="w-full">
                        {Object.entries(groupedFoods).map(([group, foods]) => (
                          <AccordionItem key={group} value={group}>
                            <AccordionTrigger className="text-sm hover:no-underline">
                              {group.charAt(0).toUpperCase() + group.slice(1)}
                            </AccordionTrigger>
                            <AccordionContent>
                              <ScrollArea className="h-[200px] w-full rounded-md border p-4">
                                <div className="space-y-2">
                                  {foods
                                    .filter(food => !phase || food.phase === parseInt(phase))
                                    .map((food) => (
                                      <div
                                        key={food.id}
                                        className={cn(
                                          "flex items-center space-x-2 rounded-lg p-2 cursor-pointer hover:bg-gray-100",
                                          selectedFood === food.id && "bg-primary-50"
                                        )}
                                        onClick={() => setSelectedFood(food.id)}
                                      >
                                        <div className="w-2 h-2 rounded-full bg-primary-300" />
                                        <span className="text-sm text-gray-700">{food.name}</span>
                                      </div>
                                    ))}
                                </div>
                              </ScrollArea>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </div>
                  </div>

                  <Button
                    onClick={handleFoodLog}
                    disabled={loading || !mealType || !selectedFood}
                    className="w-full bg-primary-500 hover:bg-primary-600 text-white"
                  >
                    {loading ? "Registrando..." : "Registrar Refeição"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="bg-white shadow-sm border-none">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Droplets className="w-5 h-5 text-primary-500" />
                    <h2 className="text-lg font-semibold text-gray-900">Ingestão de água</h2>
                  </div>
                  <div className="w-32 h-32 mx-auto">
                    <CircularProgressbar
                      value={waterPercentage}
                      text={`${waterPercentage}%`}
                      styles={buildStyles({
                        textSize: '16px',
                        pathColor: '#34D399',
                        textColor: '#34D399',
                        trailColor: '#E5E7EB',
                      })}
                    />
                  </div>
                  <div className="mt-4 flex justify-center">
                    <Button
                      onClick={handleAddWater}
                      className="bg-primary-50 hover:bg-primary-100 text-primary-500"
                      variant="ghost"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar 200ml
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white shadow-sm border-none">
                <CardContent className="p-6">
                  <button
                    onClick={() => setShowSavedMeals(!showSavedMeals)}
                    className="flex items-center justify-between w-full text-left"
                  >
                    <div className="flex items-center gap-2">
                      <Utensils className="w-5 h-5 text-primary-500" />
                      <h2 className="text-lg font-semibold text-gray-900">Refeições do Dia</h2>
                    </div>
                    {showSavedMeals ? (
                      <ChevronUp className="h-5 w-5" />
                    ) : (
                      <ChevronDown className="h-5 w-5" />
                    )}
                  </button>
                  
                  {showSavedMeals && (
                    <div className="mt-4 space-y-4">
                      {savedMeals.length === 0 ? (
                        <p className="text-gray-500 text-center">Nenhuma refeição registrada para este dia.</p>
                      ) : (
                        savedMeals.map((meal) => (
                          <Card key={meal.id} className="bg-gray-50">
                            <CardContent className="p-4">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h3 className="font-medium text-gray-900">
                                    {meal.meal_type === 'breakfast' && 'Café da manhã'}
                                    {meal.meal_type === 'lunch' && 'Almoço'}
                                    {meal.meal_type === 'dinner' && 'Jantar'}
                                    {meal.meal_type === 'snack' && 'Lanche'}
                                  </h3>
                                  <p className="text-sm text-gray-600">
                                    {meal.protocol_food?.name}
                                  </p>
                                </div>
                                <span className="text-sm text-gray-500">
                                  {format(new Date(meal.created_at), 'HH:mm')}
                                </span>
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <Card className="bg-white shadow-sm border-none">
            <CardContent className="p-6">
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-primary-500" />
                  <h2 className="text-lg font-semibold text-gray-900">Histórico Alimentar</h2>
                </div>
                <ScrollArea className="h-[400px] w-full rounded-md border p-4">
                  <div className="space-y-4">
                    {savedMeals.map((meal) => (
                      <Card key={meal.id} className="bg-gray-50">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-medium text-gray-900">
                                {meal.meal_type === 'breakfast' && 'Café da manhã'}
                                {meal.meal_type === 'lunch' && 'Almoço'}
                                {meal.meal_type === 'dinner' && 'Jantar'}
                                {meal.meal_type === 'snack' && 'Lanche'}
                              </h3>
                              <div className="space-y-1">
                                <p className="text-sm text-gray-600">
                                  {meal.protocol_food?.name}
                                </p>
                                <p className="text-xs text-gray-500">
                                  Grupo: {meal.protocol_food?.food_group}
                                </p>
                                <p className="text-xs text-gray-500">
                                  Fase: {meal.protocol_food?.phase}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-sm text-gray-500">
                                {format(new Date(meal.created_at), 'HH:mm')}
                              </span>
                              <p className="text-xs text-gray-500">
                                {format(new Date(meal.meal_date), 'dd/MM/yyyy')}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="progress">
          <Card className="bg-white shadow-sm border-none">
            <CardContent className="p-6">
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <List className="w-5 h-5 text-primary-500" />
                  <h2 className="text-lg font-semibold text-gray-900">Seu Progresso</h2>
                </div>

                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={symptomData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date"
                        stroke="#666"
                        tick={{ fill: '#666' }}
                      />
                      <YAxis
                        stroke="#666"
                        tick={{ fill: '#666' }}
                        domain={[0, 10]}
                      />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="discomfort"
                        name="Nível de Desconforto"
                        stroke="#1976D2"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="bloating"
                        name="Inchaço"
                        stroke="#2E7D32"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="gas"
                        name="Gases"
                        stroke="#ED6C02"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="abdominalPain"
                        name="Dor Abdominal"
                        stroke="#D32F2F"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="nausea"
                        name="Náusea"
                        stroke="#9C27B0"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="text-sm text-gray-600">Dias Registrados</h4>
                    <p className="text-2xl font-semibold text-primary-500">{stats.daysLogged}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="text-sm text-gray-600">Média de Desconforto</h4>
                    <p className="text-2xl font-semibold text-primary-500">{stats.averageDiscomfort}</p>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-600 mb-2">Legenda</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full bg-[#1976D2]" />
                      <span className="text-sm text-gray-600">Nível de Desconforto</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full bg-[#2E7D32]" />
                      <span className="text-sm text-gray-600">Inchaço</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full bg-[#ED6C02]" />
                      <span className="text-sm text-gray-600">Gases</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full bg-[#D32F2F]" />
                      <span className="text-sm text-gray-600">Dor Abdominal</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full bg-[#9C27B0]" />
                      <span className="text-sm text-gray-600">Náusea</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FoodDiary;

