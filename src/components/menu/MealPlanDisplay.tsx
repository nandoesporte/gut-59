import { Button } from "@/components/ui/button";
import { Coffee, Utensils, Apple, Moon, Dumbbell, Plus, FileDown } from "lucide-react";
import { MealPlan, ProtocolFood } from "./types";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface MealSectionProps {
  title: string;
  icon: React.ReactNode;
  foods: ProtocolFood[];
  description?: string;
  macros?: {
    protein: number;
    carbs: number;
    fats: number;
    fiber: number;
  };
  calories?: number;
}

const MealSection = ({ title, icon, foods, description, macros, calories }: MealSectionProps) => {
  const formatDescription = (description: string) => {
    return description.split('\n').map((line, index) => (
      <p key={index} className="text-sm text-gray-600 mb-1">
        {line}
      </p>
    ));
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        {icon}
        {title}
      </h2>
      <div className="mt-4 grid grid-cols-3 gap-3">
        {Array.isArray(foods) && foods.map((food) => (
          <Button
            key={food.id}
            variant="outline"
            className="flex items-center justify-center p-2 h-auto text-sm"
          >
            {food.name} ({food.portion}{food.portionUnit})
          </Button>
        ))}
      </div>
      {description && (
        <div className="mt-4 text-gray-600 border-t border-gray-100 pt-4">
          {formatDescription(description)}
        </div>
      )}
      {macros && calories && (
        <div className="mt-4 text-sm text-gray-600 border-t pt-4">
          <p className="font-medium">{calories} kcal</p>
          <div className="grid grid-cols-4 gap-2 mt-2">
            <div>P: {macros.protein}g</div>
            <div>C: {macros.carbs}g</div>
            <div>G: {macros.fats}g</div>
            <div>F: {macros.fiber}g</div>
          </div>
        </div>
      )}
    </div>
  );
};

interface MealPlanDisplayProps {
  mealPlan: MealPlan;
  onReset: () => void;
}

