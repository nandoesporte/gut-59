
import { jsPDF } from 'jspdf';
import { MealPlan } from '../types';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const dayNameMap: Record<string, string> = {
  monday: "Segunda-feira",
  tuesday: "Terça-feira",
  wednesday: "Quarta-feira",
  thursday: "Quinta-feira",
  friday: "Sexta-feira",
  saturday: "Sábado",
  sunday: "Domingo"
};

export const generateMealPlanPDF = async (mealPlan: MealPlan) => {
  try {
    // Criar novo documento PDF
    const doc = new jsPDF();
    let yPos = 20;
    const lineHeight = 10;

    // Configurar fonte padrão para suportar acentos
    doc.setFont("helvetica");
    
    // Adicionar título
    doc.setFontSize(20);
    doc.setTextColor(0, 0, 0);
    doc.text('Plano Alimentar Semanal', 105, yPos, { align: 'center' });
    yPos += lineHeight * 2;
    
    // Adicionar data de geração
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Gerado em ${format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}`, 105, yPos, { align: 'center' });
    yPos += lineHeight * 2;

    // Para cada dia da semana no plano
    for (const [dayKey, dayName] of Object.entries(dayNameMap)) {
      const dayPlan = mealPlan.weeklyPlan[dayKey as keyof typeof mealPlan.weeklyPlan];
      if (!dayPlan) continue;

      // Adicionar nova página para cada dia (exceto o primeiro)
      if (dayKey !== 'monday') {
        doc.addPage();
        yPos = 20;
      }

      // Título do dia
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text(`${dayName} - Plano Alimentar`, 105, yPos, { align: 'center' });
      yPos += lineHeight * 1.5;

      // Funções para adicionar refeições
      const addMeal = (title: string, meal: any) => {
        if (!meal) return;

        doc.setFontSize(13);
        doc.setTextColor(0, 102, 204);
        doc.text(`${title}:`, 20, yPos);
        yPos += lineHeight;

        // Descrição da refeição
        if (meal.description) {
          doc.setFontSize(10);
          doc.setTextColor(100, 100, 100);
          doc.text(`${meal.description}`, 20, yPos);
          yPos += lineHeight;
        }

        // Alimentos na refeição
        if (meal.foods && meal.foods.length > 0) {
          doc.setFontSize(10);
          doc.setTextColor(0, 0, 0);
          
          for (const food of meal.foods) {
            let foodText = `• ${food.portion} ${food.unit} de ${food.name}`;
            
            // Verificar o tamanho do texto para evitar estouro de margem
            if (doc.getTextWidth(foodText) > 170) {
              // Quebrar em duas linhas se o texto for muito longo
              doc.text(`• ${food.portion} ${food.unit} de`, 20, yPos);
              yPos += lineHeight * 0.8;
              doc.text(`  ${food.name}`, 20, yPos);
            } else {
              doc.text(foodText, 20, yPos);
            }
            
            yPos += lineHeight;
            
            // Adicionar detalhes se houver
            if (food.details) {
              doc.setTextColor(100, 100, 100);
              doc.text(`  ${food.details}`, 23, yPos);
              doc.setTextColor(0, 0, 0);
              yPos += lineHeight;
            }
          }
        }

        // Adicionar informações nutricionais
        if (meal.calories || meal.macros) {
          doc.setFontSize(9);
          doc.setTextColor(50, 50, 50);
          
          let macroText = `Total: ${meal.calories} kcal | `;
          macroText += `Proteínas: ${meal.macros?.protein || 0}g | `;
          macroText += `Carbos: ${meal.macros?.carbs || 0}g | `;
          macroText += `Gorduras: ${meal.macros?.fats || 0}g | `;
          macroText += `Fibras: ${meal.macros?.fiber || 0}g`;
          
          doc.text(macroText, 20, yPos);
          yPos += lineHeight * 1.5;
        }
      };

      // Adicionar cada refeição
      if (dayPlan.meals.breakfast) {
        addMeal("Café da Manhã", dayPlan.meals.breakfast);
      }
      if (dayPlan.meals.morningSnack) {
        addMeal("Lanche da Manhã", dayPlan.meals.morningSnack);
      }
      if (dayPlan.meals.lunch) {
        addMeal("Almoço", dayPlan.meals.lunch);
      }
      if (dayPlan.meals.afternoonSnack) {
        addMeal("Lanche da Tarde", dayPlan.meals.afternoonSnack);
      }
      if (dayPlan.meals.dinner) {
        addMeal("Jantar", dayPlan.meals.dinner);
      }

      // Adicionar totais diários
      if (dayPlan.dailyTotals) {
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text("Totais Diários:", 20, yPos);
        yPos += lineHeight;

        doc.setFontSize(10);
        let totalText = `Calorias: ${dayPlan.dailyTotals.calories} kcal | `;
        totalText += `Proteínas: ${dayPlan.dailyTotals.protein}g | `;
        totalText += `Carboidratos: ${dayPlan.dailyTotals.carbs}g | `;
        totalText += `Gorduras: ${dayPlan.dailyTotals.fats}g | `;
        totalText += `Fibras: ${dayPlan.dailyTotals.fiber}g`;
        
        doc.text(totalText, 20, yPos);
        yPos += lineHeight * 2;
      }
    }

    // Adicionar página final com médias semanais e recomendações
    doc.addPage();
    yPos = 20;

    // Título da página
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text("Resumo e Recomendações", 105, yPos, { align: 'center' });
    yPos += lineHeight * 2;

    // Médias semanais
    if (mealPlan.weeklyTotals) {
      doc.setFontSize(14);
      doc.text("Médias Semanais:", 20, yPos);
      yPos += lineHeight * 1.5;

      doc.setFontSize(10);
      let statText = `Calorias: ${Math.round(mealPlan.weeklyTotals.averageCalories)} kcal/dia\n`;
      statText += `Proteínas: ${Math.round(mealPlan.weeklyTotals.averageProtein)}g/dia\n`;
      statText += `Carboidratos: ${Math.round(mealPlan.weeklyTotals.averageCarbs)}g/dia\n`;
      statText += `Gorduras: ${Math.round(mealPlan.weeklyTotals.averageFats)}g/dia\n`;
      statText += `Fibras: ${Math.round(mealPlan.weeklyTotals.averageFiber)}g/dia`;
      
      doc.text(statText, 25, yPos);
      yPos += lineHeight * 6;
    }

    // Adicionar recomendações
    if (mealPlan.recommendations) {
      doc.setFontSize(14);
      doc.text("Recomendações:", 20, yPos);
      yPos += lineHeight * 1.5;

      doc.setFontSize(10);
      
      // Recomendações gerais
      if (mealPlan.recommendations.general) {
        doc.setTextColor(0, 0, 0);
        doc.text("Gerais:", 20, yPos);
        yPos += lineHeight;
        
        doc.setTextColor(50, 50, 50);
        const generalLines = doc.splitTextToSize(mealPlan.recommendations.general, 170);
        doc.text(generalLines, 25, yPos);
        yPos += lineHeight * (generalLines.length + 1);
      }
      
      // Recomendações pré-treino
      if (mealPlan.recommendations.preworkout) {
        doc.setTextColor(0, 0, 0);
        doc.text("Pré-treino:", 20, yPos);
        yPos += lineHeight;
        
        doc.setTextColor(50, 50, 50);
        const preworkoutLines = doc.splitTextToSize(mealPlan.recommendations.preworkout, 170);
        doc.text(preworkoutLines, 25, yPos);
        yPos += lineHeight * (preworkoutLines.length + 1);
      }
      
      // Recomendações pós-treino
      if (mealPlan.recommendations.postworkout) {
        doc.setTextColor(0, 0, 0);
        doc.text("Pós-treino:", 20, yPos);
        yPos += lineHeight;
        
        doc.setTextColor(50, 50, 50);
        const postworkoutLines = doc.splitTextToSize(mealPlan.recommendations.postworkout, 170);
        doc.text(postworkoutLines, 25, yPos);
        yPos += lineHeight * (postworkoutLines.length + 1);
      }
      
      // Recomendações de timing
      if (mealPlan.recommendations.timing) {
        doc.setTextColor(0, 0, 0);
        doc.text("Horários das refeições:", 20, yPos);
        yPos += lineHeight;
        
        doc.setTextColor(50, 50, 50);
        if (Array.isArray(mealPlan.recommendations.timing)) {
          for (const tip of mealPlan.recommendations.timing) {
            doc.text(`• ${tip}`, 25, yPos);
            yPos += lineHeight;
          }
        } else {
          const timingLines = doc.splitTextToSize(mealPlan.recommendations.timing, 170);
          doc.text(timingLines, 25, yPos);
          yPos += lineHeight * timingLines.length;
        }
      }
    }

    // Rodapé
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Página ${i} de ${pageCount}`, 105, 285, { align: 'center' });
    }

    // Salvar o PDF
    const fileName = `plano_alimentar_${format(new Date(), 'dd_MM_yyyy')}.pdf`;
    doc.save(fileName);
    toast.success("PDF do plano alimentar gerado com sucesso!");

  } catch (error) {
    console.error("Erro ao gerar PDF:", error);
    toast.error("Erro ao gerar PDF do plano alimentar.");
  }
};
