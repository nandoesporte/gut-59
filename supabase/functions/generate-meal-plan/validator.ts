
import type { MealPlan } from './types.ts';
import Ajv from 'https://esm.sh/ajv@8.12.0';

const ajv = new Ajv();

const mealSchema = {
  type: 'object',
  properties: {
    foods: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'name', 'calories', 'protein', 'carbs', 'fats', 'portion', 'portionUnit'],
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          calories: { type: 'number' },
          protein: { type: 'number' },
          carbs: { type: 'number' },
          fats: { type: 'number' },
          portion: { type: 'number' },
          portionUnit: { type: 'string' }
        }
      }
    },
    calories: { type: 'number' },
    macros: {
      type: 'object',
      required: ['protein', 'carbs', 'fats'],
      properties: {
        protein: { type: 'number' },
        carbs: { type: 'number' },
        fats: { type: 'number' },
        fiber: { type: 'number' }
      }
    }
  },
  required: ['foods', 'calories', 'macros'],
  additionalProperties: false
};

const mealPlanSchema = {
  type: 'object',
  properties: {
    dailyPlan: {
      type: 'object',
      properties: {
        breakfast: mealSchema,
        morningSnack: mealSchema,
        lunch: mealSchema,
        afternoonSnack: mealSchema,
        dinner: mealSchema
      }
    },
    totalNutrition: {
      type: 'object',
      required: ['calories', 'protein', 'carbs', 'fats'],
      properties: {
        calories: { type: 'number' },
        protein: { type: 'number' },
        carbs: { type: 'number' },
        fats: { type: 'number' },
        fiber: { type: 'number' }
      }
    },
    recommendations: {
      type: 'array',
      items: { type: 'string' }
    }
  },
  required: ['dailyPlan', 'totalNutrition', 'recommendations'],
  additionalProperties: false
};

export function validatePlanData(data: unknown): string | null {
  const validate = ajv.compile(mealPlanSchema);
  if (!validate(data)) {
    return validate.errors?.[0]?.message || 'Erro de validação desconhecido';
  }
  return null;
}
