
import { WorkoutHistory } from "../types/workout-plan";
import { jsPDF } from "jspdf";

export const generateWorkoutPDF = (plan: WorkoutHistory) => {
  const doc = new jsPDF();
  
  // Configuração do documento
  doc.setFont("helvetica");
  doc.setFontSize(16);
  
  // Título
  doc.text("Plano de Treino", 20, 20);
  
  // Datas
  doc.setFontSize(12);
  doc.text(`Período: ${new Date(plan.start_date).toLocaleDateString()} até ${new Date(plan.end_date).toLocaleDateString()}`, 20, 30);
  
  let yPos = 40;
  
  // Para cada sessão de treino
  plan.workout_sessions?.forEach((session) => {
    // Título da sessão
    doc.setFontSize(14);
    doc.text(`Dia ${session.day_number}`, 20, yPos);
    yPos += 10;
    
    // Aquecimento
    doc.setFontSize(12);
    doc.text("Aquecimento:", 20, yPos);
    yPos += 7;
    doc.setFontSize(10);
    const warmupLines = doc.splitTextToSize(session.warmup_description, 170);
    doc.text(warmupLines, 20, yPos);
    yPos += warmupLines.length * 7;
    
    // Exercícios
    doc.setFontSize(12);
    doc.text("Exercícios:", 20, yPos);
    yPos += 10;
    
    session.exercises.forEach((exercise) => {
      doc.setFontSize(10);
      doc.text(`• ${exercise.name}`, 25, yPos);
      yPos += 5;
      doc.text(`  ${exercise.sets} séries x ${exercise.reps} repetições`, 25, yPos);
      yPos += 5;
      doc.text(`  Descanso: ${exercise.rest_time_seconds} segundos`, 25, yPos);
      yPos += 10;
    });
    
    // Volta à calma
    doc.setFontSize(12);
    doc.text("Volta à calma:", 20, yPos);
    yPos += 7;
    doc.setFontSize(10);
    const cooldownLines = doc.splitTextToSize(session.cooldown_description, 170);
    doc.text(cooldownLines, 20, yPos);
    yPos += cooldownLines.length * 7 + 10;
    
    // Nova página se necessário
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }
  });
  
  // Salvar o PDF
  doc.save(`plano-treino-${new Date().toISOString().split('T')[0]}.pdf`);
};
