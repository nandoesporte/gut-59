
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { toast } from "sonner";

export const generateMealPlanPDF = async (element: HTMLDivElement) => {
  if (!element) {
    toast.error("Erro ao gerar PDF: elemento não encontrado");
    return;
  }

  try {
    // Configurações do html2canvas para melhor qualidade
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    // Configura o PDF no formato A4
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Dimensões do A4 em mm
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Calcula as dimensões mantendo a proporção
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * pageWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;
    let page = 1;

    // Primeira página
    pdf.addImage(canvas.toDataURL('image/png', 1.0), 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    // Adiciona páginas adicionais se necessário
    while (heightLeft >= 0) {
      pdf.addPage();
      position = -(page * pageHeight);
      pdf.addImage(canvas.toDataURL('image/png', 1.0), 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      page++;
    }

    // Salva o PDF
    pdf.save('plano-alimentar.pdf');

  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    toast.error("Erro ao gerar PDF do plano alimentar");
  }
};
