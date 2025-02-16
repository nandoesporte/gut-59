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
      toast.info("Gerando PDF do cardápio...");
      
      const element = document.getElementById('meal-plan-content');
      if (!element) return;

      // Configurações do PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      let currentY = margin;

      // Adicionar cabeçalho na primeira página
      const logoImg = document.querySelector('img[alt="Mais Saúde"]') as HTMLImageElement;
      if (logoImg) {
        pdf.addImage(logoImg.src, 'PNG', margin, currentY, 20, 20);
      }

      // Título e data
      pdf.setFontSize(20);
      pdf.setTextColor(40, 167, 69);
      pdf.text('Mais Saúde', margin + 25, currentY + 12);
      pdf.setFontSize(16);
      pdf.text('Plano Alimentar Personalizado', margin + 25, currentY + 18);
      
      pdf.setFontSize(12);
      pdf.setTextColor(100);
      pdf.text(new Date().toLocaleDateString('pt-BR'), pageWidth - margin, currentY + 10, { align: 'right' });
      
      currentY += 35;

      // Função auxiliar para adicionar uma nova página
      const addNewPage = () => {
        pdf.addPage();
        currentY = margin;
        // Adicionar cabeçalho reduzido nas páginas subsequentes
        pdf.setFontSize(10);
        pdf.setTextColor(100);
        pdf.text('Mais Saúde - Plano Alimentar', margin, margin);
        pdf.text(new Date().toLocaleDateString('pt-BR'), pageWidth - margin, margin, { align: 'right' });
        currentY += 15;
      };

      // Gerar imagem para cada seção do cardápio
      const sections = ['breakfast', 'morningSnack', 'lunch', 'afternoonSnack', 'dinner'];
      const titles = {
        breakfast: 'Café da Manhã',
        morningSnack: 'Lanche da Manhã',
        lunch: 'Almoço',
        afternoonSnack: 'Lanche da Tarde',
        dinner: 'Jantar'
      };

      // Adicionar cada seção do cardápio
      for (const section of sections) {
        const sectionElement = document.getElementById(`meal-section-${section}`);
        if (!sectionElement) continue;

        const canvas = await html2canvas(sectionElement, {
          scale: 2,
          logging: false,
          useCORS: true
        });

        const imgWidth = pageWidth - (2 * margin);
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        // Verificar se precisa de uma nova página
        if (currentY + imgHeight > pageHeight - margin) {
          addNewPage();
        }

        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', margin, currentY, imgWidth, imgHeight);
        currentY += imgHeight + 10;
      }

      // Adicionar totais diários
      const totalsElement = document.getElementById('daily-totals');
      if (totalsElement) {
        if (currentY + 40 > pageHeight - margin) {
          addNewPage();
        }

        const canvas = await html2canvas(totalsElement, {
          scale: 2,
          logging: false,
          useCORS: true
        });

        const imgWidth = pageWidth - (2 * margin);
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        const imgData = canvas.toDataURL('image/png');
        
        pdf.addImage(imgData, 'PNG', margin, currentY, imgWidth, imgHeight);
        currentY += imgHeight + 10;
      }

      // Adicionar recomendações
      const recommendationsElement = document.getElementById('recommendations');
      if (recommendationsElement) {
        if (currentY + 60 > pageHeight - margin) {
          addNewPage();
        }

        const canvas = await html2canvas(recommendationsElement, {
          scale: 2,
          logging: false,
          useCORS: true
        });

        const imgWidth = pageWidth - (2 * margin);
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        const imgData = canvas.toDataURL('image/png');
        
        pdf.addImage(imgData, 'PNG', margin, currentY, imgWidth, imgHeight);
      }

      // Adicionar rodapé em todas as páginas
      const totalPages = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(128);
        pdf.text(
          `Página ${i} de ${totalPages}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      }

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
        <div id="meal-section-breakfast">
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
        </div>

        <div id="meal-section-morningSnack">
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
        </div>

        <div id="meal-section-lunch">
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
        </div>

        <div id="meal-section-afternoonSnack">
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
        </div>

        <div id="meal-section-dinner">
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
        </div>

        <div id="daily-totals">
          <DailyTotals totalNutrition={mealPlan.totalNutrition} />
        </div>
      </div>

      {mealPlan.recommendations && (
        <div id="recommendations">
          <Recommendations recommendations={mealPlan.recommendations} />
        </div>
      )}
    </div>
  );
};
