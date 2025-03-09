
import { RecommendationsObject } from "../types";

export const formatRecommendations = (recs: string | string[] | RecommendationsObject | undefined): {
  general?: string;
  preworkout?: string;
  postworkout?: string;
  timing?: string[];
} | undefined => {
  if (!recs) return undefined;
  
  if (typeof recs === 'string') {
    return { general: recs };
  } else if (Array.isArray(recs)) {
    return { general: recs.join('\n') };
  }
  
  // Convert any string[] to string by joining with newlines
  let formatted: { 
    general?: string; 
    preworkout?: string; 
    postworkout?: string; 
    timing?: string[];
  } = {};
  
  if (recs.general) {
    formatted.general = Array.isArray(recs.general) ? recs.general.join('\n') : recs.general;
  }
  
  if (recs.preworkout) {
    formatted.preworkout = Array.isArray(recs.preworkout) ? recs.preworkout.join('\n') : recs.preworkout;
  }
  
  if (recs.postworkout) {
    formatted.postworkout = Array.isArray(recs.postworkout) ? recs.postworkout.join('\n') : recs.postworkout;
  }
  
  if (recs.timing) {
    formatted.timing = recs.timing;
  }
  
  return formatted;
};
