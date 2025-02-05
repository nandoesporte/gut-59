import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { UtensilsCrossed } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const FoodDiary = () => {
  const { toast } = useToast();

  const handleFoodLog = () => {
    toast({
      title: "Refeição registrada",
      description: "Seu registro alimentar foi salvo com sucesso.",
    });
  };

  const mealOptions = {
    "Ao acordar": [
      "Água morna com limão",
      "Carvão ativado",
      "Chá verde",
      "Glutamina"
    ],
    "Café da manhã": [
      "Ovos mexidos com abacate",
      "Chá de gengibre com hortelã",
      "Panqueca de banana-verde",
      "Omelete com espinafre"
    ],
    "Lanche da manhã": [
      "Castanhas e coco seco",
      "Kefir com chia",
      "Frutas baixo FODMAP"
    ],
    "Almoço": [
      "Frango grelhado com legumes",
      "Peixe com purê de inhame",
      "Carne assada com arroz integral",
      "Salada com azeite e vinagre"
    ],
    "Lanche da tarde": [
      "Iogurte sem lactose com linhaça",
      "Smoothie de frutas vermelhas",
      "Castanhas e sementes"
    ],
    "Jantar": [
      "Caldo de ossos com vegetais",
      "Sopa de legumes",
      "Peixe grelhado com legumes"
    ],
    "Antes de dormir": [
      "Chá de camomila",
      "Chá de maracujá",
      "Glutamina",
      "Probiótico"
    ]
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="flex flex-row items-center space-x-2">
        <UtensilsCrossed className="w-6 h-6 text-primary-500" />
        <CardTitle className="text-2xl text-primary-500">
          Diário Alimentar
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fase do Protocolo
            </label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a fase" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fase1">Fase 1 - Remoção e Desintoxicação</SelectItem>
                <SelectItem value="fase2">Fase 2 - Reequilíbrio da Microbiota</SelectItem>
                <SelectItem value="fase3">Fase 3 - Reparo e Manutenção</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Refeição
            </label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a refeição" />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(mealOptions).map((meal) => (
                  <SelectItem key={meal} value={meal}>
                    {meal}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Alimentos Consumidos
            </label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Selecione os alimentos" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(mealOptions).map(([meal, foods]) => (
                  <SelectItem key={meal} value={meal}>
                    {foods.join(", ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Horário
            </label>
            <input
              type="time"
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Checklist de Hábitos
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="rounded text-primary-500 mr-2"
                />
                <span className="text-sm text-gray-700">
                  Bebi 2-3L de água
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="rounded text-primary-500 mr-2"
                />
                <span className="text-sm text-gray-700">
                  Mastiguei bem os alimentos (30 vezes)
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="rounded text-primary-500 mr-2"
                />
                <span className="text-sm text-gray-700">
                  Pratiquei atividade física
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="rounded text-primary-500 mr-2"
                />
                <span className="text-sm text-gray-700">
                  Dormi bem (7-8 horas)
                </span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Observações
            </label>
            <textarea
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              rows={3}
              placeholder="Adicione observações sobre a refeição, sintomas ou seu bem-estar"
            />
          </div>
        </div>

        <Button
          onClick={handleFoodLog}
          className="w-full bg-primary-500 hover:bg-primary-600 text-white"
        >
          Registrar Refeição
        </Button>
      </CardContent>
    </Card>
  );
};

export default FoodDiary;