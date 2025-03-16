
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UseInitialFetchProps {
  rehabPlan: any;
  loading: boolean;
  error: string | null;
  isGenerating: { current: boolean };
  wasAttempted: { current: boolean };
  generatePlan: () => void;
  setPlanGenerationCount: (count: number) => void;
}

export const useInitialFetch = ({
  rehabPlan,
  loading,
  error,
  isGenerating,
  wasAttempted,
  generatePlan,
  setPlanGenerationCount
}: UseInitialFetchProps): void => {
  useEffect(() => {
    if (!rehabPlan && !loading && !error && !isGenerating.current && !wasAttempted.current) {
      console.log("Initial rehab plan generation starting...");
      generatePlan();
    }
    
    const fetchGenerationCount = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from('plan_generation_counts')
            .select('rehabilitation_count')
            .eq('user_id', user.id)
            .maybeSingle();
            
          if (data) {
            setPlanGenerationCount(data.rehabilitation_count || 0);
          }
        }
      } catch (err) {
        console.error("Error fetching plan generation count:", err);
      }
    };
    
    fetchGenerationCount();
  }, [rehabPlan, loading, error, isGenerating, wasAttempted, generatePlan, setPlanGenerationCount]);
};
