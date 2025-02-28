
import { calculatePortions } from "./portion-calculator.ts";
import { Food, FoodWithPortion, MacroTargets, UserData, DietaryPreferences, MealPlanResult } from "./types.ts";

// Main function to optimize meal plans
export async function optimizeMealPlan(
  userData: UserData,
  selectedFoods: Food[],
  macroTargets: MacroTargets,
  dietaryPreferences: DietaryPreferences,
  foodsByMealType?: Record<string, Food[]>
): Promise<any> {
  console.log("Optimizing meal plan for user with", userData.dailyCalories, "daily calories");
  console.log("Selected foods:", selectedFoods.length);
  
  // If we have foods by meal type, use that structure
  if (foodsByMealType) {
    console.log("Using provided foods by meal type");
    const result: any = {
      weeklyPlan: {}
    };
    
    // Create a basic weekly plan
    const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
    
    days.forEach(day => {
      // Create daily meal structure
      result.weeklyPlan[day] = {
        dayName: day.charAt(0).toUpperCase() + day.slice(1),
        meals: {},
        dailyTotals: {
          calories: 0,
          protein: 0,
          carbs: 0,
          fats: 0,
          fiber: 0
        }
      };
      
      // Set up meal types
      const mealTypes = {
        breakfast: {
          foods: foodsByMealType.breakfast || [],
          calorieRatio: 0.25 // 25% of daily calories
        },
        morningSnack: {
          foods: foodsByMealType.snack || [],
          calorieRatio: 0.1 // 10% of daily calories
        },
        lunch: {
          foods: foodsByMealType.lunch || [],
          calorieRatio: 0.35 // 35% of daily calories
        },
        afternoonSnack: {
          foods: foodsByMealType.snack || [],
          calorieRatio: 0.1 // 10% of daily calories
        },
        dinner: {
          foods: foodsByMealType.dinner || [],
          calorieRatio: 0.2 // 20% of daily calories
        }
      };
      
      // Process each meal
      let dailyTotalCalories = 0;
      let dailyTotalProtein = 0;
      let dailyTotalCarbs = 0;
      let dailyTotalFats = 0;
      let dailyTotalFiber = 0;
      
      for (const [mealType, mealConfig] of Object.entries(mealTypes)) {
        const mealCalories = userData.dailyCalories * mealConfig.calorieRatio;
        
        // Randomly select a subset of foods for variety
        const foodsForMeal = [...mealConfig.foods].sort(() => 0.5 - Math.random()).slice(0, 3);
        
        if (foodsForMeal.length > 0) {
          // Calculate appropriate portions
          const portionedFoods = calculatePortions(
            foodsForMeal,
            mealCalories,
            {
              protein: macroTargets.protein * mealConfig.calorieRatio,
              carbs: macroTargets.carbs * mealConfig.calorieRatio,
              fats: macroTargets.fats * mealConfig.calorieRatio,
              fiber: macroTargets.fiber * mealConfig.calorieRatio
            }
          );
          
          // Calculate meal totals
          const totalCalories = portionedFoods.reduce((sum, food) => sum + food.calculatedNutrients.calories, 0);
          const totalProtein = portionedFoods.reduce((sum, food) => sum + food.calculatedNutrients.protein, 0);
          const totalCarbs = portionedFoods.reduce((sum, food) => sum + food.calculatedNutrients.carbs, 0);
          const totalFats = portionedFoods.reduce((sum, food) => sum + food.calculatedNutrients.fats, 0);
          const totalFiber = portionedFoods.reduce((sum, food) => sum + food.calculatedNutrients.fiber, 0);
          
          // Format foods for display
          const formattedFoods = portionedFoods.map(food => ({
            name: food.name,
            portion: food.portion,
            unit: food.portionUnit,
            details: `Calorias: ${food.calculatedNutrients.calories}kcal, Proteínas: ${food.calculatedNutrients.protein}g, Carboidratos: ${food.calculatedNutrients.carbs}g, Gorduras: ${food.calculatedNutrients.fats}g`
          }));
          
          // Add meal to daily plan
          result.weeklyPlan[day].meals[mealType] = {
            foods: formattedFoods,
            calories: totalCalories,
            macros: {
              protein: totalProtein,
              carbs: totalCarbs,
              fats: totalFats,
              fiber: totalFiber
            },
            description: `${mealType.charAt(0).toUpperCase() + mealType.slice(1)} com aproximadamente ${totalCalories} calorias.`
          };
          
          // Update daily totals
          dailyTotalCalories += totalCalories;
          dailyTotalProtein += totalProtein;
          dailyTotalCarbs += totalCarbs;
          dailyTotalFats += totalFats;
          dailyTotalFiber += totalFiber;
        } else {
          // Default meal if no foods available
          result.weeklyPlan[day].meals[mealType] = {
            foods: [{
              name: "Opção variada",
              portion: 100,
              unit: "g",
              details: "Consulte um nutricionista para opções personalizadas"
            }],
            calories: Math.round(mealCalories),
            macros: {
              protein: Math.round(macroTargets.protein * mealConfig.calorieRatio),
              carbs: Math.round(macroTargets.carbs * mealConfig.calorieRatio),
              fats: Math.round(macroTargets.fats * mealConfig.calorieRatio),
              fiber: Math.round(macroTargets.fiber * mealConfig.calorieRatio)
            },
            description: `${mealType.charAt(0).toUpperCase() + mealType.slice(1)} com aproximadamente ${Math.round(mealCalories)} calorias.`
          };
          
          // Update daily totals with estimates
          dailyTotalCalories += Math.round(mealCalories);
          dailyTotalProtein += Math.round(macroTargets.protein * mealConfig.calorieRatio);
          dailyTotalCarbs += Math.round(macroTargets.carbs * mealConfig.calorieRatio);
          dailyTotalFats += Math.round(macroTargets.fats * mealConfig.calorieRatio);
          dailyTotalFiber += Math.round(macroTargets.fiber * mealConfig.calorieRatio);
        }
      }
      
      // Update daily totals
      result.weeklyPlan[day].dailyTotals = {
        calories: Math.round(dailyTotalCalories),
        protein: Math.round(dailyTotalProtein),
        carbs: Math.round(dailyTotalCarbs),
        fats: Math.round(dailyTotalFats),
        fiber: Math.round(dailyTotalFiber)
      };
    });
    
    // Calculate weekly averages
    const weeklyTotals = {
      averageCalories: userData.dailyCalories,
      averageProtein: macroTargets.protein,
      averageCarbs: macroTargets.carbs,
      averageFats: macroTargets.fats,
      averageFiber: macroTargets.fiber
    };
    
    result.weeklyTotals = weeklyTotals;
    
    return result;
  }
  
  // If no meal type categorization is provided, create a simple plan
  console.log("No meal type categorization provided, creating simple plan");
  
  // Basic implementation: distribute foods across meals
  const portionedFoods = calculatePortions(
    selectedFoods,
    userData.dailyCalories,
    macroTargets
  );
  
  // Very simple distribution - just split the foods into five groups (meals)
  const result: MealPlanResult = {
    breakfast: [],
    morning_snack: [],
    lunch: [],
    afternoon_snack: [],
    dinner: [],
    nutritionalAnalysis: {
      totalCalories: 0,
      macroDistribution: {
        protein: 0,
        carbs: 0,
        fats: 0,
        fiber: 0
      }
    }
  };
  
  // Distribute foods to meals
  portionedFoods.forEach((food, index) => {
    const mealIndex = index % 5;
    switch (mealIndex) {
      case 0:
        result.breakfast.push(food);
        break;
      case 1:
        result.morning_snack.push(food);
        break;
      case 2:
        result.lunch.push(food);
        break;
      case 3:
        result.afternoon_snack.push(food);
        break;
      case 4:
        result.dinner.push(food);
        break;
    }
  });
  
  // Calculate total nutritional values
  const totalCalories = portionedFoods.reduce((sum, food) => sum + food.calculatedNutrients.calories, 0);
  const totalProtein = portionedFoods.reduce((sum, food) => sum + food.calculatedNutrients.protein, 0);
  const totalCarbs = portionedFoods.reduce((sum, food) => sum + food.calculatedNutrients.carbs, 0);
  const totalFats = portionedFoods.reduce((sum, food) => sum + food.calculatedNutrients.fats, 0);
  const totalFiber = portionedFoods.reduce((sum, food) => sum + food.calculatedNutrients.fiber, 0);
  
  result.nutritionalAnalysis = {
    totalCalories,
    macroDistribution: {
      protein: totalProtein,
      carbs: totalCarbs,
      fats: totalFats,
      fiber: totalFiber
    }
  };
  
  return {
    mealPlan: result,
    recommendations: {
      general: "Mantenha-se hidratado bebendo pelo menos 2 litros de água por dia.",
      preworkout: "Consuma carboidratos de baixo índice glicêmico 1-2 horas antes do treino.",
      postworkout: "Consuma proteínas e carboidratos até 45 minutos após o treino.",
      timing: "Distribua suas refeições a cada 3-4 horas."
    }
  };
}
