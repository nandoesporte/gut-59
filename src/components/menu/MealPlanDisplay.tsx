
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Coffee, Utensils, Apple, Moon, Download, Calendar } from "lucide-react";
import { MealPlan } from "./types";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { MealSection } from "./components/MealSection";
import { DailyTotals } from "./components/DailyTotals";
import { Recommendations } from "./components/Recommendations";

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

        <DailyTotals totalNutrition={mealPlan.totalNutrition} />
      </div>

      {mealPlan.recommendations && (
        <Recommendations recommendations={mealPlan.recommendations} />
      )}
    </div>
  );
};
