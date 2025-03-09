
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ProtocolFood, MealPlan, DietaryPreferences, Goal, CalorieCalculatorForm } from "./types";
import { useCalorieCalculator } from "./hooks/useCalorieCalculator";
import { useFoodSelection } from "./hooks/useFoodSelection";
import { useMealPlanGeneration } from "./hooks/useMealPlanGeneration";
import { useProtocolFoods } from "./hooks/useProtocolFoods";

// Re-export the hook implementation
export { useMenuController } from "./hooks/useMenuController";
