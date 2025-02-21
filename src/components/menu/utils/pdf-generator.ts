
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { toast } from "sonner";

export const generateMealPlanPDF = async (element: HTMLDivElement) => {
  if (!element) {
    toast.error("Erro ao gerar PDF: elemento não encontrado");
    return;
  }

  try {
    // Clone o elemento para poder modificá-lo sem afetar a UI
    const clonedElement = element.cloneNode(true) as HTMLDivElement;
    const container = document.createElement('div');
    container.appendChild(clonedElement);
    
    // Aplica estilos específicos para o PDF
    container.style.width = '595px'; // Largura do A4 em pixels
    container.style.padding = '40px';
    container.style.backgroundColor = '#ffffff';
    container.style.color = '#000000';
    container.style.fontSize = '12px';
    
    // Ajusta os estilos do clone para melhor visualização no PDF
    const styles = `
      .pdf-content {
        font-family: Arial, sans-serif;
        line-height: 1.5;
        color: #000;
      }
      .pdf-content h1, .pdf-content h2, .pdf-content h3 {
        margin: 10px 0;
        color: #000;
      }
      .pdf-content p {
        margin: 5px 0;
        color: #000;
      }
    `;
    
    const styleElement = document.createElement('style');
    styleElement.textContent = styles;
    container.appendChild(styleElement);
    
    // Adiciona classe para estilização
    clonedElement.classList.add('pdf-content');
    
    // Configurações do html2canvas para melhor qualidade
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 595, // Largura do A4
    });

    // Configura o PDF no formato A4
    const imgData = canvas.toDataURL('image/jpeg', 1.0);
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4'
    });

    // Dimensões do A4 em pontos
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    
    // Calcula as dimensões mantendo a proporção
    const ratio = pageWidth / canvas.width;
    const imgWidth = pageWidth;
    const imgHeight = canvas.height * ratio;

    // Adiciona a imagem ao PDF
    let heightLeft = imgHeight;
    let position = 0;
    let page = 1;

    // Primeira página
    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    // Adiciona páginas adicionais se necessário
    while (heightLeft >= 0) {
      pdf.addPage();
      position = -(page * pageHeight);
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      page++;
    }

    // Salva o PDF
    pdf.save('plano-alimentar.pdf');
    
    // Remove o elemento temporário
    container.remove();

  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    toast.error("Erro ao gerar PDF do plano alimentar");
  }
};
