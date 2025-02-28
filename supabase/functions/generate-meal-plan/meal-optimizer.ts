
import { MacroTargets, Food, FoodWithPortion, MealPlanResult, UserData, DietaryPreferences } from "./types.ts";
import { calculatePortions } from "./portion-calculator.ts";
import { scoreFoodCombination } from "./nutritional-scorer.ts";

export async function optimizeMealPlan(
  userData: UserData,
  selectedFoods: Food[],
  macroTargets: MacroTargets,
  dietaryPreferences: DietaryPreferences,
  foodsByMealType?: Record<string, Food[]>
): Promise<MealPlanResult> {
  console.log("Starting meal plan optimization");

  try {
    const filteredFoods = filterFoodsByPreferences(selectedFoods, dietaryPreferences);
    console.log(`Filtered foods based on preferences: ${filteredFoods.length} foods remaining`);

    // Categorize foods
    const categorizedFoods = categorizeFoods(filteredFoods);
    
    // Use foodsByMealType if provided
    let breakfast: FoodWithPortion[] = [];
    let morningSnack: FoodWithPortion[] = [];
    let lunch: FoodWithPortion[] = [];
    let afternoonSnack: FoodWithPortion[] = [];
    let dinner: FoodWithPortion[] = [];
    
    if (foodsByMealType) {
      console.log("Using provided foods by meal type");
      
      // Process each meal type with the provided foods
      if (foodsByMealType.breakfast && foodsByMealType.breakfast.length > 0) {
        breakfast = await calculatePortions(
          foodsByMealType.breakfast,
          userData.dailyCalories * 0.25, // 25% of daily calories for breakfast
          macroTargets
        );
      }
      
      if (foodsByMealType.morning_snack && foodsByMealType.morning_snack.length > 0) {
        morningSnack = await calculatePortions(
          foodsByMealType.morning_snack,
          userData.dailyCalories * 0.1, // 10% of daily calories for morning snack
          macroTargets
        );
      }
      
      if (foodsByMealType.lunch && foodsByMealType.lunch.length > 0) {
        lunch = await calculatePortions(
          foodsByMealType.lunch,
          userData.dailyCalories * 0.3, // 30% of daily calories for lunch
          macroTargets
        );
      }
      
      if (foodsByMealType.afternoon_snack && foodsByMealType.afternoon_snack.length > 0) {
        afternoonSnack = await calculatePortions(
          foodsByMealType.afternoon_snack,
          userData.dailyCalories * 0.1, // 10% of daily calories for afternoon snack
          macroTargets
        );
      }
      
      if (foodsByMealType.dinner && foodsByMealType.dinner.length > 0) {
        dinner = await calculatePortions(
          foodsByMealType.dinner,
          userData.dailyCalories * 0.25, // 25% of daily calories for dinner
          macroTargets
        );
      }
    }
    
    // If any meal type is still empty, use categorized foods to fill
    if (breakfast.length === 0) {
      const breakfastFoods = selectFoodsForMeal(categorizedFoods, "breakfast", 4);
      breakfast = await calculatePortions(
        breakfastFoods,
        userData.dailyCalories * 0.25,
        macroTargets
      );
    }
    
    if (morningSnack.length === 0) {
      const morningSnackFoods = selectFoodsForMeal(categorizedFoods, "snack", 2);
      morningSnack = await calculatePortions(
        morningSnackFoods,
        userData.dailyCalories * 0.1,
        macroTargets
      );
    }
    
    if (lunch.length === 0) {
      const lunchFoods = selectFoodsForMeal(categorizedFoods, "lunch", 5);
      lunch = await calculatePortions(
        lunchFoods,
        userData.dailyCalories * 0.3,
        macroTargets
      );
    }
    
    if (afternoonSnack.length === 0) {
      const afternoonSnackFoods = selectFoodsForMeal(categorizedFoods, "snack", 2);
      afternoonSnack = await calculatePortions(
        afternoonSnackFoods,
        userData.dailyCalories * 0.1,
        macroTargets
      );
    }
    
    if (dinner.length === 0) {
      const dinnerFoods = selectFoodsForMeal(categorizedFoods, "dinner", 5);
      dinner = await calculatePortions(
        dinnerFoods,
        userData.dailyCalories * 0.25,
        macroTargets
      );
    }
    
    // Calculate total nutritional values
    const totalCalories = calculateTotalCalories([...breakfast, ...morningSnack, ...lunch, ...afternoonSnack, ...dinner]);
    const macroDistribution = calculateMacroDistribution([...breakfast, ...morningSnack, ...lunch, ...afternoonSnack, ...dinner]);
    
    console.log("Meal plan optimization completed successfully");
    console.log(`Total calories: ${totalCalories}, Protein: ${macroDistribution.protein}g, Carbs: ${macroDistribution.carbs}g, Fats: ${macroDistribution.fats}g`);

    return {
      breakfast,
      morning_snack: morningSnack,
      lunch,
      afternoon_snack: afternoonSnack,
      dinner,
      nutritionalAnalysis: {
        totalCalories,
        macroDistribution
      }
    };
  } catch (error) {
    console.error("Error in optimizeMealPlan:", error);
    throw new Error(`Failed to optimize meal plan: ${error.message}`);
  }
}

