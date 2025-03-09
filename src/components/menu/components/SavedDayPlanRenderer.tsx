
import React from "react";
import { MealSection } from "./MealSection";
import { DailyTotals } from "./DailyTotals";
import { FoodReplaceButton } from "./FoodReplaceButton";
import { Food, DayPlan } from "../types";

interface SavedDayPlanRendererProps {
  dayKey: string;
  dayName: string;
  dayPlan: DayPlan;
  onReplaceFood: (food: Food, dayKey: string, mealType: string, index: number) => void;
}

export const SavedDayPlanRenderer: React.FC<SavedDayPlanRendererProps> = ({
  dayKey,
  dayName,
  dayPlan,
  onReplaceFood
}) => {
  if (!dayPlan) return null;

  return (
    <div className="space-y-6">
      <div className="p-4 bg-muted rounded-md mb-6">
        <h2 className="text-xl font-bold">📅 {dayName} – Plano Alimentar</h2>
      </div>

      {dayPlan.meals.breakfast && (
        <div className="relative">
          <MealSection
            title="Café da Manhã"
            icon={<div className="w-5 h-5 text-primary">☀️</div>}
            meal={dayPlan.meals.breakfast}
          />
          {dayPlan.meals.breakfast.foods.map((food, index) => (
            <FoodReplaceButton
              key={`breakfast-${index}`}
              food={food}
              dayKey={dayKey}
              mealType="breakfast"
              index={index}
              onReplaceFood={onReplaceFood}
            />
          ))}
        </div>
      )}

      {dayPlan.meals.morningSnack && (
        <div className="relative">
          <MealSection
            title="Lanche da Manhã"
            icon={<div className="w-5 h-5 text-primary">🥪</div>}
            meal={dayPlan.meals.morningSnack}
          />
          {dayPlan.meals.morningSnack.foods.map((food, index) => (
            <FoodReplaceButton
              key={`morningSnack-${index}`}
              food={food}
              dayKey={dayKey}
              mealType="morningSnack"
              index={index}
              onReplaceFood={onReplaceFood}
            />
          ))}
        </div>
      )}

      {dayPlan.meals.lunch && (
        <div className="relative">
          <MealSection
            title="Almoço"
            icon={<div className="w-5 h-5 text-primary">🍽️</div>}
            meal={dayPlan.meals.lunch}
          />
          {dayPlan.meals.lunch.foods.map((food, index) => (
            <FoodReplaceButton
              key={`lunch-${index}`}
              food={food}
              dayKey={dayKey}
              mealType="lunch"
              index={index}
              onReplaceFood={onReplaceFood}
            />
          ))}
        </div>
      )}

      {dayPlan.meals.afternoonSnack && (
        <div className="relative">
          <MealSection
            title="Lanche da Tarde"
            icon={<div className="w-5 h-5 text-primary">🍎</div>}
            meal={dayPlan.meals.afternoonSnack}
          />
          {dayPlan.meals.afternoonSnack.foods.map((food, index) => (
            <FoodReplaceButton
              key={`afternoonSnack-${index}`}
              food={food}
              dayKey={dayKey}
              mealType="afternoonSnack"
              index={index}
              onReplaceFood={onReplaceFood}
            />
          ))}
        </div>
      )}

      {dayPlan.meals.dinner && (
        <div className="relative">
          <MealSection
            title="Jantar"
            icon={<div className="w-5 h-5 text-primary">🌙</div>}
            meal={dayPlan.meals.dinner}
          />
          {dayPlan.meals.dinner.foods.map((food, index) => (
            <FoodReplaceButton
              key={`dinner-${index}`}
              food={food}
              dayKey={dayKey}
              mealType="dinner"
              index={index}
              onReplaceFood={onReplaceFood}
            />
          ))}
        </div>
      )}

      {dayPlan.dailyTotals && (
        <DailyTotals totalNutrition={dayPlan.dailyTotals} />
      )}
    </div>
  );
};
