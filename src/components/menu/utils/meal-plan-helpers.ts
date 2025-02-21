
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

const renderDayPlan = (dayName: string, dayPlan: any) => `
  <div class="mb-8">
    <h2 class="text-2xl font-bold mb-4 text-green-700 border-b pb-2">${dayName}</h2>
    ${Object.entries(dayPlan.dailyPlan).map(([meal, data]: [string, any]) => `
      <div class="mb-6 bg-white rounded-lg shadow-sm p-6">
        <h3 class="text-xl font-semibold mb-2">${formatMealTitle(meal)}</h3>
        <div class="space-y-2">
          ${data.foods.map((food: any) => `
            <div class="ml-4">
              <div class="flex items-baseline gap-1">
                <span class="font-medium">${food.portion} ${food.unit}</span>
                <span class="text-gray-600">de</span>
                <span>${food.name.replace(/carboidrato/gi, "carbo")}</span>
              </div>
              ${food.details ? `<p class="text-sm text-gray-500 ml-4 mt-1">${food.details.replace(/carboidrato/gi, "carbo")}</p>` : ''}
            </div>
          `).join('')}
        </div>
        <div class="mt-4 text-sm text-gray-600 border-t pt-4">
          <p>Calorias: ${data.calories} kcal</p>
        </div>
      </div>
    `).join('')}
  </div>
`;

export const createPDFContent = (plan: any) => {
  const tempDiv = document.createElement('div');
  tempDiv.className = 'pdf-content p-8';
  
  const weekDays = {
    monday: "Segunda-feira",
    tuesday: "Terça-feira",
    wednesday: "Quarta-feira",
    thursday: "Quinta-feira",
    friday: "Sexta-feira",
    saturday: "Sábado",
    sunday: "Domingo"
  };
  
  tempDiv.innerHTML = `
    <div class="space-y-6">
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold mb-2">Plano Alimentar Semanal</h1>
        <p class="text-gray-600">Data: ${new Date(plan.created_at).toLocaleDateString()}</p>
        <p class="text-gray-600">Meta Calórica: ${plan.calories} kcal</p>
      </div>

      ${Object.entries(weekDays).map(([day, dayName]) => 
        renderDayPlan(dayName, plan.plan_data[day])
      ).join('')}

      <div class="mt-8 bg-white rounded-lg shadow-sm p-6">
        <h2 class="text-xl font-semibold mb-2">Recomendações</h2>
        <div class="space-y-4">
          ${plan.plan_data.recommendations.general ? 
            `<div>
              <p class="font-medium">Gerais:</p>
              <p class="ml-4 text-gray-700">${plan.plan_data.recommendations.general.replace(/carboidrato/gi, "carbo")}</p>
            </div>` : ''}
          
          ${plan.plan_data.recommendations.preworkout ? 
            `<div>
              <p class="font-medium">Pré-treino:</p>
              <p class="ml-4 text-gray-700">${plan.plan_data.recommendations.preworkout.replace(/carboidrato/gi, "carbo")}</p>
            </div>` : ''}
          
          ${plan.plan_data.recommendations.postworkout ? 
            `<div>
              <p class="font-medium">Pós-treino:</p>
              <p class="ml-4 text-gray-700">${plan.plan_data.recommendations.postworkout.replace(/carboidrato/gi, "carbo")}</p>
            </div>` : ''}
        </div>
      </div>
    </div>
  `;

  return tempDiv;
};