function filterFoodsByPreferences(foods: Food[], preferences: DietaryPreferences): Food[] {
  return foods.filter(food => {
    // Filter out foods user is allergic to
    if (preferences.hasAllergies && preferences.allergies.length > 0) {
      const foodName = food.name.toLowerCase();
      for (const allergen of preferences.allergies) {
        if (foodName.includes(allergen.toLowerCase())) {
          return false;
        }
      }
    }
    
    // Filter based on dietary restrictions
    if (preferences.dietaryRestrictions.length > 0) {
      // Implement filtering based on dietary restrictions
      // This is a simplified example - real implementation would need more complex logic
      if (preferences.dietaryRestrictions.includes('vegetarian')) {
        // Skip foods that are meat or contain meat
        const meats = ['carne', 'frango', 'peixe', 'atum', 'bacon', 'presunto'];
        if (meats.some(meat => food.name.toLowerCase().includes(meat))) {
          return false;
        }
      }
      
      if (preferences.dietaryRestrictions.includes('lactose-free')) {
        // Skip dairy products
        const dairy = ['leite', 'queijo', 'iogurte', 'requeijão', 'cream cheese'];
        if (dairy.some(item => food.name.toLowerCase().includes(item))) {
          return false;
        }
      }
      
      // Add more restrictions as needed
    }
    
    return true;
  });
}

function categorizeFoods(foods: Food[]): Record<string, Food[]> {
  const categories = {
    protein: [],
    carbs: [],
    fats: [],
    vegetables: [],
    fruits: [],
    dairy: [],
    breakfast: [],
    lunch: [],
    dinner: [],
    snack: []
  } as Record<string, Food[]>;
  
  for (const food of foods) {
    // Categorize by nutritional composition
    if (food.protein > food.carbs && food.protein > food.fats) {
      categories.protein.push(food);
    } else if (food.carbs > food.protein && food.carbs > food.fats) {
      categories.carbs.push(food);
    } else if (food.fats > food.protein && food.fats > food.carbs) {
      categories.fats.push(food);
    }
    
    // Categorize by food group
    if (food.food_group_id === 1) { // Assume 1 is vegetables
      categories.vegetables.push(food);
    } else if (food.food_group_id === 2) { // Assume 2 is fruits
      categories.fruits.push(food);
    } else if (food.food_group_id === 3) { // Assume 3 is dairy
      categories.dairy.push(food);
    }
    
    // Categorize by meal type if nutritional_category is available
    if (food.nutritional_category) {
      for (const category of food.nutritional_category) {
        if (category === 'breakfast' || category === 'lunch' || 
            category === 'dinner' || category === 'snack') {
          categories[category].push(food);
        }
      }
    } else {
      // Simple heuristic if nutritional_category is not available
      const name = food.name.toLowerCase();
      if (name.includes('pão') || name.includes('cereal') || name.includes('aveia')) {
        categories.breakfast.push(food);
      }
      if (name.includes('arroz') || name.includes('feijão') || name.includes('carne')) {
        categories.lunch.push(food);
        categories.dinner.push(food);
      }
      if (name.includes('fruta') || name.includes('barra') || name.includes('castanha')) {
        categories.snack.push(food);
      }
    }
  }
  
  return categories;
}

