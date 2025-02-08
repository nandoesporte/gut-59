
import { Phase } from './education';

export interface Recipe {
  name: string;
  ingredients: string[];
  instructions: string[];
}

export interface AllowedFoods {
  vegetables: string[];
  fruits: string[];
  fats: string[];
  spices: string[];
  teas: {
    morning: string[];
    afterLunch: string[];
    beforeBed: string[];
  };
  tubers: string[];
  proteins: string[];
}

export interface DailyMeal {
  name: string;
  time?: string;
  items: string[];
}

