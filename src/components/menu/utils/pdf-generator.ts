
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
      width: element.offsetWidth,
      height: element.offsetHeight,
      windowWidth: element.offsetWidth,
      windowHeight: element.offsetHeight,
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
    const imgWidth = pageWidth - 20; // Margem de 10mm em cada lado
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    // Posição inicial (10mm das bordas)
    let position = 10;
    let page = 1;

    // Adiciona a imagem na primeira página
    pdf.addImage(
      canvas.toDataURL('image/jpeg', 1.0),
      'JPEG',
      10,
      position,
      imgWidth,
      imgHeight,
      undefined,
      'FAST'
    );

    // Se o conteúdo ultrapassar a altura da página, adiciona novas páginas
    while (position + imgHeight > pageHeight) {
      pdf.addPage();
      position = position - pageHeight;
      pdf.addImage(
        canvas.toDataURL('image/jpeg', 1.0),
        'JPEG',
        10,
        position,
        imgWidth,
        imgHeight,
        undefined,
        'FAST'
      );
      page++;
    }

    // Salva o PDF
    pdf.save('plano-alimentar.pdf');
    toast.success("PDF gerado com sucesso!");

  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    toast.error("Erro ao gerar PDF do plano alimentar");
  }
};
