
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { toast } from "sonner";

export const generateMealPlanPDF = async (element: HTMLDivElement) => {
  if (!element) return;

  try {
    toast.loading("Gerando PDF do seu plano alimentar...");

    // Configurações melhoradas para qualidade do PDF
    const canvas = await html2canvas(element, {
      scale: 2, // Aumenta a qualidade
      useCORS: true, // Permite carregar imagens de outros domínios
      logging: false,
      backgroundColor: "#ffffff",
      windowWidth: 1200, // Largura fixa para melhor formatação
      onclone: (document) => {
        // Ajusta estilos específicos para o PDF
        const element = document.body;
        const styles = `
          .text-primary-500 { color: #10B981 !important; }
          .text-primary-600 { color: #059669 !important; }
          .bg-primary-50 { background-color: #ECFDF5 !important; }
          .border-primary-100 { border-color: #D1FAE5 !important; }
        `;
        const styleElement = document.createElement('style');
        styleElement.innerHTML = styles;
        element.appendChild(styleElement);
      }
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
    
    pdf.save('plano-alimentar.pdf');
    toast.dismiss();
    toast.success("PDF do plano alimentar baixado com sucesso!");
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    toast.dismiss();
    toast.error("Erro ao gerar PDF do plano alimentar");
  }
};
