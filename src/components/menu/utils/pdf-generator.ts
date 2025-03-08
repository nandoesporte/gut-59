
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { MealPlan } from "../types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Add typings for jsPDF-autotable
declare module "jspdf" {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

const dayNameMap: Record<string, string> = {
  segunda: "Segunda-feira",
  terca: "Terça-feira",
  quarta: "Quarta-feira",
  quinta: "Quinta-feira",
  sexta: "Sexta-feira",
  sabado: "Sábado",
  domingo: "Domingo"
};

// Helper to add a multiline text with wrapping
const addWrappedText = (
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  fontSize: number = 10
) => {
  doc.setFontSize(fontSize);
  const textLines = doc.splitTextToSize(text, maxWidth);
  doc.text(textLines, x, y);
  return y + lineHeight * textLines.length;
};

export const generateMealPlanPDF = async (mealPlan: MealPlan) => {
  // Create a PDF document
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;
  
  // Add title
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Plano Alimentar Semanal", pageWidth / 2, 20, { align: "center" });

  // Add date
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Gerado em: ${format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}`,
    pageWidth / 2,
    27,
    { align: "center" }
  );

  // Add separator line
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, 30, pageWidth - margin, 30);

  // Add weekly averages
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Médias Semanais", margin, 40);

  // Add chart data for weekly averages in a table
  doc.autoTable({
    startY: 45,
    head: [["Calorias", "Proteínas", "Carboidratos", "Gorduras", "Fibras"]],
    body: [
      [
        `${Math.round(mealPlan.weeklyTotals.averageCalories)} kcal`,
        `${Math.round(mealPlan.weeklyTotals.averageProtein)}g`,
        `${Math.round(mealPlan.weeklyTotals.averageCarbs)}g`,
        `${Math.round(mealPlan.weeklyTotals.averageFats)}g`,
        `${Math.round(mealPlan.weeklyTotals.averageFiber)}g`,
      ],
    ],
    theme: "grid",
    headStyles: { fillColor: [100, 100, 100], textColor: [255, 255, 255] },
    styles: { halign: "center" },
    margin: { left: margin, right: margin },
  });

  // Add general recommendations
  let yPos = 80;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Recomendações Gerais", margin, yPos);
  yPos += 7;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  yPos = addWrappedText(
    doc,
    mealPlan.recommendations.general,
    margin,
    yPos,
    contentWidth,
    5
  );

  yPos += 10;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Recomendações Pré-Treino", margin, yPos);
  yPos += 7;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  yPos = addWrappedText(
    doc,
    mealPlan.recommendations.preworkout,
    margin,
    yPos,
    contentWidth,
    5
  );

  yPos += 10;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Recomendações Pós-Treino", margin, yPos);
  yPos += 7;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  yPos = addWrappedText(
    doc,
    mealPlan.recommendations.postworkout,
    margin,
    yPos,
    contentWidth,
    5
  );

  // Daily meal plans
  Object.entries(mealPlan.weeklyPlan).forEach(([day, dayPlan], index) => {
    doc.addPage();
    
    // Add day title
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(`${dayNameMap[day]} - Plano Alimentar`, pageWidth / 2, 20, { align: "center" });
    
    // Add separator line
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, 25, pageWidth - margin, 25);
    
    let yPos = 35;
    
    // Add meals
    if (dayPlan.meals.cafeDaManha) {
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Café da Manhã", margin, yPos);
      yPos += 7;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      yPos = addWrappedText(doc, dayPlan.meals.cafeDaManha.description, margin, yPos, contentWidth, 5);
      
      // Add foods table
      doc.autoTable({
        startY: yPos + 5,
        head: [["Alimento", "Porção", "Detalhes"]],
        body: dayPlan.meals.cafeDaManha.foods.map((food) => [
          food.name,
          `${food.portion} ${food.unit}`,
          food.details,
        ]),
        theme: "grid",
        headStyles: { fillColor: [120, 120, 220], textColor: [255, 255, 255] },
        margin: { left: margin, right: margin },
      });
      
      yPos = (doc as any).lastAutoTable.finalY + 10;
    }
    
    if (dayPlan.meals.lancheDaManha) {
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Lanche da Manhã", margin, yPos);
      yPos += 7;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      yPos = addWrappedText(doc, dayPlan.meals.lancheDaManha.description, margin, yPos, contentWidth, 5);
      
      // Add foods table
      doc.autoTable({
        startY: yPos + 5,
        head: [["Alimento", "Porção", "Detalhes"]],
        body: dayPlan.meals.lancheDaManha.foods.map((food) => [
          food.name,
          `${food.portion} ${food.unit}`,
          food.details,
        ]),
        theme: "grid",
        headStyles: { fillColor: [120, 180, 120], textColor: [255, 255, 255] },
        margin: { left: margin, right: margin },
      });
      
      yPos = (doc as any).lastAutoTable.finalY + 10;
    }
    
    if (dayPlan.meals.almoco) {
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Almoço", margin, yPos);
      yPos += 7;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      yPos = addWrappedText(doc, dayPlan.meals.almoco.description, margin, yPos, contentWidth, 5);
      
      // Add foods table
      doc.autoTable({
        startY: yPos + 5,
        head: [["Alimento", "Porção", "Detalhes"]],
        body: dayPlan.meals.almoco.foods.map((food) => [
          food.name,
          `${food.portion} ${food.unit}`,
          food.details,
        ]),
        theme: "grid",
        headStyles: { fillColor: [200, 150, 100], textColor: [255, 255, 255] },
        margin: { left: margin, right: margin },
      });
      
      yPos = (doc as any).lastAutoTable.finalY + 10;
    }
    
    if (dayPlan.meals.lancheDaTarde) {
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Lanche da Tarde", margin, yPos);
      yPos += 7;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      yPos = addWrappedText(doc, dayPlan.meals.lancheDaTarde.description, margin, yPos, contentWidth, 5);
      
      // Add foods table
      doc.autoTable({
        startY: yPos + 5,
        head: [["Alimento", "Porção", "Detalhes"]],
        body: dayPlan.meals.lancheDaTarde.foods.map((food) => [
          food.name,
          `${food.portion} ${food.unit}`,
          food.details,
        ]),
        theme: "grid",
        headStyles: { fillColor: [120, 180, 120], textColor: [255, 255, 255] },
        margin: { left: margin, right: margin },
      });
      
      yPos = (doc as any).lastAutoTable.finalY + 10;
    }
    
    if (dayPlan.meals.jantar) {
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Jantar", margin, yPos);
      yPos += 7;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      yPos = addWrappedText(doc, dayPlan.meals.jantar.description, margin, yPos, contentWidth, 5);
      
      // Add foods table
      doc.autoTable({
        startY: yPos + 5,
        head: [["Alimento", "Porção", "Detalhes"]],
        body: dayPlan.meals.jantar.foods.map((food) => [
          food.name,
          `${food.portion} ${food.unit}`,
          food.details,
        ]),
        theme: "grid",
        headStyles: { fillColor: [150, 150, 200], textColor: [255, 255, 255] },
        margin: { left: margin, right: margin },
      });
      
      yPos = (doc as any).lastAutoTable.finalY + 10;
    }
    
    // Daily totals
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Totais do Dia", margin, yPos);
    
    // Add daily macros table
    doc.autoTable({
      startY: yPos + 5,
      head: [["Calorias", "Proteínas", "Carboidratos", "Gorduras", "Fibras"]],
      body: [
        [
          `${dayPlan.dailyTotals.calories} kcal`,
          `${dayPlan.dailyTotals.protein}g`,
          `${dayPlan.dailyTotals.carbs}g`,
          `${dayPlan.dailyTotals.fats}g`,
          `${dayPlan.dailyTotals.fiber}g`,
        ],
      ],
      theme: "grid",
      headStyles: { fillColor: [80, 80, 80], textColor: [255, 255, 255] },
      styles: { halign: "center" },
      margin: { left: margin, right: margin },
    });
  });

  // Save the PDF
  doc.save("plano-alimentar.pdf");
};
