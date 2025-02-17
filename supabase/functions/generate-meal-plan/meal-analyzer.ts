
import { ProtocolFood, DietaryPreferences, MealPlanAnalysis } from './types.ts'

export class MealAnalyzer {
  async analyze({
    foods,
    dailyCalories,
    dietaryPreferences,
    healthCondition
  }: {
    foods: ProtocolFood[]
    dailyCalories: number
    dietaryPreferences: DietaryPreferences
    healthCondition: string | null
  }): Promise<MealPlanAnalysis> {
    console.log('Analyzing meal plan requirements')

    // Análise de macronutrientes baseada nas necessidades
    const macroDistribution = this.calculateMacroDistribution(healthCondition)
    
    // Verificar restrições alimentares
    const restrictedFoods = this.checkDietaryRestrictions(foods, dietaryPreferences)
    
    // Análise de timing das refeições
    const mealTiming = this.analyzeMealTiming(dietaryPreferences.trainingTime)
    
    // Verificar adequação nutricional
    const nutritionalAdequacy = this.checkNutritionalAdequacy(foods, dailyCalories)

    return {
      macroDistribution,
      restrictedFoods,
      mealTiming,
      nutritionalAdequacy,
      healthConditionConsiderations: this.getHealthConditionGuidelines(healthCondition)
    }
  }

  private calculateMacroDistribution(healthCondition: string | null) {
    // Distribuição padrão de macronutrientes
    let distribution = {
      protein: 0.25,
      carbs: 0.50,
      fats: 0.25
    }

    // Ajustar com base na condição de saúde
    switch (healthCondition) {
      case 'diabetes':
        distribution.carbs = 0.40
        distribution.protein = 0.30
        distribution.fats = 0.30
        break
      case 'hipertensao':
        distribution.fats = 0.20
        distribution.carbs = 0.55
        distribution.protein = 0.25
        break
      // Adicionar outros casos conforme necessário
    }

    return distribution
  }

  private checkDietaryRestrictions(foods: ProtocolFood[], preferences: DietaryPreferences) {
    const restrictedFoods = foods.filter(food => {
      // Verificar alergias
      if (preferences.hasAllergies && preferences.allergies.some(
        allergy => food.name.toLowerCase().includes(allergy.toLowerCase())
      )) {
        return true
      }

      // Verificar restrições dietéticas
      if (preferences.dietaryRestrictions.some(
        restriction => food.nutritional_category?.includes(restriction)
      )) {
        return true
      }

      return false
    })

    return restrictedFoods
  }

  private analyzeMealTiming(trainingTime: string | null) {
    if (!trainingTime) {
      return {
        breakfast: '6:00-8:00',
        morningSnack: '9:30-10:30',
        lunch: '12:00-13:00',
        afternoonSnack: '15:30-16:30',
        dinner: '19:00-20:00'
      }
    }

    const training = new Date(`2000-01-01T${trainingTime}`)
    // Ajustar horários com base no treino
    return {
      breakfast: this.adjustMealTime(training, -2),
      morningSnack: this.adjustMealTime(training, -1),
      lunch: this.adjustMealTime(training, 1),
      afternoonSnack: this.adjustMealTime(training, 2),
      dinner: this.adjustMealTime(training, 4)
    }
  }

  private adjustMealTime(baseTime: Date, hourOffset: number) {
    const time = new Date(baseTime.getTime())
    time.setHours(time.getHours() + hourOffset)
    return time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  private checkNutritionalAdequacy(foods: ProtocolFood[], dailyCalories: number) {
    // Verificar adequação de vitaminas e minerais
    const vitamins = new Set(foods.flatMap(food => 
      Object.keys(food.vitamins_minerals || {})
    ))

    const minerals = vitamins.size >= 5

    // Verificar adequação de fibras
    const totalFiber = foods.reduce((sum, food) => 
      sum + (food.calculatedNutrients?.fiber || 0), 0
    )

    return {
      hasAdequateVitamins: vitamins.size >= 5,
      hasAdequateMinerals: minerals,
      hasAdequateFiber: totalFiber >= 25,
      estimatedFiberIntake: totalFiber
    }
  }

  private getHealthConditionGuidelines(condition: string | null) {
    const guidelines: Record<string, string[]> = {
      diabetes: [
        'Priorizar alimentos com baixo índice glicêmico',
        'Distribuir carboidratos ao longo do dia',
        'Incluir proteínas magras em todas as refeições'
      ],
      hipertensao: [
        'Limitar o consumo de sódio',
        'Priorizar alimentos ricos em potássio',
        'Evitar alimentos processados'
      ],
      depressao_ansiedade: [
        'Incluir alimentos ricos em triptofano',
        'Priorizar ômega-3 e vitaminas do complexo B',
        'Manter refeições regulares'
      ]
    }

    return condition ? guidelines[condition] || [] : []
  }
}
