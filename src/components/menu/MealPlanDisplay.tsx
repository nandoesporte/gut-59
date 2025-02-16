
import { Button } from "@/components/ui/button";
import { Coffee, Utensils, Apple, Moon, Dumbbell, Plus, FileDown } from "lucide-react";
import { MealPlan, ProtocolFood } from "./types";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface MealSectionProps {
  title: string;
  icon: React.ReactNode;
  foods: ProtocolFood[];
  macros?: {
    protein: number;
    carbs: number;
    fats: number;
    fiber: number;
  };
  calories?: number;
}

const MealSection = ({ title, icon, foods, macros, calories }: MealSectionProps) => (
  <div className="bg-white rounded-lg shadow-sm p-6">
    <h2 className="text-lg font-semibold flex items-center gap-2">
      {icon}
      {title}
    </h2>
    <div className="mt-4 grid grid-cols-3 gap-3">
      {Array.isArray(foods) && foods.map((food) => (
        <Button
          key={food.id}
          variant="outline"
          className="flex items-center justify-center p-2 h-auto text-sm"
        >
          {food.name} ({food.portion}{food.portionUnit})
        </Button>
      ))}
    </div>
    {macros && calories && (
      <div className="mt-4 text-sm text-gray-600 border-t pt-4">
        <p className="font-medium">{calories} kcal</p>
        <div className="grid grid-cols-4 gap-2 mt-2">
          <div>P: {macros.protein}g</div>
          <div>C: {macros.carbs}g</div>
          <div>G: {macros.fats}g</div>
          <div>F: {macros.fiber}g</div>
        </div>
      </div>
    )}
  </div>
);

interface MealPlanDisplayProps {
  mealPlan: MealPlan;
  onReset: () => void;
}

export const MealPlanDisplay = ({ mealPlan, onReset }: MealPlanDisplayProps) => {
  const handleDownloadPDF = async () => {
    try {
      const element = document.getElementById('meal-plan-content');
      if (!element) return;

      const canvas = await html2canvas(element, {
        scale: 2,
        logging: false,
        useCORS: true
      });

      const imgWidth = 190;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/png');

      // Adicionar cabeçalho
      pdf.setFontSize(20);
      pdf.setTextColor(40, 167, 69); // cor verde
      pdf.text('Seu Plano Alimentar', 105, 15, { align: 'center' });
      
      // Adicionar data
      pdf.setFontSize(12);
      pdf.setTextColor(100);
      pdf.text(new Date().toLocaleDateString('pt-BR'), 105, 22, { align: 'center' });

      // Adicionar imagem do cardápio
      pdf.addImage(imgData, 'PNG', 10, 30, imgWidth, imgHeight);

      // Adicionar rodapé
      pdf.setFontSize(10);
      pdf.setTextColor(100);
      pdf.text('Gerado automaticamente pelo sistema', 105, 287, { align: 'center' });

      pdf.save('plano-alimentar.pdf');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
    }
  };

  if (!mealPlan?.dailyPlan) {
    return (
      <div className="text-center p-6">
        <p className="text-gray-600">Erro ao carregar o cardápio. Por favor, tente novamente.</p>
        <Button 
          onClick={onReset}
          className="mt-4 bg-green-500 hover:bg-green-600 text-white"
        >
          COMEÇAR NOVA DIETA
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Seu Plano Alimentar</h1>
        <Button
          onClick={handleDownloadPDF}
          variant="outline"
          className="flex items-center gap-2"
        >
          <FileDown className="h-4 w-4" />
          Baixar PDF
        </Button>
      </div>

      <div id="meal-plan-content" className="space-y-6">
        <MealSection
          title="Café da manhã"
          icon={<Coffee className="h-5 w-5" />}
          foods={mealPlan.dailyPlan.breakfast.foods || []}
          macros={mealPlan.dailyPlan.breakfast.macros}
          calories={mealPlan.dailyPlan.breakfast.calories}
        />

        <MealSection
          title="Lanche da Manhã"
          icon={<Apple className="h-5 w-5" />}
          foods={mealPlan.dailyPlan.morningSnack.foods || []}
          macros={mealPlan.dailyPlan.morningSnack.macros}
          calories={mealPlan.dailyPlan.morningSnack.calories}
        />

        <MealSection
          title="Almoço"
          icon={<Utensils className="h-5 w-5" />}
          foods={mealPlan.dailyPlan.lunch.foods || []}
          macros={mealPlan.dailyPlan.lunch.macros}
          calories={mealPlan.dailyPlan.lunch.calories}
        />

        <MealSection
          title="Lanche da Tarde"
          icon={<Apple className="h-5 w-5" />}
          foods={mealPlan.dailyPlan.afternoonSnack.foods || []}
          macros={mealPlan.dailyPlan.afternoonSnack.macros}
          calories={mealPlan.dailyPlan.afternoonSnack.calories}
        />

        <MealSection
          title="Jantar"
          icon={<Moon className="h-5 w-5" />}
          foods={mealPlan.dailyPlan.dinner.foods || []}
          macros={mealPlan.dailyPlan.dinner.macros}
          calories={mealPlan.dailyPlan.dinner.calories}
        />

        {mealPlan.recommendations && (
          <>
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Dumbbell className="h-5 w-5" />
                Treinos e Atividades
              </h2>
              <div className="mt-4 space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Pré-treino:</h4>
                  <p className="text-gray-600">{mealPlan.recommendations.preworkout}</p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Pós-treino:</h4>
                  <p className="text-gray-600">{mealPlan.recommendations.postworkout}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Adicionais na Dieta
              </h2>
              <div className="mt-4">
                <p className="text-gray-600">{mealPlan.recommendations.general}</p>
                {Array.isArray(mealPlan.recommendations.timing) && (
                  <div className="mt-4 space-y-2">
                    {mealPlan.recommendations.timing.map((tip, index) => (
                      <p key={index} className="text-gray-600">• {tip}</p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        <div className="py-6 border-t mt-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-lg">Total Diário</h3>
              <div className="grid grid-cols-4 gap-4 mt-2 text-sm text-gray-600">
                <div>Proteína: {mealPlan.totalNutrition.protein}g</div>
                <div>Carboidratos: {mealPlan.totalNutrition.carbs}g</div>
                <div>Gorduras: {mealPlan.totalNutrition.fats}g</div>
                <div>Fibras: {mealPlan.totalNutrition.fiber}g</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-green-600">
                {mealPlan.totalNutrition.calories}
              </div>
              <div className="text-sm text-gray-600">kcal totais</div>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4">
        <div className="container mx-auto max-w-3xl">
          <Button 
            onClick={onReset}
            className="w-full bg-green-500 hover:bg-green-600 text-white"
          >
            COMEÇAR NOVA DIETA
          </Button>
        </div>
      </div>
    </>
  );
};
