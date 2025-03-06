
import type { Food, MacroTargets, FoodWithPortion } from './types';
import { calculatePortionSize } from './portion-calculator';

interface MealGuideline {
  min_items: number;
  required_categories: string[];
}

interface MealRequirements {
  targetCalories: number;
  macroTargets: MacroTargets;
  mealGuidelines: Record<string, MealGuideline>;
}

function validateMealComposition(
  selectedFoods: FoodWithPortion[],
  mealType: string,
  guidelines: Record<string, MealGuideline>
): {
  isValid: boolean;
  missingCategories: string[];
} {
  const guideline = guidelines[mealType];
  if (!guideline) {
    return { isValid: true, missingCategories: [] };
  }

  const presentCategories = new Set<string>();
  selectedFoods.forEach(food => {
    if (food.nutritional_category) {
      food.nutritional_category.forEach(cat => presentCategories.add(cat));
    }
  });

  const missingCategories = guideline.required_categories.filter(
    category => !presentCategories.has(category)
  );

  return {
    isValid: missingCategories.length === 0 && selectedFoods.length >= guideline.min_items,
    missingCategories
  };
}

function calculateMealPortions(
  foods: Food[],
  targetCalories: number,
  macroTargets: MacroTargets,
  mealType: string
): FoodWithPortion[] {
  // Distribute calories based on food categories
  let proteinCalories = targetCalories * 0.3; // 30% for protein
  let carbsCalories = targetCalories * 0.45;  // 45% for carbs
  let fatsCalories = targetCalories * 0.25;   // 25% for fats

  const portionedFoods: FoodWithPortion[] = [];

  // Group foods by category
  const proteinFoods = foods.filter(f => f.nutritional_category?.includes('protein'));
  const carbsFoods = foods.filter(f => f.nutritional_category?.includes('carbs_complex'));
  const fatsFoods = foods.filter(f => f.nutritional_category?.includes('healthy_fats'));
  const veggies = foods.filter(f => f.nutritional_category?.includes('vegetables'));

  // Calculate portions for each category
  if (proteinFoods.length > 0) {
    const caloriesPerProteinFood = proteinCalories / proteinFoods.length;
    proteinFoods.forEach(food => {
      portionedFoods.push(calculatePortionSize(food, caloriesPerProteinFood, macroTargets));
    });
  }

  if (carbsFoods.length > 0) {
    const caloriesPerCarbFood = carbsCalories / carbsFoods.length;
    carbsFoods.forEach(food => {
      portionedFoods.push(calculatePortionSize(food, caloriesPerCarbFood, macroTargets));
    });
  }

  if (fatsFoods.length > 0) {
    const caloriesPerFatFood = fatsCalories / fatsFoods.length;
    fatsFoods.forEach(food => {
      portionedFoods.push(calculatePortionSize(food, caloriesPerFatFood, macroTargets));
    });
  }

  // Add vegetables with minimal calories
  veggies.forEach(food => {
    portionedFoods.push(calculatePortionSize(food, 50, macroTargets)); // Low calorie allocation for veggies
  });

  return portionedFoods;
}

export function analyzeMeal(
  availableFoods: Food[],
  requirements: MealRequirements,
  mealType: string
): {
  foods: FoodWithPortion[];
  meetsGuidelines: boolean;
  suggestions?: string[];
} {
  // Mapear tipos de refeição para food_group_id (usado no banco de dados)
  const mealTypeToFoodGroupMap: Record<string, number> = {
    'breakfast': 1,      // Café da Manhã
    'morning_snack': 2,  // Lanche da Manhã
    'lunch': 3,          // Almoço
    'afternoon_snack': 4, // Lanche da Tarde
    'dinner': 5          // Jantar
  };
  
  // Filtrar alimentos adequados para o tipo de refeição usando food_group_id
  const foodGroupId = mealTypeToFoodGroupMap[mealType];
  
  // Filter foods suitable for the meal type based on food_group_id
  // Primeiro verificamos pelo food_group_id e depois pelo meal_type (para compatibilidade)
  const suitableFoods = availableFoods.filter(food => 
    (food.food_group_id === foodGroupId) || 
    (food.meal_type?.includes(mealType) || food.meal_type?.includes('any'))
  );

  // Calculate target calories for the meal based on meal type
  const mealCaloriesDistribution: Record<string, number> = {
    'breakfast': 0.25,
    'morning_snack': 0.1,
    'lunch': 0.3,
    'afternoon_snack': 0.1,
    'dinner': 0.25
  };

  const mealTargetCalories = requirements.targetCalories * (mealCaloriesDistribution[mealType] || 0.2);

  // Generate initial meal composition
  const selectedFoods = calculateMealPortions(
    suitableFoods,
    mealTargetCalories,
    requirements.macroTargets,
    mealType
  );

  // Validate meal composition
  const { isValid, missingCategories } = validateMealComposition(
    selectedFoods,
    mealType,
    requirements.mealGuidelines
  );

  const suggestions = missingCategories.map(category => {
    switch (category) {
      case 'carbs_complex':
        return 'Adicione uma fonte de carboidratos complexos (ex: arroz integral, quinoa)';
      case 'protein':
        return 'Adicione uma fonte de proteína (ex: frango, peixe, tofu)';
      case 'healthy_fats':
        return 'Adicione uma fonte de gorduras saudáveis (ex: azeite, abacate)';
      case 'vegetables':
        return 'Adicione vegetais ao prato';
      default:
        return `Adicione uma fonte de ${category}`;
    }
  });

  return {
    foods: selectedFoods,
    meetsGuidelines: isValid,
    suggestions: suggestions.length > 0 ? suggestions : undefined
  };
}
