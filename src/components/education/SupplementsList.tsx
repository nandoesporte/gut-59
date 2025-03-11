
import React from 'react';
import { Card } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";

interface SupplementsListProps {
  supplements: string[];
}

const SupplementsList = ({ supplements }: SupplementsListProps) => {
  const isMobile = useIsMobile();
  
  // Helper function to determine if a line is a category header
  const isCategoryHeader = (text: string): boolean => {
    return text.endsWith(':') || text.endsWith('Permitidos:');
  };

  // Helper function to determine if a line is important
  const isImportant = (text: string): boolean => {
    return text.toLowerCase().includes('importante:');
  };

  return (
    <Card className="overflow-hidden">
      <div className="bg-secondary-50 px-3 sm:px-4 py-2 border-b border-secondary-100">
        <h5 className="font-semibold text-secondary-700 text-sm sm:text-base">
          Informações Complementares
        </h5>
      </div>
      <div className="p-3 sm:p-4">
        <div className="space-y-3 sm:space-y-4">
          {supplements.map((supplement, i) => {
            if (isCategoryHeader(supplement)) {
              // Render category headers with more emphasis
              return (
                <div key={i} className="pt-1 sm:pt-2 first:pt-0">
                  <h6 className="text-primary-600 font-semibold text-base sm:text-lg mb-1 sm:mb-2">
                    {supplement}
                  </h6>
                </div>
              );
            } else if (isImportant(supplement)) {
              // Render important notices with special styling
              return (
                <div key={i} className="bg-secondary-50 p-2 sm:p-3 rounded-md border border-secondary-200">
                  <p className="text-secondary-800 font-medium text-sm sm:text-base">
                    {supplement}
                  </p>
                </div>
              );
            } else if (supplement.startsWith('-')) {
              // Render list items with bullets
              return (
                <div key={i} className="pl-3 sm:pl-4">
                  <div className="flex items-start space-x-2 sm:space-x-3">
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-secondary-400 flex-shrink-0 mt-1.5" />
                    <span className="text-gray-700 text-sm sm:text-base">{supplement.substring(2).trim()}</span>
                  </div>
                </div>
              );
            } else if (supplement === "") {
              // Add spacing between sections
              return <div key={i} className="h-1 sm:h-2" />;
            } else {
              // Regular text
              return (
                <p key={i} className="text-gray-700 text-sm sm:text-base">
                  {supplement}
                </p>
              );
            }
          })}
        </div>
      </div>
    </Card>
  );
};

export default SupplementsList;
