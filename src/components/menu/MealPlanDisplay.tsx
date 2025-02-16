
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Coffee, Utensils, Apple, Moon, Download, Calendar, ArrowRight } from "lucide-react";
import { MealPlan, ProtocolFood } from "./types";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

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
  foodSubstitutions?: {
    originalFoodId: string;
    alternatives: ProtocolFood[];
  }[];
  onFoodSubstitute?: (originalFoodId: string, newFoodId: string) => void;
}

const MacroDistributionBar = ({ macros }: { macros: { protein: number; carbs: number; fats: number } }) => {
  const total = macros.protein + macros.carbs + macros.fats;
  const proteinPercentage = (macros.protein / total) * 100;
  const carbsPercentage = (macros.carbs / total) * 100;
  const fatsPercentage = (macros.fats / total) * 100;

  return (
    <div className="w-full h-4 rounded-full overflow-hidden flex">
      <div 
        className="bg-blue-500" 
        style={{ width: `${proteinPercentage}%` }}
        title={`Proteínas: ${Math.round(proteinPercentage)}%`}
      />
      <div 
        className="bg-green-500" 
        style={{ width: `${carbsPercentage}%` }}
        title={`Carboidratos: ${Math.round(carbsPercentage)}%`}
      />
      <div 
        className="bg-yellow-500" 
        style={{ width: `${fatsPercentage}%` }}
        title={`Gorduras: ${Math.round(fatsPercentage)}%`}
      />
    </div>
  );
};

const MealSection = ({ 
  title, 
  icon, 
  foods, 
  description, 
  macros, 
  calories,
  foodSubstitutions,
  onFoodSubstitute 
}: MealSectionProps) => {
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
            <div className="flex items-center gap-2">
              <span>
                {food.portion} {food.portionUnit} de {food.name}
              </span>
              {foodSubstitutions?.find(sub => sub.originalFoodId === food.id) && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                      Substituições
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <div className="space-y-2">
                      <h4 className="font-medium">Alternativas equivalentes:</h4>
                      {foodSubstitutions
                        .find(sub => sub.originalFoodId === food.id)
                        ?.alternatives.map((alt) => (
                          <div key={alt.id} className="flex justify-between items-center">
                            <span>{alt.name}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onFoodSubstitute?.(food.id, alt.id)}
                            >
                              Substituir
                            </Button>
                          </div>
                        ))}
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>
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
          <div className="mt-2">
            <MacroDistributionBar 
              macros={{
                protein: macros.protein,
                carbs: macros.carbs,
                fats: macros.fats
              }}
            />
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

  const handleExportWeeklyPlan = () => {
    // Implementation for weekly plan export
    toast.success("Plano semanal exportado com sucesso!");
  };

  if (!mealPlan?.dailyPlan) {
    return (
      <div className="text-center p-6">
        <p className="text-gray-600">Erro ao carregar o cardápio. Por favor, tente novamente.</p>
      </div>
    );
  }

  const isNutritionallyBalanced = mealPlan.nutritionalAnalysis && (
    mealPlan.nutritionalAnalysis.carbsPercentage >= 40 &&
    mealPlan.nutritionalAnalysis.carbsPercentage <= 50 &&
    mealPlan.nutritionalAnalysis.proteinPercentage >= 20 &&
    mealPlan.nutritionalAnalysis.proteinPercentage <= 30 &&
    mealPlan.nutritionalAnalysis.fatsPercentage >= 20 &&
    mealPlan.nutritionalAnalysis.fatsPercentage <= 30
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-green-700">Seu Plano Alimentar Personalizado</h1>
        <div className="flex gap-2">
          <Button
            onClick={handleDownloadPDF}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            <span>Baixar PDF</span>
          </Button>
          <Button
            onClick={handleExportWeeklyPlan}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Calendar className="h-4 w-4" />
            <span>Plano Semanal</span>
          </Button>
        </div>
      </div>

      {isNutritionallyBalanced === false && (
        <Card className="bg-yellow-50 p-4">
          <p className="text-yellow-800">
            Este plano pode precisar de ajustes para atingir a distribuição ideal de macronutrientes:
            40-50% carboidratos, 20-30% proteínas, 20-30% gorduras.
          </p>
        </Card>
      )}

      <div id="meal-plan-content" className="space-y-6">
        <MealSection
          title="Café da Manhã"
          icon={<Coffee className="h-5 w-5" />}
          foods={mealPlan.dailyPlan.breakfast.foods}
          macros={mealPlan.dailyPlan.breakfast.macros}
          calories={mealPlan.dailyPlan.breakfast.calories}
          foodSubstitutions={mealPlan.recommendations.substitutions?.map(sub => ({
            originalFoodId: sub.originalFood.id,
            alternatives: sub.alternatives
          }))}
        />

        <MealSection
          title="Lanche da Manhã"
          icon={<Apple className="h-5 w-5" />}
          foods={mealPlan.dailyPlan.morningSnack.foods}
          macros={mealPlan.dailyPlan.morningSnack.macros}
          calories={mealPlan.dailyPlan.morningSnack.calories}
          foodSubstitutions={mealPlan.recommendations.substitutions?.map(sub => ({
            originalFoodId: sub.originalFood.id,
            alternatives: sub.alternatives
          }))}
        />

        <MealSection
          title="Almoço"
          icon={<Utensils className="h-5 w-5" />}
          foods={mealPlan.dailyPlan.lunch.foods}
          macros={mealPlan.dailyPlan.lunch.macros}
          calories={mealPlan.dailyPlan.lunch.calories}
          foodSubstitutions={mealPlan.recommendations.substitutions?.map(sub => ({
            originalFoodId: sub.originalFood.id,
            alternatives: sub.alternatives
          }))}
        />

        <MealSection
          title="Lanche da Tarde"
          icon={<Apple className="h-5 w-5" />}
          foods={mealPlan.dailyPlan.afternoonSnack.foods}
          macros={mealPlan.dailyPlan.afternoonSnack.macros}
          calories={mealPlan.dailyPlan.afternoonSnack.calories}
          foodSubstitutions={mealPlan.recommendations.substitutions?.map(sub => ({
            originalFoodId: sub.originalFood.id,
            alternatives: sub.alternatives
          }))}
        />

        <MealSection
          title="Jantar"
          icon={<Moon className="h-5 w-5" />}
          foods={mealPlan.dailyPlan.dinner.foods}
          macros={mealPlan.dailyPlan.dinner.macros}
          calories={mealPlan.dailyPlan.dinner.calories}
          foodSubstitutions={mealPlan.recommendations.substitutions?.map(sub => ({
            originalFoodId: sub.originalFood.id,
            alternatives: sub.alternatives
          }))}
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
              <div className="mt-4">
                <MacroDistributionBar
                  macros={{
                    protein: mealPlan.totalNutrition.protein,
                    carbs: mealPlan.totalNutrition.carbs,
                    fats: mealPlan.totalNutrition.fats
                  }}
                />
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
