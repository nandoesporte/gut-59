
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
  tempDiv.className = 'pdf-content';
  tempDiv.style.padding = '40px';
  tempDiv.style.maxWidth = '800px';
  tempDiv.style.margin = '0 auto';
  tempDiv.style.backgroundColor = 'white';
  tempDiv.style.fontFamily = 'system-ui, -apple-system, sans-serif';

  const planData = plan.plan_data;
  
  tempDiv.innerHTML = `
    <div style="max-width: 800px; margin: 0 auto;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="font-size: 28px; font-weight: bold; color: #111827; margin-bottom: 8px;">Plano Alimentar</h1>
        <p style="color: #6B7280; font-size: 16px;">Data: ${new Date(plan.created_at).toLocaleDateString()}</p>
        <p style="color: #6B7280; font-size: 16px;">Meta Calórica: ${plan.calories} kcal</p>
      </div>

      ${Object.entries(planData.dailyPlan).map(([meal, data]: [string, any]) => `
        <div style="margin-bottom: 24px; padding: 24px; border: 1px solid #E5E7EB; border-radius: 8px;">
          <h3 style="font-size: 20px; font-weight: 600; color: #111827; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid #E5E7EB;">
            ${formatMealTitle(meal)}
          </h3>
          
          <div style="margin-bottom: 16px;">
            ${data.foods.map((food: any) => `
              <div style="margin: 8px 0; padding-left: 16px;">
                <div style="display: flex; align-items: baseline; gap: 4px;">
                  <span style="font-weight: 500;">${food.portion} ${food.unit}</span>
                  <span style="color: #6B7280;">de</span>
                  <span>${food.name}</span>
                </div>
                ${food.details ? `<p style="color: #6B7280; font-size: 14px; margin-left: 16px; margin-top: 4px;">${food.details}</p>` : ''}
              </div>
            `).join('')}
          </div>

          <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #E5E7EB; font-size: 14px; color: #6B7280;">
            <p>Calorias: ${data.calories} kcal</p>
            <p>Proteínas: ${data.macros.protein}g | Carboidratos: ${data.macros.carbs}g | Gorduras: ${data.macros.fats}g</p>
          </div>
        </div>
      `).join('')}

      <div style="margin-top: 32px;">
        <h2 style="font-size: 20px; font-weight: 600; color: #111827; margin-bottom: 16px;">Totais Diários</h2>
        <div style="padding: 24px; border: 1px solid #E5E7EB; border-radius: 8px;">
          <p style="margin: 4px 0;">Calorias Totais: ${planData.totalNutrition.calories} kcal</p>
          <p style="margin: 4px 0;">Proteínas Totais: ${planData.totalNutrition.protein}g</p>
          <p style="margin: 4px 0;">Carboidratos Totais: ${planData.totalNutrition.carbs}g</p>
          <p style="margin: 4px 0;">Gorduras Totais: ${planData.totalNutrition.fats}g</p>
        </div>
      </div>

      <div style="margin-top: 32px;">
        <h2 style="font-size: 20px; font-weight: 600; color: #111827; margin-bottom: 16px;">Recomendações</h2>
        <div style="padding: 24px; border: 1px solid #E5E7EB; border-radius: 8px;">
          <div style="margin-bottom: 16px;">
            <p style="font-weight: 500; margin-bottom: 4px;">Gerais:</p>
            <p style="color: #374151; padding-left: 16px;">${planData.recommendations.general}</p>
          </div>
          
          <div style="margin-bottom: 16px;">
            <p style="font-weight: 500; margin-bottom: 4px;">Pré-treino:</p>
            <p style="color: #374151; padding-left: 16px;">${planData.recommendations.preworkout}</p>
          </div>
          
          <div>
            <p style="font-weight: 500; margin-bottom: 4px;">Pós-treino:</p>
            <p style="color: #374151; padding-left: 16px;">${planData.recommendations.postworkout}</p>
          </div>
        </div>
      </div>
    </div>
  `;

  return tempDiv;
};
