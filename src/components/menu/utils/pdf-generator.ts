
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { toast } from "sonner";

export const generateMealPlanPDF = async (element: HTMLDivElement) => {
  if (!element) {
    toast.error("Erro ao gerar PDF: elemento não encontrado");
    return;
  }

  try {
    // Configurações melhoradas para qualidade do PDF em formato A4
    const canvas = await html2canvas(element, {
      scale: 2, // Aumenta a qualidade
      useCORS: true, // Permite carregar imagens de outros domínios
      logging: false,
      backgroundColor: "#ffffff",
    });

    // Dimensões do A4 em pontos (72 pontos = 1 polegada)
    const a4Width = 595.28; // 210mm em pontos
    const a4Height = 841.89; // 297mm em pontos

    // Cria o PDF em formato A4
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'pt', // Usa pontos como unidade
      format: 'a4'
    });

    // Calcula a proporção para ajustar a imagem à largura do A4
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = a4Width / imgWidth;
    
    // Calcula a altura proporcional
    const fitHeight = imgHeight * ratio;
    
    // Adiciona a imagem ao PDF
    pdf.addImage(
      canvas.toDataURL('image/jpeg', 1.0),
      'JPEG',
      0, // x = 0 para alinhar à esquerda
      0, // y = 0 para começar no topo
      a4Width, // largura ajustada ao A4
      fitHeight, // altura proporcional
      undefined,
      'FAST'
    );

    // Se o conteúdo for maior que uma página A4, adiciona mais páginas
    if (fitHeight > a4Height) {
      const totalPages = Math.ceil(fitHeight / a4Height);
      for (let page = 1; page < totalPages; page++) {
        pdf.addPage();
        pdf.addImage(
          canvas.toDataURL('image/jpeg', 1.0),
          'JPEG',
          0,
          -(page * a4Height), // Move o conteúdo para cima
          a4Width,
          fitHeight,
          undefined,
          'FAST'
        );
      }
    }
    
    pdf.save('plano-alimentar.pdf');

  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    throw error;
  }
};
