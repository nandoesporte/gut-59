
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { MealPlan, DailyPlan, Meal } from "../types";

const renderMealSection = (pdf: jsPDF, meal: Meal | undefined, title: string, yPos: number): number => {
  if (!meal) return yPos;

  pdf.setFontSize(12);
  pdf.setFont("helvetica", "bold");
  pdf.text(`${title} (${meal.calories} kcal)`, 20, yPos);
  yPos += 6;

  if (meal.description) {
    pdf.setFont("helvetica", "italic");
    pdf.setFontSize(10);
    const descriptionLines = pdf.splitTextToSize(meal.description, 170);
    descriptionLines.forEach((line: string) => {
      if (yPos > 270) {
        pdf.addPage();
        yPos = 20;
      }
      pdf.text(line, 25, yPos);
      yPos += 5;
    });
    yPos += 2;
  }

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  
  meal.foods.forEach(food => {
    if (yPos > 270) {
      pdf.addPage();
      yPos = 20;
    }
    pdf.text(`• ${food.portion} ${food.unit} de ${food.name}`, 25, yPos);
    yPos += 5;
    if (food.details) {
      const detailsLines = pdf.splitTextToSize(food.details, 160);
      detailsLines.forEach((line: string) => {
        if (yPos > 270) {
          pdf.addPage();
          yPos = 20;
        }
        pdf.text(`  ${line}`, 30, yPos);
        yPos += 5;
      });
    }
  });

  yPos += 5;
  pdf.setFontSize(9);
  pdf.text(`Proteínas: ${meal.macros.protein}g | Carboidratos: ${meal.macros.carbs}g | Gorduras: ${meal.macros.fats}g | Fibras: ${meal.macros.fiber}g`, 25, yPos);
  yPos += 10;

  return yPos;
};

const renderDayPlan = (pdf: jsPDF, dayPlan: DailyPlan, dayName: string, isFirstPage: boolean): number => {
  let yPos = isFirstPage ? 20 : 40;

  if (!isFirstPage) {
    pdf.addPage();
  }

  // Título do dia
  pdf.setFontSize(14);
  pdf.setFont("helvetica", "bold");
  pdf.text(dayName, 20, yPos);
  yPos += 15;

  // Refeições
  if (dayPlan.meals.breakfast) {
    yPos = renderMealSection(pdf, dayPlan.meals.breakfast, "Café da Manhã", yPos);
  }
  if (dayPlan.meals.morningSnack) {
    yPos = renderMealSection(pdf, dayPlan.meals.morningSnack, "Lanche da Manhã", yPos);
  }
  if (dayPlan.meals.lunch) {
    yPos = renderMealSection(pdf, dayPlan.meals.lunch, "Almoço", yPos);
  }
  if (dayPlan.meals.afternoonSnack) {
    yPos = renderMealSection(pdf, dayPlan.meals.afternoonSnack, "Lanche da Tarde", yPos);
  }
  if (dayPlan.meals.dinner) {
    yPos = renderMealSection(pdf, dayPlan.meals.dinner, "Jantar", yPos);
  }

  // Totais diários
  if (dayPlan.dailyTotals) {
    yPos += 5;
    pdf.setFontSize(11);
    pdf.setFont("helvetica", "bold");
    pdf.text("Totais do Dia:", 20, yPos);
    yPos += 6;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.text(`Calorias: ${Math.round(dayPlan.dailyTotals.calories)} kcal`, 25, yPos);
    yPos += 5;
    pdf.text(`Proteínas: ${Math.round(dayPlan.dailyTotals.protein)}g | Carboidratos: ${Math.round(dayPlan.dailyTotals.carbs)}g | Gorduras: ${Math.round(dayPlan.dailyTotals.fats)}g | Fibras: ${Math.round(dayPlan.dailyTotals.fiber)}g`, 25, yPos);
  }

  return yPos;
};

