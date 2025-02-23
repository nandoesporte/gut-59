
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
      pdf.text(`  ${food.details}`, 30, yPos);
      yPos += 5;
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
    Object.entries(plan.weeklyPlan).forEach(([day, dayPlan]) => {
      renderDayPlan(pdf, dayPlan, dayNameMap[day], isFirstPage);
      isFirstPage = false;
    });

    // Adicionar médias semanais na última página
    if (plan.weeklyTotals) {
      pdf.addPage();
      let yPos = 20;
      
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text("Médias Semanais", 20, yPos);
      yPos += 10;

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

    // Salvar o PDF
    pdf.save(`plano_alimentar_${format(new Date(), "dd_MM_yyyy")}.pdf`);
    toast.success("PDF gerado com sucesso!");
  } catch (error) {
    console.error("Erro ao gerar PDF:", error);
    toast.error("Erro ao gerar PDF do plano alimentar");
  }
};
