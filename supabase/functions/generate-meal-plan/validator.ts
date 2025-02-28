
import Ajv from "https://esm.sh/ajv@8.12.0";

const ajv = new Ajv({ 
  strictTypes: false,
  allowUnionTypes: true 
});

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

export const validateMealPlan = (data: unknown) => {
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

// Define a schema for the payload that is received by the function
const requestSchema = {
  type: "object",
  required: ["userData", "selectedFoods"],
  properties: {
    userData: {
      type: "object",
      properties: {
        id: { type: "string" },
        weight: { type: "number", minimum: 1 },
        height: { type: "number", minimum: 1 },
        age: { type: "number", minimum: 1 },
        gender: { type: "string" },
        activityLevel: { type: "string" },
        goal: { type: "string" },
        dailyCalories: { type: "number", minimum: 0 }
      },
      additionalProperties: true
    },
    selectedFoods: {
      type: "array",
      items: {
        type: "object",
        required: ["id", "name", "calories"],
        properties: {
          id: { 
            anyOf: [
              { type: "string" },
              { type: "number" }
            ]
          },
          name: { type: "string" },
          calories: { type: "number", minimum: 0 },
          protein: { type: "number", minimum: 0 },
          carbs: { type: "number", minimum: 0 },
          fats: { type: "number", minimum: 0 },
          fiber: { type: "number", minimum: 0 }
        },
        additionalProperties: true
      },
      minItems: 1
    },
    dietaryPreferences: {
      type: "object",
      properties: {
        hasAllergies: { type: "boolean" },
        allergies: { 
          type: "array",
          items: { type: "string" }
        },
        dietaryRestrictions: { 
          type: "array", 
          items: { type: "string" }
        },
        trainingTime: { 
          anyOf: [
            { type: "string" },
            { type: "null" }
          ]
        }
      },
      additionalProperties: true
    },
    foodsByMealType: {
      type: "object",
      additionalProperties: {
        type: "array",
        items: { 
          anyOf: [
            { type: "string" },
            { type: "number" }
          ]  
        }
      }
    },
    options: {
      type: "object",
      additionalProperties: true
    }
  },
  additionalProperties: true
};

// Export the function that validates the incoming payload
export const validatePayload = (data: unknown): boolean => {
  try {
    console.log("Validating payload...");
    
    // Optional debug log to understand what data is coming in
    console.log("Incoming payload:", JSON.stringify(data, null, 2).substring(0, 1000) + "...");
    
    // Validate payload shape first
    if (!data || typeof data !== 'object') {
      console.error("Invalid payload: payload must be an object");
      return false;
    }
    
    // Check for minimal required properties manually before using AJV
    const payload = data as any;
    if (!payload.userData) {
      console.error("Invalid payload: missing userData");
      return false;
    }
    
    if (!payload.selectedFoods || !Array.isArray(payload.selectedFoods) || payload.selectedFoods.length === 0) {
      console.error("Invalid payload: missing or empty selectedFoods array");
      return false;
    }
    
    // Now use AJV for full schema validation
    const validate = ajv.compile(requestSchema);
    const isValid = validate(data);
    
    if (!isValid) {
      const errors = validate.errors?.map(err => ({
        path: err.instancePath,
        message: err.message
      }));
      console.error("Validation errors:", JSON.stringify(errors, null, 2));
      return false;
    }
    
    console.log("Payload validation successful");
    return true;
  } catch (error) {
    console.error("Error during validation:", error);
    return false;
  }
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

interface UserData {
  weight: number;
  height: number;
  age: number;
  gender: string;
  activityLevel: string;
  goal: string;
  userId?: string;
  dailyCalories?: number;
}

interface Food {
  id: string | number;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  portion?: number;
  portionUnit?: string;
  food_group_id?: number;
}

interface DietaryPreferences {
  hasAllergies?: boolean;
  allergies?: string[];
  dietaryRestrictions?: string[];
  trainingTime?: string | null;
}

// Função para validar dados de entrada do usuário
export const validateInput = (
  userData: UserData,
  selectedFoods: Food[],
  dietaryPreferences: DietaryPreferences
): void => {
  // Validar dados do usuário
  if (!userData || typeof userData !== 'object') {
    throw new Error('Dados do usuário inválidos ou ausentes');
  }

  // Validar campos numéricos
  const requiredNumericFields = ['weight', 'height', 'age'];
  for (const field of requiredNumericFields) {
    if (!(field in userData) || typeof userData[field as keyof UserData] !== 'number' || userData[field as keyof UserData] <= 0) {
      throw new Error(`Campo ${field} deve ser um número positivo`);
    }
  }

  // Validar gênero
  if (!userData.gender || !['male', 'female'].includes(userData.gender.toLowerCase())) {
    throw new Error('Gênero deve ser "male" ou "female"');
  }

  // Validar nível de atividade
  const validActivityLevels = ['sedentary', 'light', 'moderate', 'active', 'very_active'];
  if (!userData.activityLevel || !validActivityLevels.includes(userData.activityLevel.toLowerCase())) {
    throw new Error('Nível de atividade inválido');
  }

  // Validar objetivo
  const validGoals = ['lose_weight', 'gain_mass', 'maintain'];
  if (!userData.goal || !validGoals.includes(userData.goal.toLowerCase())) {
    throw new Error('Objetivo inválido');
  }

  // Validar alimentos selecionados
  if (!Array.isArray(selectedFoods) || selectedFoods.length === 0) {
    throw new Error('Selecione pelo menos um alimento');
  }

  // Validar cada alimento
  for (const food of selectedFoods) {
    if (!food.name || typeof food.name !== 'string') {
      throw new Error('Nome do alimento inválido');
    }

    // Validar campos numéricos dos alimentos
    const foodNumericFields = ['calories', 'protein', 'carbs', 'fats'];
    for (const field of foodNumericFields) {
      if (!(field in food) || typeof food[field as keyof Food] !== 'number' || food[field as keyof Food] < 0) {
        throw new Error(`Campo ${field} do alimento ${food.name} deve ser um número não negativo`);
      }
    }
  }

  // Validar preferências dietéticas
  if (dietaryPreferences) {
    // Validar alergias se hasAllergies for true
    if (dietaryPreferences.hasAllergies && (!Array.isArray(dietaryPreferences.allergies) || dietaryPreferences.allergies.length === 0)) {
      throw new Error('Se há alergias, pelo menos uma alergia deve ser informada');
    }

    // Validar restrições dietéticas
    if (dietaryPreferences.dietaryRestrictions && !Array.isArray(dietaryPreferences.dietaryRestrictions)) {
      throw new Error('Restrições dietéticas devem ser um array');
    }

    // Validar horário de treino
    if (dietaryPreferences.trainingTime && typeof dietaryPreferences.trainingTime !== 'string') {
      throw new Error('Horário de treino deve ser uma string');
    }
  }

  // Se chegou até aqui, a validação passou
  console.log('Validação de dados de entrada concluída com sucesso');
};