const renderRecommendations = (pdf: jsPDF, recommendations: MealPlan['recommendations']) => {
  pdf.addPage();
  let yPos = 20;

  pdf.setFontSize(14);
  pdf.setFont("helvetica", "bold");
  pdf.text("Recomendações e Observações", 20, yPos);
  yPos += 15;

  pdf.setFontSize(11);
  pdf.setFont("helvetica", "bold");
  pdf.text("Recomendações Gerais:", 20, yPos);
  yPos += 8;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  const generalLines = pdf.splitTextToSize(recommendations.general, 170);
  generalLines.forEach((line: string) => {
    pdf.text(line, 25, yPos);
    yPos += 6;
  });
  yPos += 5;

  if (recommendations.preworkout) {
    pdf.setFont("helvetica", "bold");
    pdf.text("Pré-treino:", 20, yPos);
    yPos += 8;
    pdf.setFont("helvetica", "normal");
    const preworkoutLines = pdf.splitTextToSize(recommendations.preworkout, 170);
    preworkoutLines.forEach((line: string) => {
      pdf.text(line, 25, yPos);
      yPos += 6;
    });
    yPos += 5;
  }

  if (recommendations.postworkout) {
    pdf.setFont("helvetica", "bold");
    pdf.text("Pós-treino:", 20, yPos);
    yPos += 8;
    pdf.setFont("helvetica", "normal");
    const postworkoutLines = pdf.splitTextToSize(recommendations.postworkout, 170);
    postworkoutLines.forEach((line: string) => {
      pdf.text(line, 25, yPos);
      yPos += 6;
    });
    yPos += 5;
  }

  if (recommendations.timing && recommendations.timing.length > 0) {
    pdf.setFont("helvetica", "bold");
    pdf.text("Horários Recomendados:", 20, yPos);
    yPos += 8;
    pdf.setFont("helvetica", "normal");
    recommendations.timing.forEach(timing => {
      pdf.text(`• ${timing}`, 25, yPos);
      yPos += 6;
    });
  }
};

export const generateMealPlanPDF = async (plan: MealPlan) => {
  try {
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    // Título do documento
    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.text("Plano Alimentar Semanal", 105, 15, { align: "center" });

    const dayNameMap: Record<string, string> = {
      monday: "Segunda-feira",
      tuesday: "Terça-feira",
      wednesday: "Quarta-feira",
      thursday: "Quinta-feira",
      friday: "Sexta-feira",
      saturday: "Sábado",
      sunday: "Domingo"
    };

    let isFirstPage = true;
    
    // Verificar se o plano tem a estrutura esperada
    if (!plan.weeklyPlan || Object.keys(plan.weeklyPlan).length === 0) {
      throw new Error("Plano alimentar inválido ou incompleto");
    }

    Object.entries(plan.weeklyPlan).forEach(([day, dayPlan]) => {
      renderDayPlan(pdf, dayPlan, dayNameMap[day], isFirstPage);
      isFirstPage = false;
    });

    // Adicionar médias semanais
    pdf.addPage();
    let yPos = 20;
    
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.text("Médias Semanais", 20, yPos);
    yPos += 10;

    if (plan.weeklyTotals) {
      pdf.setFontSize(11);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Calorias: ${Math.round(plan.weeklyTotals.averageCalories)} kcal`, 25, yPos);
      yPos += 6;
      pdf.text(`Proteínas: ${Math.round(plan.weeklyTotals.averageProtein)}g`, 25, yPos);
      yPos += 6;
      pdf.text(`Carboidratos: ${Math.round(plan.weeklyTotals.averageCarbs)}g`, 25, yPos);
      yPos += 6;
      pdf.text(`Gorduras: ${Math.round(plan.weeklyTotals.averageFats)}g`, 25, yPos);
      yPos += 6;
      pdf.text(`Fibras: ${Math.round(plan.weeklyTotals.averageFiber)}g`, 25, yPos);
    }

    // Adicionar recomendações
    if (plan.recommendations) {
      renderRecommendations(pdf, plan.recommendations);
    }

    // Adicionar rodapé com data de geração
    const pageCount = pdf.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setTextColor(100);
      pdf.text(
        `Gerado em: ${format(new Date(), "dd/MM/yyyy")} | Página ${i} de ${pageCount}`,
        pdf.internal.pageSize.width / 2,
        pdf.internal.pageSize.height - 10,
        { align: "center" }
      );
    }

    // Salvar o PDF
    const fileName = `plano_alimentar_${format(new Date(), "dd_MM_yyyy")}.pdf`;
    pdf.save(fileName);
    
    return true;
  } catch (error) {
    console.error("Erro ao gerar PDF:", error);
    throw error;
  }
};
