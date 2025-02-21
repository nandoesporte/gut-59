
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
  
  tempDiv.innerHTML = `
    <div class="space-y-6">
      <div class="text-center">
        <h1 class="text-2xl font-bold mb-2">Plano Alimentar</h1>
        <p class="text-gray-600">Data: ${new Date(plan.created_at).toLocaleDateString()}</p>
        <p class="text-gray-600">Meta Calórica: ${plan.calories} kcal</p>
      </div>

      ${Object.entries(plan.plan_data.dailyPlan).map(([meal, data]: [string, any]) => `
        <div class="mb-6">
          <h2 class="text-xl font-semibold mb-2">${formatMealTitle(meal)}</h2>
          <div class="space-y-2">
            ${data.foods.map((food: any) => `
              <div class="ml-4">
                <p>• ${food.name.replace(/carboidrato/gi, "carbo")} - ${food.portion} ${food.unit}</p>
                ${food.details ? `<p class="text-sm text-gray-600 ml-4">${food.details.replace(/carboidrato/gi, "carbo")}</p>` : ''}
              </div>
            `).join('')}
          </div>
          <div class="mt-2 text-sm text-gray-600">
            <p>Calorias: ${data.calories} kcal</p>
          </div>
        </div>
      `).join('')}

      <div class="mt-8">
        <h2 class="text-xl font-semibold mb-2">Recomendações</h2>
        <div class="space-y-2">
          ${plan.plan_data.recommendations.general ? 
            `<p class="font-medium">Gerais:</p>
            <p class="ml-4">${plan.plan_data.recommendations.general.replace(/carboidrato/gi, "carbo")}</p>` : ''}
          
          ${plan.plan_data.recommendations.preworkout ? 
            `<p class="font-medium">Pré-treino:</p>
            <p class="ml-4">${plan.plan_data.recommendations.preworkout.replace(/carboidrato/gi, "carbo")}</p>` : ''}
          
          ${plan.plan_data.recommendations.postworkout ? 
            `<p class="font-medium">Pós-treino:</p>
            <p class="ml-4">${plan.plan_data.recommendations.postworkout.replace(/carboidrato/gi, "carbo")}</p>` : ''}
        </div>
      </div>
    </div>
  `;

  return tempDiv;
};
