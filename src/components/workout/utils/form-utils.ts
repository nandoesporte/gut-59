
import * as z from "zod";
import { ActivityLevel, ExerciseType } from "../types";

export const formSchema = z.object({
  age: z.number().min(16, "Idade mínima é 16 anos").max(100, "Idade máxima é 100 anos"),
  weight: z.number().min(30, "Peso mínimo é 30kg").max(200, "Peso máximo é 200kg"),
  height: z.number().min(100, "Altura mínima é 100cm").max(250, "Altura máxima é 250cm"),
  gender: z.enum(["male", "female"]),
  goal: z.enum(["lose_weight", "maintain", "gain_mass"]),
  activity_level: z.enum(["sedentary", "light", "moderate", "intense"]),
  preferred_exercise_types: z.array(z.enum(["strength", "cardio", "mobility"])).min(1, "Selecione pelo menos um tipo de exercício"),
  training_location: z.enum(["gym", "home", "outdoors", "no_equipment"])
});

export type FormSchema = z.infer<typeof formSchema>;

// Type guard functions
export const isValidGender = (value: any): value is "male" | "female" => {
  return value === "male" || value === "female";
};

export const isValidGoal = (value: any): value is "lose_weight" | "maintain" | "gain_mass" => {
  return value === "lose_weight" || value === "maintain" || value === "gain_mass";
};

export const isValidActivityLevel = (value: any): value is ActivityLevel => {
  return ["sedentary", "light", "moderate", "intense"].includes(value);
};

export const isValidExerciseType = (value: any): value is ExerciseType => {
  return ["strength", "cardio", "mobility"].includes(value);
};

// Helper function to map training location to available equipment
export const mapTrainingLocationToEquipment = (trainingLocation: string): string[] => {
  switch (trainingLocation) {
    case "gym":
      return ["all"];
    case "home":
      return ["bodyweight", "resistance-bands", "dumbbells"];
    case "outdoors":
      return ["bodyweight", "resistance-bands"];
    case "no_equipment":
    default:
      return ["bodyweight"];
  }
};

// Helper function to map available equipment to training location
export const mapEquipmentToTrainingLocation = (equipment: string[] | undefined): "gym" | "home" | "outdoors" | "no_equipment" => {
  if (!equipment || equipment.length === 0) {
    return "no_equipment";
  }
  
  if (equipment.includes("all")) {
    return "gym";
  }
  
  if (equipment.includes("bodyweight") && equipment.includes("dumbbells")) {
    return "home";
  }
  
  if (equipment.includes("bodyweight") && !equipment.includes("dumbbells")) {
    return "outdoors";
  }
  
  return "no_equipment";
};
