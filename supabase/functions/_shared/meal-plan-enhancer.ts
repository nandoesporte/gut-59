// Enhances meal plans by adding salads and maximizing food variety

// Function to enhance meal plan variety by adding salads and maximizing food variety
export function enhanceMealPlanVariety(mealPlan) {
  console.log("[NUTRI+] Enhancing meal plan with salads and variety optimization");
  
  // First, ensure lunch and dinner have salads in all days
  if (mealPlan.weeklyPlan) {
    const days = Object.keys(mealPlan.weeklyPlan);
    
    // Common salad ingredients and descriptions for variety
    const saladTypes = [
      {
        name: "Salada verde",
        details: "Mix de folhas verdes (alface, rúcula, espinafre) com tomate e pepino",
        calories: 30,
        macros: { protein: 1, carbs: 4, fats: 0, fiber: 2 }
      },
      {
        name: "Salada colorida",
        details: "Cenoura ralada, beterraba, tomate e cebola roxa",
        calories: 35,
        macros: { protein: 1, carbs: 6, fats: 0, fiber: 2 }
      },
      {
        name: "Salada tropical",
        details: "Alface, manga, abacaxi e cebola roxa com limão",
        calories: 40,
        macros: { protein: 1, carbs: 8, fats: 0, fiber: 2 }
      },
      {
        name: "Salada mediterrânea",
        details: "Pepino, tomate, azeitona, cebola roxa com azeite e orégano",
        calories: 45,
        macros: { protein: 1, carbs: 5, fats: 2, fiber: 2 }
      }
    ];
    
    // Add salads to lunch and dinner if missing
    days.forEach((day, index) => {
      const dayPlan = mealPlan.weeklyPlan[day];
      
      if (dayPlan && dayPlan.meals) {
        // Check lunch
        if (dayPlan.meals.lunch) {
          const hasSalad = dayPlan.meals.lunch.foods.some(food => 
            food.name.toLowerCase().includes('salada') || 
            food.details.toLowerCase().includes('salada')
          );
          
          if (!hasSalad) {
            const saladIndex = index % saladTypes.length;
            const salad = saladTypes[saladIndex];
            
            // Add salad to lunch
            dayPlan.meals.lunch.foods.push({
              name: salad.name,
              portion: 100,
              unit: "g",
              details: salad.details
            });
            
            // Update macros
            dayPlan.meals.lunch.calories += salad.calories;
            dayPlan.meals.lunch.macros.protein += salad.macros.protein;
            dayPlan.meals.lunch.macros.carbs += salad.macros.carbs;
            dayPlan.meals.lunch.macros.fats += salad.macros.fats;
            dayPlan.meals.lunch.macros.fiber += salad.macros.fiber;
            
            // Update daily totals
            dayPlan.dailyTotals.calories += salad.calories;
            dayPlan.dailyTotals.protein += salad.macros.protein;
            dayPlan.dailyTotals.carbs += salad.macros.carbs;
            dayPlan.dailyTotals.fats += salad.macros.fats;
            dayPlan.dailyTotals.fiber += salad.macros.fiber;
            
            console.log(`[NUTRI+] Added salad to lunch for ${day}`);
          }
        }
        
        // Check dinner
        if (dayPlan.meals.dinner) {
          const hasSalad = dayPlan.meals.dinner.foods.some(food => 
            food.name.toLowerCase().includes('salada') || 
            food.details.toLowerCase().includes('salada')
          );
          
          if (!hasSalad) {
            const saladIndex = (index + 2) % saladTypes.length;
            const salad = saladTypes[saladIndex];
            
            // Add salad to dinner
            dayPlan.meals.dinner.foods.push({
              name: salad.name,
              portion: 100,
              unit: "g",
              details: salad.details
            });
            
            // Update macros
            dayPlan.meals.dinner.calories += salad.calories;
            dayPlan.meals.dinner.macros.protein += salad.macros.protein;
            dayPlan.meals.dinner.macros.carbs += salad.macros.carbs;
            dayPlan.meals.dinner.macros.fats += salad.macros.fats;
            dayPlan.meals.dinner.macros.fiber += salad.macros.fiber;
            
            // Update daily totals
            dayPlan.dailyTotals.calories += salad.calories;
            dayPlan.dailyTotals.protein += salad.macros.protein;
            dayPlan.dailyTotals.carbs += salad.macros.carbs;
            dayPlan.dailyTotals.fats += salad.macros.fats;
            dayPlan.dailyTotals.fiber += salad.macros.fiber;
            
            console.log(`[NUTRI+] Added salad to dinner for ${day}`);
          }
        }
      }
    });
    
    // Now maximize variety by ensuring the same foods don't repeat too much
    maximizeVarietyAcrossDays(mealPlan.weeklyPlan);
  }
  
  return mealPlan;
}

