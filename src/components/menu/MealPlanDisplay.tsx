
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Coffee, Utensils, Apple, Moon } from "lucide-react";
import { MealPlan, ProtocolFood } from "./types";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface MealSectionProps {
  title: string;
  icon: React.ReactNode;
  foods: ProtocolFood[];
  description?: string;
  macros?: {
    protein: number;
    carbs: number;
    fats: number;
    fiber: number;
  };
  calories?: number;
}

const MealSection = ({ title, icon, foods, description, macros, calories }: MealSectionProps) => {
  const formatDescription = (description: string) => {
    return description.split('\n').map((line, index) => (
      <p key={index} className="text-sm text-gray-600 mb-1">
        {line}
      </p>
    ));
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-lg font-semibold flex items-center gap-2 text-green-700">
        {icon}
        {title} {calories && `(${calories} kcal)`}
      </h2>
      <div className="mt-4 space-y-2">
        {Array.isArray(foods) && foods.map((food) => (
          <div key={food.id} className="flex justify-between items-center text-gray-700">
            <span>
              {food.portion} {food.portionUnit} de {food.name}
            </span>
            <span className="text-gray-500">
              ({food.calculatedNutrients?.calories} kcal)
            </span>
          </div>
        ))}
      </div>
      {description && (
        <div className="mt-4 text-gray-600 border-t border-gray-100 pt-4">
          {formatDescription(description)}
        </div>
      )}
      {macros && (
        <div className="mt-4 text-sm text-gray-600 border-t pt-4">
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
};

export const MealPlanDisplay = ({ mealPlan }: { mealPlan: MealPlan }) => {
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

      pdf.setFontSize(20);
      pdf.setTextColor(40, 167, 69);
      pdf.text('Seu Plano Alimentar Personalizado', 105, 15, { align: 'center' });
      
      pdf.setFontSize(12);
      pdf.setTextColor(100);
      pdf.text(new Date().toLocaleDateString('pt-BR'), 105, 22, { align: 'center' });

      pdf.addImage(imgData, 'PNG', 10, 30, imgWidth, imgHeight);

      pdf.setFontSize(10);
      pdf.text('Gerado automaticamente pelo sistema', 105, 287, { align: 'center' });

      pdf.save('plano-alimentar.pdf');
      toast.success("PDF do cardápio baixado com sucesso!");
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error("Erro ao gerar o PDF do cardápio");
    }
  };

  if (!mealPlan?.dailyPlan) {
    return (
      <div className="text-center p-6">
        <p className="text-gray-600">Erro ao carregar o cardápio. Por favor, tente novamente.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-green-700">Seu Plano Alimentar Personalizado</h1>
        <Button
          onClick={handleDownloadPDF}
          variant="outline"
          className="flex items-center gap-2"
        >
          <span>Baixar PDF</span>
        </Button>
      </div>

      <div id="meal-plan-content" className="space-y-6">
        <MealSection
          title="Café da Manhã"
          icon={<Coffee className="h-5 w-5" />}
          foods={mealPlan.dailyPlan.breakfast.foods}
          macros={mealPlan.dailyPlan.breakfast.macros}
          calories={mealPlan.dailyPlan.breakfast.calories}
        />

        <MealSection
          title="Lanche da Manhã"
          icon={<Apple className="h-5 w-5" />}
          foods={mealPlan.dailyPlan.morningSnack.foods}
          macros={mealPlan.dailyPlan.morningSnack.macros}
          calories={mealPlan.dailyPlan.morningSnack.calories}
        />

        <MealSection
          title="Almoço"
          icon={<Utensils className="h-5 w-5" />}
          foods={mealPlan.dailyPlan.lunch.foods}
          macros={mealPlan.dailyPlan.lunch.macros}
          calories={mealPlan.dailyPlan.lunch.calories}
        />

        <MealSection
          title="Lanche da Tarde"
          icon={<Apple className="h-5 w-5" />}
          foods={mealPlan.dailyPlan.afternoonSnack.foods}
          macros={mealPlan.dailyPlan.afternoonSnack.macros}
          calories={mealPlan.dailyPlan.afternoonSnack.calories}
        />

        <MealSection
          title="Jantar"
          icon={<Moon className="h-5 w-5" />}
          foods={mealPlan.dailyPlan.dinner.foods}
          macros={mealPlan.dailyPlan.dinner.macros}
          calories={mealPlan.dailyPlan.dinner.calories}
        />

        <div className="py-6 border-t mt-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-lg text-green-700">Totais Diários</h3>
              <div className="grid grid-cols-4 gap-4 mt-2 text-sm text-gray-600">
                <div>Proteínas: {mealPlan.totalNutrition.protein}g</div>
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

      {mealPlan.recommendations && (
        <Card className="p-6 mt-6">
          <h3 className="font-semibold text-lg text-green-700 mb-4">Recomendações</h3>
          <div className="space-y-4 text-gray-700">
            {mealPlan.recommendations.general && (
              <p>{mealPlan.recommendations.general}</p>
            )}
            {mealPlan.recommendations.timing && (
              <ul className="list-disc pl-5 space-y-2">
                {mealPlan.recommendations.timing.map((tip, index) => (
                  <li key={index}>{tip}</li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};
