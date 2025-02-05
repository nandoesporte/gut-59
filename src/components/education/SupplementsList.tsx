
import React from 'react';

interface SupplementsListProps {
  supplements: string[];
}

const SupplementsList = ({ supplements }: SupplementsListProps) => {
  return (
    <div className="mt-4 pt-4 border-t border-gray-100">
      <h5 className="font-medium text-gray-700 mb-2">
        Suplementos do dia
      </h5>
      <div className="pl-4 space-y-2">
        {supplements.map((supplement, i) => (
          <div
            key={i}
            className="flex items-center space-x-2"
          >
            <div className="w-2 h-2 rounded-full bg-secondary-400" />
            <span className="text-gray-600">{supplement}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SupplementsList;
