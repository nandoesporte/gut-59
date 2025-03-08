
import React, { useState } from 'react';
import { ProtocolFood } from './types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Search, CheckCircle2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FOOD_GROUP_MAP } from './hooks/useProtocolFoods';

interface FoodSelectorProps {
  protocolFoods: ProtocolFood[];
  selectedFoods: ProtocolFood[];
  onFoodSelection: (food: ProtocolFood) => void;
  totalCalories: number;
  onBack: () => void;
  onConfirm: () => void;
}

export const FoodSelector = ({
  protocolFoods,
  selectedFoods,
  onFoodSelection,
  totalCalories,
  onBack,
  onConfirm
}: FoodSelectorProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const foodGroups = [
    { id: 'all', name: 'Todos' },
    { id: '1', name: 'Café da Manhã' },
    { id: '2', name: 'Lanche da Manhã' },
    { id: '3', name: 'Almoço' },
    { id: '4', name: 'Lanche da Tarde' },
    { id: '5', name: 'Jantar' }
  ];

  const filteredFoods = protocolFoods.filter(food => {
    const matchesSearch = food.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = activeTab === 'all' || food.food_group_id?.toString() === activeTab;
    return matchesSearch && matchesTab;
  });

  const isSelected = (food: ProtocolFood) => {
    return selectedFoods.some(selected => selected.id === food.id);
  };

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Pesquisar alimentos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full flex flex-wrap justify-start gap-2 mb-4">
          {foodGroups.map((group) => (
            <TabsTrigger
              key={group.id}
              value={group.id}
              className="text-xs sm:text-sm px-2 py-1 h-auto"
            >
              {group.name}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className="mt-0">
          <ScrollArea className="h-[320px] pr-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {filteredFoods.length > 0 ? (
                filteredFoods.map((food) => (
                  <Card
                    key={food.id}
                    className={`p-3 cursor-pointer ${
                      isSelected(food) ? 'border-2 border-primary' : ''
                    }`}
                    onClick={() => onFoodSelection(food)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-sm">{food.name}</h4>
                        <p className="text-xs text-gray-500">
                          {food.food_group_name || FOOD_GROUP_MAP[food.food_group_id as keyof typeof FOOD_GROUP_MAP] || 'Outros'}
                        </p>
                        <div className="text-xs mt-1">
                          <span className="inline-block bg-blue-100 text-blue-800 rounded px-1 mr-1">
                            {food.calories} kcal
                          </span>
                          <span className="inline-block bg-red-100 text-red-800 rounded px-1 mr-1">
                            P: {food.protein}g
                          </span>
                          <span className="inline-block bg-amber-100 text-amber-800 rounded px-1 mr-1">
                            C: {food.carbs}g
                          </span>
                          <span className="inline-block bg-green-100 text-green-800 rounded px-1">
                            G: {food.fats}g
                          </span>
                        </div>
                      </div>
                      {isSelected(food) && (
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  </Card>
                ))
              ) : (
                <div className="col-span-2 text-center py-8 text-gray-500">
                  Nenhum alimento encontrado para esta pesquisa.
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t">
        <div>
          <p className="text-sm font-medium">
            {selectedFoods.length} alimentos selecionados
          </p>
          <p className="text-xs text-gray-500">
            Selecione pelo menos 5 alimentos que você gosta de comer
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={onBack}
            className="flex-1 sm:flex-initial"
          >
            Voltar
          </Button>
          <Button
            onClick={onConfirm}
            disabled={selectedFoods.length < 5}
            className="flex-1 sm:flex-initial"
          >
            Continuar
          </Button>
        </div>
      </div>
    </div>
  );
};