// Function to maximize variety across all days of the meal plan
function maximizeVarietyAcrossDays(weeklyPlan) {
  // For each meal type, track foods used and swap repeated ones
  const mealTypes = ['breakfast', 'morningSnack', 'lunch', 'afternoonSnack', 'dinner'];
  
  // Process each meal type
  mealTypes.forEach(mealType => {
    // Count food occurrences across all days for this meal type
    const foodCounts = new Map();
    const days = Object.keys(weeklyPlan);
    
    // First pass: count occurrences
    days.forEach(day => {
      const meal = weeklyPlan[day]?.meals?.[mealType];
      if (meal && meal.foods) {
        meal.foods.forEach(food => {
          const foodName = food.name.toLowerCase();
          foodCounts.set(foodName, (foodCounts.get(foodName) || 0) + 1);
        });
      }
    });
    
    // Find foods that repeat more than 3 times
    const overusedFoods = [...foodCounts.entries()]
      .filter(([_, count]) => count > 3)
      .map(([name]) => name);
    
    if (overusedFoods.length > 0) {
      console.log(`[NUTRI+] Found ${overusedFoods.length} overused foods in ${mealType}`);
      
      // For each overused food, try to swap instances between days
      overusedFoods.forEach(overusedFood => {
        // Find days using this food
        const daysWithFood = days.filter(day => 
          weeklyPlan[day]?.meals?.[mealType]?.foods.some(
            food => food.name.toLowerCase() === overusedFood
          )
        );
        
        // If we have more than 3 days with this food, swap with other foods
        if (daysWithFood.length > 3) {
          // Keep the first 3 instances, swap others
          const daysToModify = daysWithFood.slice(3);
          
          // For each day to modify, find a suitable swap
          daysToModify.forEach(dayToModify => {
            // Look for days with foods not yet used this week for this meal
            const candidateDays = days.filter(day => !daysWithFood.includes(day));
            
            if (candidateDays.length > 0) {
              // Pick a random day to swap with
              const swapDay = candidateDays[Math.floor(Math.random() * candidateDays.length)];
              
              // Find indices of the foods to swap
              const foodIndexInModifyDay = weeklyPlan[dayToModify].meals[mealType].foods.findIndex(
                food => food.name.toLowerCase() === overusedFood
              );
              
              // If the target day has foods for this meal type
              if (weeklyPlan[swapDay]?.meals?.[mealType]?.foods.length > 0) {
                // Pick a random food from the swap day
                const swapFoodIndex = Math.floor(Math.random() * weeklyPlan[swapDay].meals[mealType].foods.length);
                
                // Swap the foods between days
                const tempFood = {...weeklyPlan[dayToModify].meals[mealType].foods[foodIndexInModifyDay]};
                weeklyPlan[dayToModify].meals[mealType].foods[foodIndexInModifyDay] = 
                  {...weeklyPlan[swapDay].meals[mealType].foods[swapFoodIndex]};
                weeklyPlan[swapDay].meals[mealType].foods[swapFoodIndex] = tempFood;
                
                console.log(`[NUTRI+] Swapped ${overusedFood} between ${dayToModify} and ${swapDay}`);
              }
            }
          });
        }
      });
    }
  });
  
  return weeklyPlan;
}

// Calculate weekly totals from the meal plan for use after modifications
export function calculateWeeklyTotals(weeklyPlan) {
  const days = Object.values(weeklyPlan);
  const validDays = days.filter(day => day && day.dailyTotals);
  const dayCount = validDays.length || 1; // Avoid division by zero
  
  return {
    averageCalories: Math.round(validDays.reduce((sum, day) => sum + (day.dailyTotals?.calories || 0), 0) / dayCount),
    averageProtein: Math.round(validDays.reduce((sum, day) => sum + (day.dailyTotals?.protein || 0), 0) / dayCount),
    averageCarbs: Math.round(validDays.reduce((sum, day) => sum + (day.dailyTotals?.carbs || 0), 0) / dayCount),
    averageFats: Math.round(validDays.reduce((sum, day) => sum + (day.dailyTotals?.fats || 0), 0) / dayCount),
    averageFiber: Math.round(validDays.reduce((sum, day) => sum + (day.dailyTotals?.fiber || 0), 0) / dayCount)
  };
}
