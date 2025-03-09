
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
      return { general: recs };
    }
    
    return recs as RecommendationsObject;
  };

  const formattedRecommendations = formatRecommendations(recommendations);

  // Helper function to render recommendation items
  const renderRecommendationItems = (items: string | string[] | undefined) => {
    if (!items) return null;
    
    if (typeof items === 'string') {
      return items.split('\n').map((item, index) => (
        <p key={index} className="flex items-start">
          <span className="mr-2">•</span>
          <span>{item.trim()}</span>
        </p>
      ));
    } else if (Array.isArray(items)) {
      return items.map((item, index) => (
        <p key={index} className="flex items-start">
          <span className="mr-2">•</span>
          <span>{item.trim()}</span>
        </p>
      ));
    }
    
    return null;
  };

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
            {renderRecommendationItems(formattedRecommendations.general)}
          </div>
        </div>
      )}
      
      {formattedRecommendations.preworkout && (
        <div className="bg-blue-50 p-4 rounded-md">
          <h4 className="font-medium text-blue-800 mb-2">Recomendações Pré-Treino</h4>
          <div className="text-sm text-blue-700 space-y-1">
            {renderRecommendationItems(formattedRecommendations.preworkout)}
          </div>
        </div>
      )}
      
      {formattedRecommendations.postworkout && (
        <div className="bg-purple-50 p-4 rounded-md">
          <h4 className="font-medium text-purple-800 mb-2">Recomendações Pós-Treino</h4>
          <div className="text-sm text-purple-700 space-y-1">
            {renderRecommendationItems(formattedRecommendations.postworkout)}
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
            {renderRecommendationItems(formattedRecommendations.timing)}
          </div>
        </div>
      )}
    </div>
  );
};
