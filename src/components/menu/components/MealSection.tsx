
import React from "react";
import { Meal } from "../types";

interface MealSectionProps {
  title: string;
  icon: React.ReactNode;
  meal: Meal;
  unitLabels?: Record<string, string>;
}

export const MealSection = ({ title, icon, meal, unitLabels = {} }: MealSectionProps) => {
  // Função para traduzir unidades
  const translateUnit = (unit: string): string => {
    // Verificar se temos uma tradução para esta unidade
    return unitLabels[unit.toLowerCase()] || unit;
  };

  // Função para traduzir descrições em inglês comuns
  const translateDescription = (description: string): string => {
    if (!description) return "";
    
    const translations: Record<string, string> = {
      "Breakfast": "Café da Manhã",
      "Morning Snack": "Lanche da Manhã",
      "Lunch": "Almoço",
      "Afternoon Snack": "Lanche da Tarde",
      "Dinner": "Jantar",
      "Evening Snack": "Ceia",
      "balanced meal": "refeição balanceada",
      "meal": "refeição",
      "with approximately": "com aproximadamente",
      "calories": "calorias"
    };
    
    let translated = description;
    
    // Substituir termos conhecidos
    Object.entries(translations).forEach(([en, pt]) => {
      translated = translated.replace(new RegExp(en, 'gi'), pt);
    });
    
    return translated;
  };

  // Função para traduzir detalhes de alimentos
  const translateFoodDetails = (details: string): string => {
    if (!details) return "";
    
    const translations: Record<string, string> = {
      "Source of protein": "Fonte de proteína",
      "Source of carbohydrate": "Fonte de carboidrato",
      "Source of fat": "Fonte de gordura",
      "Source of fiber": "Fonte de fibra",
      "Prepare according to": "Prepare de acordo com",
      "package instructions": "instruções da embalagem",
      "Cook": "Cozinhe",
      "according to": "de acordo com",
      "personal preference": "preferência pessoal",
      "Serve": "Sirva",
      "fresh": "fresco",
      "when possible": "quando possível",
      "Consume": "Consuma",
      "Season": "Tempere",
      "to taste": "a gosto",
      "with": "com",
      "and": "e",
      "in a": "em uma",
      "pan": "panela"
    };
    
    let translated = details;
    
    // Substituir termos conhecidos
    Object.entries(translations).forEach(([en, pt]) => {
      translated = translated.replace(new RegExp(en, 'gi'), pt);
    });
    
    return translated;
  };

  // Função para traduzir nomes de alimentos comuns
  const translateFoodName = (name: string): string => {
    if (!name) return "";
    
    const translations: Record<string, string> = {
      "Oatmeal": "Aveia",
      "Banana": "Banana",
      "Egg": "Ovo",
      "Whole Grain Bread": "Pão Integral",
      "Chicken Breast": "Peito de Frango",
      "Brown Rice": "Arroz Integral",
      "Sweet Potato": "Batata Doce",
      "Broccoli": "Brócolis",
      "Apple": "Maçã",
      "Yogurt": "Iogurte",
      "Orange Juice": "Suco de Laranja",
      "Salmon": "Salmão",
      "Olive Oil": "Azeite de Oliva",
      "Almonds": "Amêndoas",
      "Salad": "Salada",
      "Milk": "Leite",
      "Coffee": "Café",
      "Cheese": "Queijo",
      "Beans": "Feijão",
      "Carrots": "Cenouras",
      "Spinach": "Espinafre",
      "Beef": "Carne Bovina",
      "Fish": "Peixe",
      "Quinoa": "Quinoa",
      "Pasta": "Macarrão",
      "Rice": "Arroz",
      "Water": "Água",
      "Tea": "Chá",
      "Juice": "Suco"
    };
    
    // Verificar se temos uma tradução exata para este alimento
    if (translations[name]) {
      return translations[name];
    }
    
    // Caso contrário, tentar substituições parciais
    let translated = name;
    Object.entries(translations).forEach(([en, pt]) => {
      if (name.includes(en)) {
        translated = translated.replace(new RegExp(en, 'gi'), pt);
      }
    });
    
    return translated;
  };

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center mb-2">
        <div className="mr-2">{icon}</div>
        <h4 className="font-medium text-lg">{title}</h4>
        <div className="ml-auto text-sm font-medium text-gray-500">
          ~{meal.calories} kcal
        </div>
      </div>

      {meal.description && (
        <p className="text-sm text-gray-600 italic mb-2">{translateDescription(meal.description)}</p>
      )}

      <ul className="list-disc pl-5 space-y-1">
        {meal.foods?.map((food, index) => (
          <li key={index} className="text-sm">
            <span className="font-medium">{translateFoodName(food.name)}</span>:{" "}
            {food.portion} {translateUnit(food.unit || "g")}
            {food.details ? ` - ${translateFoodDetails(food.details)}` : ""}
          </li>
        ))}
      </ul>

      <div className="grid grid-cols-4 gap-2 mt-3 text-xs text-gray-500">
        <div>Proteína: {meal.macros?.protein}g</div>
        <div>Carboidratos: {meal.macros?.carbs}g</div>
        <div>Gorduras: {meal.macros?.fats}g</div>
        <div>Fibras: {meal.macros?.fiber}g</div>
      </div>
    </div>
  );
};