export const MealPlanDisplay = ({ mealPlan, onReset }: MealPlanDisplayProps) => {
  const handleDownloadPDF = async () => {
    try {
      const element = document.getElementById('meal-plan-content');
      if (!element) return;

      const canvas = await html2canvas(element, {
        scale: 2,
        logging: false,
        useCORS: true
      });

      const imgWidth = 190;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/png');

      // Adicionar cabeçalho
      pdf.setFontSize(20);
      pdf.setTextColor(40, 167, 69); // cor verde
      pdf.text('Seu Plano Alimentar', 105, 15, { align: 'center' });
      
      // Adicionar data
      pdf.setFontSize(12);
      pdf.setTextColor(100);
      pdf.text(new Date().toLocaleDateString('pt-BR'), 105, 22, { align: 'center' });

      // Adicionar imagem do cardápio
      pdf.addImage(imgData, 'PNG', 10, 30, imgWidth, imgHeight);

      // Adicionar rodapé
      pdf.setFontSize(10);
      pdf.setTextColor(100);
      pdf.text('Gerado automaticamente pelo sistema', 105, 287, { align: 'center' });

      pdf.save('plano-alimentar.pdf');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
    }
  };

  if (!mealPlan?.dailyPlan) {
    return (
      <div className="text-center p-6">
        <p className="text-gray-600">Erro ao carregar o cardápio. Por favor, tente novamente.</p>
        <Button 
          onClick={onReset}
          className="mt-4 bg-green-500 hover:bg-green-600 text-white"
        >
          COMEÇAR NOVA DIETA
        </Button>
      </div>
    );
  }

  const getMealDescription = (meal: string, foods: ProtocolFood[], calories: number, timing?: string) => {
    let description = `${
      meal === "breakfast" ? "Café da Manhã" :
      meal === "morningSnack" ? "Lanche da Manhã" :
      meal === "lunch" ? "Almoço" :
      meal === "afternoonSnack" ? "Lanche da Tarde" :
      "Jantar"
    } (${calories} kcal):\n\n`;

    // Primeiro, lista os alimentos com suas porções e calorias
    foods.forEach(food => {
      const foodCalories = Math.round((food.calories / 100) * food.portion!);
      description += `- ${food.portion}${food.portionUnit} de ${food.name} (${foodCalories} kcal)\n`;
    });

    // Adiciona explicação nutricional específica para cada refeição
    description += "\nBenefícios nutricionais:\n";
    
    switch (meal) {
      case "breakfast":
        description += "Esta combinação de alimentos foi escolhida para:\n";
        description += "• Fornecer energia sustentada durante a manhã\n";
        description += "• Equilibrar os níveis de glicose no sangue\n";
        description += "• Garantir proteínas de alta qualidade para saciedade\n";
        description += "• Oferecer fibras para saúde digestiva\n\n";
        
        description += "Modo de preparo e consumo:\n";
        description += "• Prepare os alimentos frescos na hora\n";
        description += "• Mastigue bem cada porção\n";
        description += "• Evite distrações durante a refeição\n";
        
        if (timing?.includes("manhã")) {
          description += "\nOrientação para treino:\n";
          description += "• Consuma 1-2 horas antes do treino\n";
          description += "• Priorize a hidratação com água\n";
        }
        break;

      case "morningSnack":
        description += "Este lanche foi planejado para:\n";
        description += "• Manter níveis estáveis de energia\n";
        description += "• Fornecer nutrientes essenciais\n";
        description += "• Evitar picos de fome antes do almoço\n\n";
        
        description += "Dicas de consumo:\n";
        description += "• Combine os alimentos sugeridos\n";
        description += "• Mantenha o horário regular\n";
        description += "• Hidrate-se entre as refeições\n";
        break;

      case "lunch":
        description += "Refeição principal desenvolvida para:\n";
        description += "• Fornecer proteínas completas\n";
        description += "• Garantir carboidratos complexos\n";
        description += "• Incluir gorduras boas\n";
        description += "• Oferecer vitaminas e minerais essenciais\n\n";
        
        description += "Recomendações de consumo:\n";
        description += "• Inicie pelos vegetais\n";
        description += "• Faça uma pausa entre as porções\n";
        description += "• Reserve 20-30 minutos para a refeição\n";
        
        if (timing?.includes("tarde")) {
          description += "\nAdaptação para treino:\n";
          description += "• Faça esta refeição 2-3 horas antes do treino\n";
          description += "• Garanta boa digestão antes da atividade\n";
        }
        break;

      case "afternoonSnack":
        description += "Lanche estratégico para:\n";
        description += "• Manter o metabolismo ativo\n";
        description += "• Controlar a fome antes do jantar\n";
        description += "• Fornecer energia equilibrada\n\n";
        
        description += "Como consumir:\n";
        description += "• Respeite as porções indicadas\n";
        description += "• Mantenha o intervalo entre refeições\n";
        description += "• Combine com hidratação adequada\n";
        break;

      case "dinner":
        description += "Última refeição formulada para:\n";
        description += "• Promover boa recuperação noturna\n";
        description += "• Manter saciedade adequada\n";
        description += "• Fornecer nutrientes para recuperação\n\n";
        
        description += "Orientações importantes:\n";
        description += "• Consuma 2-3 horas antes de dormir\n";
        description += "• Opte por preparações leves\n";
        description += "• Evite excesso de gorduras\n";
        
        if (timing?.includes("noite")) {
          description += "\nPós-treino:\n";
          description += "• Priorize a reposição de nutrientes\n";
          description += "• Aumente a hidratação\n";
          description += "• Inclua proteínas de rápida absorção\n";
        }
        break;
    }

    // Adiciona considerações específicas de saúde se houver condições especiais
    const healthCondition = mealPlan.recommendations?.healthCondition;
    if (healthCondition) {
      description += "\nConsiderações especiais de saúde:\n";
      switch (healthCondition) {
        case "hipertensao":
          description += "• Preparações com baixo teor de sódio\n";
          description += "• Alimentos ricos em potássio e magnésio\n";
          break;
        case "diabetes":
          description += "• Combinação adequada para controle glicêmico\n";
          description += "• Fibras para liberação gradual de açúcar\n";
          break;
        case "depressao_ansiedade":
          description += "• Alimentos ricos em triptofano e ômega-3\n";
          description += "• Combinações que favorecem a produção de serotonina\n";
          break;
      }
    }

    return description;
  };

  return (
    <>
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Seu Plano Alimentar Personalizado</h1>
        <Button
          onClick={handleDownloadPDF}
          variant="outline"
          className="flex items-center gap-2"
        >
          <FileDown className="h-4 w-4" />
          Baixar PDF
        </Button>
      </div>

      <div id="meal-plan-content" className="space-y-6">
        <MealSection
          title="Café da manhã"
          icon={<Coffee className="h-5 w-5" />}
          foods={mealPlan.dailyPlan.breakfast.foods}
          description={getMealDescription(
            "breakfast",
            mealPlan.dailyPlan.breakfast.foods,
            mealPlan.dailyPlan.breakfast.calories,
            mealPlan.recommendations?.timing?.join(" ")
          )}
          macros={mealPlan.dailyPlan.breakfast.macros}
          calories={mealPlan.dailyPlan.breakfast.calories}
        />

        <MealSection
          title="Lanche da Manhã"
          icon={<Apple className="h-5 w-5" />}
          foods={mealPlan.dailyPlan.morningSnack.foods}
          description={getMealDescription(
            "morningSnack",
            mealPlan.dailyPlan.morningSnack.foods,
            mealPlan.dailyPlan.morningSnack.calories,
            mealPlan.recommendations?.timing?.join(" ")
          )}
          macros={mealPlan.dailyPlan.morningSnack.macros}
          calories={mealPlan.dailyPlan.morningSnack.calories}
        />

        <MealSection
          title="Almoço"
          icon={<Utensils className="h-5 w-5" />}
          foods={mealPlan.dailyPlan.lunch.foods}
          description={getMealDescription(
            "lunch",
            mealPlan.dailyPlan.lunch.foods,
            mealPlan.dailyPlan.lunch.calories,
            mealPlan.recommendations?.timing?.join(" ")
          )}
          macros={mealPlan.dailyPlan.lunch.macros}
          calories={mealPlan.dailyPlan.lunch.calories}
        />

        <MealSection
          title="Lanche da Tarde"
          icon={<Apple className="h-5 w-5" />}
          foods={mealPlan.dailyPlan.afternoonSnack.foods}
          description={getMealDescription(
            "afternoonSnack",
            mealPlan.dailyPlan.afternoonSnack.foods,
            mealPlan.dailyPlan.afternoonSnack.calories,
            mealPlan.recommendations?.timing?.join(" ")
          )}
          macros={mealPlan.dailyPlan.afternoonSnack.macros}
          calories={mealPlan.dailyPlan.afternoonSnack.calories}
        />

        <MealSection
          title="Jantar"
          icon={<Moon className="h-5 w-5" />}
          foods={mealPlan.dailyPlan.dinner.foods}
          description={getMealDescription(
            "dinner",
            mealPlan.dailyPlan.dinner.foods,
            mealPlan.dailyPlan.dinner.calories,
            mealPlan.recommendations?.timing?.join(" ")
          )}
          macros={mealPlan.dailyPlan.dinner.macros}
          calories={mealPlan.dailyPlan.dinner.calories}
        />

        {mealPlan.recommendations && (
          <>
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Dumbbell className="h-5 w-5" />
                Recomendações de Treino
              </h2>
              <div className="mt-4 space-y-4">
                {mealPlan.recommendations.preworkout && (
                  <div>
                    <h4 className="font-medium mb-2">Pré-treino:</h4>
                    <p className="text-gray-600">{mealPlan.recommendations.preworkout}</p>
                  </div>
                )}
                {mealPlan.recommendations.postworkout && (
                  <div>
                    <h4 className="font-medium mb-2">Pós-treino:</h4>
                    <p className="text-gray-600">{mealPlan.recommendations.postworkout}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Recomendações Gerais
              </h2>
              <div className="mt-4">
                <p className="text-gray-600">{mealPlan.recommendations.general}</p>
                {Array.isArray(mealPlan.recommendations.timing) && (
                  <div className="mt-4 space-y-2">
                    {mealPlan.recommendations.timing.map((tip, index) => (
                      <p key={index} className="text-gray-600">• {tip}</p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        <div className="py-6 border-t mt-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-lg">Total Diário</h3>
              <div className="grid grid-cols-4 gap-4 mt-2 text-sm text-gray-600">
                <div>Proteína: {mealPlan.totalNutrition.protein}g</div>
                <div>Carboidratos: {mealPlan.totalNutrition.carbs}g</div>
                <div>Gorduras: {mealPlan.totalNutrition.fats}g</div>
                <div>Fibras: {mealPlan.totalNutrition.fiber}g</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-green-600">
                {mealPlan.totalNutrition.calories}
              </div>
              <div className="text-sm text-gray-600">kcal totais</div>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4">
        <div className="container mx-auto max-w-3xl">
          <Button 
            onClick={onReset}
            className="w-full bg-green-500 hover:bg-green-600 text-white"
          >
            COMEÇAR NOVA DIETA
          </Button>
        </div>
      </div>
    </>
  );
};
