
import React from 'react';
import { Card } from "@/components/ui/card";

interface SupplementsListProps {
  supplements: string[];
}

const SupplementsList = ({ supplements }: SupplementsListProps) => {
  return (
    <Card className="overflow-hidden">
      <div className="bg-secondary-50 px-4 py-2 border-b border-secondary-100">
        <h5 className="font-semibold text-secondary-700">
          Informações Complementares
        </h5>
      </div>
      <div className="p-4">
        <table className="w-full">
          <tbody>
            {supplements.map((supplement, i) => (
              <tr key={i} className="border-b last:border-0 border-gray-100">
                <td className="py-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 rounded-full bg-secondary-400 flex-shrink-0" />
                    <span className="text-gray-700">{supplement}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export default SupplementsList;
