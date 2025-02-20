
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { toast } from "sonner";

export const generateMealPlanPDF = async (element: HTMLDivElement) => {
  if (!element) {
    toast.error("Erro ao gerar PDF: elemento não encontrado");
    return;
  }

  try {
    // Configurações melhoradas para qualidade do PDF
    const canvas = await html2canvas(element, {
      scale: 2, // Aumenta a qualidade
      useCORS: true, // Permite carregar imagens de outros domínios
      logging: false,
      backgroundColor: "#ffffff",
      windowWidth: element.scrollWidth, // Usa a largura real do elemento
      onclone: (document) => {
        // Ajusta estilos específicos para o PDF
        const styles = `
          * { font-family: Arial, sans-serif !important; }
          .text-primary-500 { color: #10B981 !important; }
          .text-primary-600 { color: #059669 !important; }
          .bg-primary-50 { background-color: #ECFDF5 !important; }
          .border-primary-100 { border-color: #D1FAE5 !important; }
        `;
        const styleElement = document.createElement('style');
        styleElement.innerHTML = styles;
        document.head.appendChild(styleElement);
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
    const imgY = 10; // Adiciona uma margem superior

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

  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    throw error;
  }
};
