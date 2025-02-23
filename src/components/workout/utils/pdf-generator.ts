
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { toast } from "sonner";
import { WorkoutPlan } from "../types/workout-plan";

export const generateWorkoutPDF = async (plan: WorkoutPlan) => {
  try {
    const pdf = new jsPDF();
    let yOffset = 20;

    // Add title
    pdf.setFontSize(20);
    pdf.text('Plano de Treino Personalizado', 20, yOffset);
    yOffset += 20;

    // Add plan period
    pdf.setFontSize(12);
    pdf.text(`Período: ${new Date(plan.start_date).toLocaleDateString()} - ${new Date(plan.end_date).toLocaleDateString()}`, 20, yOffset);
    yOffset += 20;

    plan.workout_sessions.forEach((session) => {
      // Add day header
      pdf.setFontSize(16);
      pdf.text(`Dia ${session.day_number}`, 20, yOffset);
      yOffset += 10;

      // Add warmup
      pdf.setFontSize(12);
      pdf.text('Aquecimento:', 20, yOffset);
      yOffset += 7;
      pdf.setFontSize(10);
      const warmupLines = pdf.splitTextToSize(session.warmup_description, 170);
      pdf.text(warmupLines, 20, yOffset);
      yOffset += (warmupLines.length * 5) + 10;

      // Add exercises
      pdf.setFontSize(12);
      pdf.text('Exercícios:', 20, yOffset);
      yOffset += 10;

      session.session_exercises.forEach((exerciseSession) => {
        pdf.setFontSize(10);
        pdf.text(`• ${exerciseSession.exercise.name}`, 25, yOffset);
        pdf.text(`  ${exerciseSession.sets} séries x ${exerciseSession.reps} repetições (${exerciseSession.rest_time_seconds}s descanso)`, 25, yOffset + 5);
        yOffset += 15;
      });

      // Add cooldown
      pdf.setFontSize(12);
      pdf.text('Volta à calma:', 20, yOffset);
      yOffset += 7;
      pdf.setFontSize(10);
      const cooldownLines = pdf.splitTextToSize(session.cooldown_description, 170);
      pdf.text(cooldownLines, 20, yOffset);
      yOffset += (cooldownLines.length * 5) + 20;

      // Add new page if needed
      if (yOffset > 250) {
        pdf.addPage();
        yOffset = 20;
      }
    });

    pdf.save('plano-de-treino.pdf');
    toast.success("PDF gerado com sucesso!");
  } catch (error) {
    console.error("Erro ao gerar PDF:", error);
    toast.error("Erro ao gerar PDF");
  }
};
