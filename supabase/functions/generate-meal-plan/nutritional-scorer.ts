
interface NutrientProfile {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
}

export function scoreNutritionalProfile(nutrients: NutrientProfile): number {
  // Scoring is based on a scale of 0-100
  // We'll evaluate several aspects of the nutritional profile
  
  // 1. Protein adequacy (score 0-30)
  // Assuming minimum of 1.6g/kg for active person and a 70kg reference weight = 112g minimum
  // We'll give max score at 140g protein (2g/kg)
  const proteinScore = Math.min(30, (nutrients.protein / 140) * 30);
  
  // 2. Carb to protein ratio (score 0-20)
  // Ideal ratio depends on goals, but for general health/performance around 2:1 carbs:protein
  const carbProteinRatio = nutrients.carbs / nutrients.protein;
  // Score highest when ratio is between 1.5 and 2.5
  const ratioScore = 
    carbProteinRatio < 1 ? 10 * carbProteinRatio : 
    carbProteinRatio > 3 ? Math.max(0, 20 - (carbProteinRatio - 3) * 5) :
    20 - Math.abs(2 - carbProteinRatio) * 5;
  
  // 3. Fiber adequacy (score 0-20)
  // Minimum 25g recommendation, optimal at 35g
  const fiberScore = Math.min(20, (nutrients.fiber / 35) * 20);
  
  // 4. Healthy fat content (score 0-20)
  // Assuming 25-35% of calories should come from fat
  // For a 2000 calorie diet, that's about 56-78g fat
  const idealFatMin = nutrients.calories * 0.25 / 9;
  const idealFatMax = nutrients.calories * 0.35 / 9;
  
  const fatScore = 
    nutrients.fats < idealFatMin ? 20 * (nutrients.fats / idealFatMin) :
    nutrients.fats > idealFatMax ? 20 * (1 - Math.min(1, (nutrients.fats - idealFatMax) / idealFatMax)) :
    20;
  
  // 5. Caloric appropriateness (score 0-10)
  // This would depend on the person's goals, but we'll use a generic approach
  // Assuming target is within 10% of recommended
  const caloricScore = 10; // Simplified for now
  
  // Calculate total score
  const totalScore = proteinScore + ratioScore + fiberScore + fatScore + caloricScore;
  
  return Math.round(totalScore);
}
