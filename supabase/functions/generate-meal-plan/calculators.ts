
export function calculateHarrisBenedict(
  weight: number,
  height: number,
  age: number,
  gender: string,
  activityFactor: number
): number {
  let bmr;
  if (gender === 'male') {
    bmr = 66 + (13.7 * weight) + (5 * height) - (6.8 * age);
  } else {
    bmr = 655 + (9.6 * weight) + (1.8 * height) - (4.7 * age);
  }
  return Math.round(bmr * activityFactor);
}

export function calculateMifflinStJeor(
  weight: number,
  height: number,
  age: number,
  gender: string,
  activityFactor: number
): number {
  let bmr;
  if (gender === 'male') {
    bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5;
  } else {
    bmr = (10 * weight) + (6.25 * height) - (5 * age) - 161;
  }
  return Math.round(bmr * activityFactor);
}

export function calculateMacroDistribution(calories: number, goal: string, activityLevel: string) {
  let protein, carbs, fats;

  // Base protein em g/kg de peso corporal
  const proteinPerKg = {
    lose: 2.2, // Maior proteína para preservar massa magra
    maintain: 1.8,
    gain: 2.0 // Alto para suportar ganho muscular
  };

  // Ajuste baseado no nível de atividade
  const activityMultiplier = {
    sedentary: 0.8,
    lightlyActive: 0.9,
    moderatelyActive: 1.0,
    veryActive: 1.1,
    extremelyActive: 1.2
  };

  switch (goal) {
    case 'lose':
      protein = Math.round((calories * 0.35) / 4); // 35% proteína
      carbs = Math.round((calories * 0.40) / 4);   // 40% carboidratos
      fats = Math.round((calories * 0.25) / 9);    // 25% gorduras
      break;
    case 'gain':
      protein = Math.round((calories * 0.30) / 4); // 30% proteína
      carbs = Math.round((calories * 0.50) / 4);   // 50% carboidratos
      fats = Math.round((calories * 0.20) / 9);    // 20% gorduras
      break;
    default: // maintain
      protein = Math.round((calories * 0.30) / 4); // 30% proteína
      carbs = Math.round((calories * 0.45) / 4);   // 45% carboidratos
      fats = Math.round((calories * 0.25) / 9);    // 25% gorduras
  }

  // Ajuste final baseado no nível de atividade
  const multiplier = activityMultiplier[activityLevel as keyof typeof activityMultiplier] || 1;
  
  return {
    protein: Math.round(protein * multiplier),
    carbs: Math.round(carbs * multiplier),
    fats
  };
}

// Função para calcular as porções com base nas necessidades calóricas
export function calculatePortions(
  food: any,
  targetCalories: number,
  macroTargets: { protein: number; carbs: number; fats: number }
) {
  const baseServing = food.serving_size || 100; // gramas
  const caloriesPerServing = food.calories;
  
  // Calcular a porção ideal baseada nas calorias alvo
  let recommendedServing = (targetCalories / caloriesPerServing) * baseServing;
  
  // Ajustar porção com base nos macronutrientes
  const proteinAdjustment = (macroTargets.protein / food.protein) * baseServing;
  const carbsAdjustment = (macroTargets.carbs / food.carbs) * baseServing;
  
  // Usar a menor porção para não exceder nenhum macro
  recommendedServing = Math.min(recommendedServing, proteinAdjustment, carbsAdjustment);
  
  return Math.round(recommendedServing);
}
