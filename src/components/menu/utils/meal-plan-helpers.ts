
export const formatMealTitle = (meal: string): string => {
  const titles: Record<string, string> = {
    breakfast: "Café da Manhã",
    morningSnack: "Lanche da Manhã",
    lunch: "Almoço",
    afternoonSnack: "Lanche da Tarde",
    dinner: "Jantar"
  };
  return titles[meal] || meal;
};

export const createPDFContent = (plan: any) => {
  const tempDiv = document.createElement('div');
  tempDiv.className = 'pdf-content p-8';

  const planData = plan.plan_data;
  
  tempDiv.innerHTML = `
    <div class="space-y-6">
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold mb-2">Plano Alimentar</h1>
        <p class="text-gray-600">Data: ${new Date(plan.created_at).toLocaleDateString()}</p>
        <p class="text-gray-600">Meta Calórica: ${plan.calories} kcal</p>
      </div>

      <div class="space-y-6">
        ${Object.entries(planData.dailyPlan).map(([meal, data]: [string, any]) => `
          <div class="mb-6 bg-white rounded-lg shadow-sm p-6">
            <h3 class="text-xl font-semibold mb-2">${formatMealTitle(meal)}</h3>
            <div class="space-y-2">
              ${data.foods.map((food: any) => `
                <div class="ml-4">
                  <div class="flex items-baseline gap-1">
                    <span class="font-medium">${food.portion} ${food.unit}</span>
                    <span class="text-gray-600">de</span>
                    <span>${food.name}</span>
                  </div>
                  ${food.details ? `<p class="text-sm text-gray-500 ml-4 mt-1">${food.details}</p>` : ''}
                </div>
              `).join('')}
            </div>
            <div class="mt-4 text-sm text-gray-600 border-t pt-4">
              <p>Calorias: ${data.calories} kcal</p>
              <p>Proteínas: ${data.macros.protein}g | Carboidratos: ${data.macros.carbs}g | Gorduras: ${data.macros.fats}g</p>
            </div>
          </div>
        `).join('')}

        <div class="mt-8">
          <h2 class="text-xl font-semibold mb-4">Totais Diários</h2>
          <div class="bg-white rounded-lg shadow-sm p-6">
            <p>Calorias Totais: ${planData.totalNutrition.calories} kcal</p>
            <p>Proteínas Totais: ${planData.totalNutrition.protein}g</p>
            <p>Carboidratos Totais: ${planData.totalNutrition.carbs}g</p>
            <p>Gorduras Totais: ${planData.totalNutrition.fats}g</p>
          </div>
        </div>

        <div class="mt-8">
          <h2 class="text-xl font-semibold mb-4">Recomendações</h2>
          <div class="bg-white rounded-lg shadow-sm p-6 space-y-4">
            <div>
              <p class="font-medium">Gerais:</p>
              <p class="ml-4 text-gray-700">${planData.recommendations.general}</p>
            </div>
            
            <div>
              <p class="font-medium">Pré-treino:</p>
              <p class="ml-4 text-gray-700">${planData.recommendations.preworkout}</p>
            </div>
            
            <div>
              <p class="font-medium">Pós-treino:</p>
              <p class="ml-4 text-gray-700">${planData.recommendations.postworkout}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  return tempDiv;
};