function selectFoodsForMeal(categorizedFoods: Record<string, Food[]>, mealType: string, count: number): Food[] {
  const selectedFoods: Food[] = [];
  
  // First, try to select foods specifically categorized for this meal type
  if (categorizedFoods[mealType] && categorizedFoods[mealType].length > 0) {
    const typeFoods = [...categorizedFoods[mealType]];
    shuffleArray(typeFoods);
    
    while (selectedFoods.length < count && typeFoods.length > 0) {
      selectedFoods.push(typeFoods.pop() as Food);
    }
  }
  
  // If we still need more foods, select based on nutritional composition
  if (selectedFoods.length < count) {
    const neededCount = count - selectedFoods.length;
    
    // Different balance for different meal types
    let proteinCount = 0;
    let carbsCount = 0;
    let fatsCount = 0;
    let vegFruitCount = 0;
    
    if (mealType === 'breakfast') {
      proteinCount = Math.ceil(neededCount * 0.3);
      carbsCount = Math.ceil(neededCount * 0.4);
      fatsCount = Math.ceil(neededCount * 0.2);
      vegFruitCount = Math.floor(neededCount * 0.1);
    } else if (mealType === 'lunch' || mealType === 'dinner') {
      proteinCount = Math.ceil(neededCount * 0.4);
      carbsCount = Math.ceil(neededCount * 0.3);
      fatsCount = Math.ceil(neededCount * 0.1);
      vegFruitCount = Math.floor(neededCount * 0.2);
    } else { // snack
      proteinCount = Math.ceil(neededCount * 0.2);
      carbsCount = Math.ceil(neededCount * 0.3);
      fatsCount = Math.ceil(neededCount * 0.2);
      vegFruitCount = Math.floor(neededCount * 0.3);
    }
    
    // Add protein foods
    addFoodsFromCategory(categorizedFoods.protein, selectedFoods, proteinCount);
    
    // Add carb foods
    addFoodsFromCategory(categorizedFoods.carbs, selectedFoods, carbsCount);
    
    // Add fat foods
    addFoodsFromCategory(categorizedFoods.fats, selectedFoods, fatsCount);
    
    // Add vegetables or fruits
    if (mealType === 'breakfast' || mealType === 'snack') {
      addFoodsFromCategory(categorizedFoods.fruits, selectedFoods, vegFruitCount);
    } else {
      addFoodsFromCategory(categorizedFoods.vegetables, selectedFoods, vegFruitCount);
    }
  }
  
  // If we still don't have enough foods, just add random ones
  if (selectedFoods.length < count) {
    const allFoods = [
      ...categorizedFoods.protein,
      ...categorizedFoods.carbs,
      ...categorizedFoods.fats,
      ...categorizedFoods.vegetables,
      ...categorizedFoods.fruits
    ];
    
    shuffleArray(allFoods);
    
    while (selectedFoods.length < count && allFoods.length > 0) {
      const food = allFoods.pop() as Food;
      if (!selectedFoods.find(f => f.id === food.id)) {
        selectedFoods.push(food);
      }
    }
  }
  
  return selectedFoods;
}

function addFoodsFromCategory(categoryFoods: Food[], selectedFoods: Food[], count: number): void {
  if (!categoryFoods || categoryFoods.length === 0) return;
  
  const foods = [...categoryFoods];
  shuffleArray(foods);
  
  let added = 0;
  while (added < count && foods.length > 0) {
    const food = foods.pop() as Food;
    if (!selectedFoods.find(f => f.id === food.id)) {
      selectedFoods.push(food);
      added++;
    }
  }
}

function shuffleArray(array: any[]): void {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function calculateTotalCalories(foods: FoodWithPortion[]): number {
  return foods.reduce((total, food) => total + food.calculatedNutrients.calories, 0);
}

function calculateMacroDistribution(foods: FoodWithPortion[]): MacroTargets {
  return foods.reduce((totals, food) => {
    return {
      protein: totals.protein + food.calculatedNutrients.protein,
      carbs: totals.carbs + food.calculatedNutrients.carbs,
      fats: totals.fats + food.calculatedNutrients.fats,
      fiber: totals.fiber + (food.calculatedNutrients.fiber || 0)
    };
  }, { protein: 0, carbs: 0, fats: 0, fiber: 0 });
}
