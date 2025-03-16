
import { useRef, useCallback } from "react";
import { FisioPreferences } from "../types";
import { RehabPlan } from "../types/rehab-plan";
import { useLoadingState } from "./rehab-plan/loading-state";
import { usePlanCounter } from "./rehab-plan/plan-counter";
import { useRehabPlanGenerator } from "./rehab-plan/rehab-plan-generator";
import { useInitialFetch } from "./rehab-plan/initial-fetch";

const mockProgressData = [
  { day: 1, completion: 0 },
  { day: 2, completion: 0 },
  { day: 3, completion: 0 },
  { day: 4, completion: 0 },
  { day: 5, completion: 0 },
  { day: 6, completion: 0 },
  { day: 7, completion: 0 },
];

export const useFisioPlanGeneration = (
  preferences: FisioPreferences,
  onPlanGenerated?: () => void
) => {
  const { 
    loading, 
    setLoading, 
    loadingTime, 
    loadingPhase, 
    loadingMessage, 
    loadingTimer 
  } = useLoadingState();
  
  const { 
    planGenerationCount, 
    setPlanGenerationCount, 
    updatePlanGenerationCount 
  } = usePlanCounter();
  
  const progressData = mockProgressData;
  
  const generationInProgress = useRef(false);
  const generationAttempted = useRef(false);

  const { 
    rehabPlan, 
    setRehabPlan, 
    error, 
    setError, 
    rawResponse, 
    setRawResponse, 
    generatePlan: generateRehabPlan 
  } = useRehabPlanGenerator({
    setLoading,
    setLoadingTime: (time: number) => loadingTimer.current ? loadingTime : time,
    updatePlanGenerationCount,
    getLoadingMessage: () => loadingMessage
  });

  const generatePlan = useCallback(async () => {
    await generateRehabPlan(preferences, onPlanGenerated);
  }, [preferences, onPlanGenerated, generateRehabPlan]);

  // Handle initial loading and fetching plan count
  useInitialFetch({
    rehabPlan,
    loading,
    error,
    isGenerating: generationInProgress,
    wasAttempted: generationAttempted,
    generatePlan,
    setPlanGenerationCount
  });

  return { 
    loading, 
    rehabPlan, 
    progressData, 
    error, 
    generatePlan, 
    rawResponse,
    loadingTime,
    loadingPhase,
    loadingMessage,
    planGenerationCount
  };
};
