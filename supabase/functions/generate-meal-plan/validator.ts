import type { MealPlan } from './types.ts';
import Ajv from 'https://esm.sh/ajv@8.12.0';

const ajv = new Ajv();

export const mealPlanSchema = {
  type: "object",
  required: ["dailyPlan", "totalNutrition", "recommendations"],
  properties: {
    dailyPlan: {
      type: "object",
      required: ["breakfast", "morningSnack", "lunch", "afternoonSnack", "dinner"],
      properties: {
        breakfast: { $ref: "#/definitions/meal" },
        morningSnack: { $ref: "#/definitions/meal" },
        lunch: { $ref: "#/definitions/meal" },
        afternoonSnack: { $ref: "#/definitions/meal" },
        dinner: { $ref: "#/definitions/meal" }
      },
      additionalProperties: false
    },
    totalNutrition: {
      type: "object",
      required: ["calories", "protein", "carbs", "fats", "fiber"],
      properties: {
        calories: { type: "number", minimum: 0 },
        protein: { type: "number", minimum: 0 },
        carbs: { type: "number", minimum: 0 },
        fats: { type: "number", minimum: 0 },
        fiber: { type: "number", minimum: 0 }
      },
      additionalProperties: false
    },
    recommendations: {
      type: "object",
      required: ["general", "preworkout", "postworkout", "timing"],
      properties: {
        general: { type: "string", minLength: 1 },
        preworkout: { type: "string", minLength: 1 },
        postworkout: { type: "string", minLength: 1 },
        timing: {
          type: "array",
          items: { type: "string" },
          minItems: 5,
          maxItems: 5
        }
      },
      additionalProperties: false
    }
  },
  definitions: {
    meal: {
      type: "object",
      required: ["description", "foods", "calories", "macros"],
      properties: {
        description: { type: "string", minLength: 1 },
        foods: {
          type: "array",
          items: {
            type: "object",
            required: ["name", "portion", "unit", "details"],
            properties: {
              name: { type: "string", minLength: 1 },
              portion: { type: "number", minimum: 0 },
              unit: { 
                type: "string",
                enum: ["g", "ml", "unidade", "unidades", "xícara", "xícaras", "colher", "colheres", "fatia", "fatias"]
              },
              details: { type: "string", minLength: 1 }
            },
            additionalProperties: false
          },
          minItems: 1
        },
        calories: { type: "number", minimum: 0 },
        macros: {
          type: "object",
          required: ["protein", "carbs", "fats", "fiber"],
          properties: {
            protein: { type: "number", minimum: 0 },
            carbs: { type: "number", minimum: 0 },
            fats: { type: "number", minimum: 0 },
            fiber: { type: "number", minimum: 0 }
          },
          additionalProperties: false
        }
      },
      additionalProperties: false
    }
  },
  additionalProperties: false
};

export const validateMealPlan = (data: unknown): data is MealPlan => {
  const validate = ajv.compile(mealPlanSchema);
  const isValid = validate(data);
  
  if (!isValid) {
    const errors = validate.errors?.map(err => ({
      path: err.instancePath,
      message: err.message
    }));
    throw new Error(`Validação falhou: ${JSON.stringify(errors, null, 2)}`);
  }
  
  return data;
};

export const standardizeUnits = (unit: string): string => {
  const unitMap: Record<string, string> = {
    'grama': 'g',
    'gramas': 'g',
    'mililitro': 'ml',
    'mililitros': 'ml',
    'un': 'unidade',
    'uns': 'unidades',
    'und': 'unidade',
    'unds': 'unidades',
    'xic': 'xícara',
    'xics': 'xícaras',
    'col': 'colher',
    'cols': 'colheres',
    'ft': 'fatia',
    'fts': 'fatias'
  };

  return unitMap[unit.toLowerCase()] || unit;
};
