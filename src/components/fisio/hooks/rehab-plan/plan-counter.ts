
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UsePlanCounterReturn {
  planGenerationCount: number;
  setPlanGenerationCount: (count: number) => void;
  updatePlanGenerationCount: (userId: string) => Promise<void>;
}

export const usePlanCounter = (): UsePlanCounterReturn => {
  const [planGenerationCount, setPlanGenerationCount] = useState(0);

  const updatePlanGenerationCount = async (userId: string) => {
    try {
      const { data: countData, error: countError } = await supabase
        .from('plan_generation_counts')
        .select('rehabilitation_count')
        .eq('user_id', userId)
        .maybeSingle();
        
      if (countError) {
        console.error("Error getting count:", countError);
        return;
      }
      
      if (countData) {
        const newCount = (countData.rehabilitation_count || 0) + 1;
        await supabase
          .from('plan_generation_counts')
          .update({ rehabilitation_count: newCount })
          .eq('user_id', userId);
        setPlanGenerationCount(newCount);
      } else {
        await supabase
          .from('plan_generation_counts')
          .insert({ user_id: userId, rehabilitation_count: 1 });
        setPlanGenerationCount(1);
      }
    } catch (countError) {
      console.error("Error updating count:", countError);
    }
  };

  return {
    planGenerationCount,
    setPlanGenerationCount,
    updatePlanGenerationCount
  };
};
