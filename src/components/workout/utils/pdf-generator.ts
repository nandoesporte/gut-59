
import { WorkoutPlan } from '../types/workout-plan';
import { jsPDF } from 'jspdf';
import { formatInTimeZone } from 'date-fns-tz';
import { toast } from 'sonner';

// Timezone configuration
const BRAZIL_TIMEZONE = "America/Sao_Paulo";

export const generateWorkoutPDF = async (plan: WorkoutPlan) => {
  try {
    // Criar novo documento PDF
    const doc = new jsPDF();
    let yPos = 20;
    const lineHeight = 10;

    // Adicionar título
    doc.setFontSize(20);
    doc.text('Plano de Treino', 105, yPos, { align: 'center' });
    yPos += lineHeight * 2;

    // Adicionar informações do plano
    doc.setFontSize(12);
    doc.text(`Objetivo: ${translateGoal(plan.goal)}`, 20, yPos);
    yPos += lineHeight;
    doc.text(`Período: ${formatInTimeZone(new Date(plan.start_date), BRAZIL_TIMEZONE, 'dd/MM/yyyy')} - ${formatInTimeZone(new Date(plan.end_date), BRAZIL_TIMEZONE, 'dd/MM/yyyy')}`, 20, yPos);
    yPos += lineHeight * 2;

    // Para cada sessão de treino
    if (plan.workout_sessions) {
      plan.workout_sessions.sort((a, b) => a.day_number - b.day_number);
      
      for (const session of plan.workout_sessions) {
        // Verificar se precisamos adicionar uma nova página
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }

        // Título da sessão
        doc.setFontSize(16);
        doc.text(`Dia ${session.day_number}`, 20, yPos);
        yPos += lineHeight;

        // Aquecimento
        if (session.warmup_description) {
          doc.setFontSize(12);
          doc.text('Aquecimento:', 20, yPos);
          yPos += lineHeight;
          doc.setFontSize(10);
          doc.text(session.warmup_description, 30, yPos);
          yPos += lineHeight;
        }

        // Exercícios
        if (session.session_exercises && session.session_exercises.length > 0) {
          doc.setFontSize(12);
          doc.text('Exercícios:', 20, yPos);
          yPos += lineHeight;

          for (const exerciseSession of session.session_exercises) {
            // Verificar se precisamos adicionar uma nova página
            if (yPos > 250) {
              doc.addPage();
              yPos = 20;
            }

            const exercise = exerciseSession.exercise;
            if (exercise) {
              doc.setFontSize(10);
              doc.text(`• ${exercise.name}`, 30, yPos);
              doc.text(`${exerciseSession.sets}x${exerciseSession.reps} - Descanso: ${exerciseSession.rest_time_seconds}s`, 150, yPos);
              yPos += lineHeight;
            }
          }
        }

        // Desaquecimento
        if (session.cooldown_description) {
          yPos += lineHeight;
          doc.setFontSize(12);
          doc.text('Desaquecimento:', 20, yPos);
          yPos += lineHeight;
          doc.setFontSize(10);
          doc.text(session.cooldown_description, 30, yPos);
          yPos += lineHeight * 1.5;
        }

        yPos += lineHeight; // Espaço extra entre sessões
      }
    }

    // Salvar o PDF
    const fileName = `plano_treino_${formatInTimeZone(new Date(), BRAZIL_TIMEZONE, 'dd_MM_yyyy')}.pdf`;
    doc.save(fileName);
    toast.success('PDF gerado com sucesso!');

  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    toast.error('Erro ao gerar PDF. Por favor, tente novamente.');
  }
};

// Função auxiliar para traduzir o objetivo
const translateGoal = (goal: string): string => {
  switch (goal) {
    case 'lose_weight':
      return 'Emagrecimento';
    case 'gain_mass':
      return 'Ganho de Massa';
    case 'maintain':
      return 'Manutenção';
    default:
      return goal;
  }
};
