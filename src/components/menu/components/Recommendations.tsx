
import React from "react";
import { RecommendationsObject } from "../types";
import { Lightbulb, Clock, Trophy } from "lucide-react";

interface RecommendationsProps {
  recommendations?: RecommendationsObject | string | string[];
}

export const Recommendations = ({ recommendations }: RecommendationsProps) => {
  // Function to format recommendations
  const formatRecommendations = (recs: string | string[] | RecommendationsObject | undefined): RecommendationsObject => {
    if (!recs) return { general: '' };
    
    if (typeof recs === 'string') {
      return { general: recs };
    } else if (Array.isArray(recs)) {
      return { general: recs.join('\n') };
    }
    
    return recs as RecommendationsObject;
  };

  const formattedRecommendations = formatRecommendations(recommendations);

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg text-green-700 flex items-center">
        <Lightbulb className="h-5 w-5 mr-2 text-yellow-500" />
        Recomendações Personalizadas
      </h3>
      
      {formattedRecommendations.general && (
        <div className="bg-green-50 p-4 rounded-md">
          <h4 className="font-medium text-green-800 mb-2">Recomendações Gerais</h4>
          <div className="text-sm text-green-700 space-y-1">
            {typeof formattedRecommendations.general === 'string' ? (
              formattedRecommendations.general.split('\n').map((item, index) => (
                <p key={index} className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>{item.trim()}</span>
                </p>
              ))
            ) : (
              formattedRecommendations.general.map((item, index) => (
                <p key={index} className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>{item.trim()}</span>
                </p>
              ))
            )}
          </div>
        </div>
      )}
      
      {formattedRecommendations.preworkout && (
        <div className="bg-blue-50 p-4 rounded-md">
          <h4 className="font-medium text-blue-800 mb-2">Recomendações Pré-Treino</h4>
          <div className="text-sm text-blue-700 space-y-1">
            {typeof formattedRecommendations.preworkout === 'string' ? (
              formattedRecommendations.preworkout.split('\n').map((item, index) => (
                <p key={index} className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>{item.trim()}</span>
                </p>
              ))
            ) : (
              formattedRecommendations.preworkout.map((item, index) => (
                <p key={index} className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>{item.trim()}</span>
                </p>
              ))
            )}
          </div>
        </div>
      )}
      
      {formattedRecommendations.postworkout && (
        <div className="bg-purple-50 p-4 rounded-md">
          <h4 className="font-medium text-purple-800 mb-2">Recomendações Pós-Treino</h4>
          <div className="text-sm text-purple-700 space-y-1">
            {typeof formattedRecommendations.postworkout === 'string' ? (
              formattedRecommendations.postworkout.split('\n').map((item, index) => (
                <p key={index} className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>{item.trim()}</span>
                </p>
              ))
            ) : (
              formattedRecommendations.postworkout.map((item, index) => (
                <p key={index} className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>{item.trim()}</span>
                </p>
              ))
            )}
          </div>
        </div>
      )}
      
      {formattedRecommendations.timing && (
        <div className="bg-amber-50 p-4 rounded-md">
          <h4 className="font-medium text-amber-800 mb-2 flex items-center">
            <Clock className="h-4 w-4 mr-1" />
            Timing das Refeições
          </h4>
          <div className="text-sm text-amber-700 space-y-1">
            {typeof formattedRecommendations.timing === 'string' ? (
              formattedRecommendations.timing.split('\n').map((item, index) => (
                <p key={index} className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>{item.trim()}</span>
                </p>
              ))
            ) : (
              formattedRecommendations.timing.map((item, index) => (
                <p key={index} className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>{item.trim()}</span>
                </p>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
