
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { toast } from "sonner";

export const generateWorkoutPDF = async (element: HTMLDivElement) => {
  if (!element) return;

  try {
    toast.loading("Gerando PDF do seu plano de treino...");

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff"
    });

    const imgData = canvas.toDataURL('image/jpeg', 1.0);
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
    const imgX = (pdfWidth - imgWidth * ratio) / 2;
    const imgY = 0;

    pdf.addImage(
      imgData, 
      'JPEG', 
      imgX, 
      imgY, 
      imgWidth * ratio, 
      imgHeight * ratio,
      undefined,
      'FAST'
    );
    
    pdf.save('plano-treino.pdf');
    toast.dismiss();
    toast.success("PDF do plano de treino baixado com sucesso!");
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    toast.dismiss();
    toast.error("Erro ao gerar PDF do plano de treino");
  }
};
