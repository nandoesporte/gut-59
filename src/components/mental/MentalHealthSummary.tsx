
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BrainCircuit, BookOpen, Heart, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const MentalHealthSummary = () => {
  const navigate = useNavigate();

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  return (
    <Card className="w-full border-none shadow-md overflow-hidden bg-gradient-to-r from-purple-50 to-white dark:from-gray-800 dark:to-gray-900">
      <CardContent className="p-6">
        <div className="flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-full">
                <BrainCircuit className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-purple-800 dark:text-purple-300">Saúde Mental</h3>
                <p className="text-sm text-purple-600/80 dark:text-purple-400/80">
                  Cuide da sua mente
                </p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleNavigate('/mental')}
              className="bg-white hover:bg-purple-50 border-purple-200 text-purple-700 hover:text-purple-800 transition-all"
            >
              Acessar <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
            <div 
              className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/20 rounded-xl p-4 cursor-pointer transition-all hover:shadow-sm"
              onClick={() => handleNavigate('/mental')}
            >
              <div className="flex items-center text-purple-700 dark:text-purple-400 mb-1">
                <Heart className="h-4 w-4 mr-1" />
                <span className="text-sm font-medium">Conversar</span>
              </div>
              <p className="text-sm text-purple-700/80 dark:text-purple-300/90">
                Dialogue com nossa assistente de saúde mental
              </p>
            </div>
            
            <div 
              className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/30 dark:to-indigo-800/20 rounded-xl p-4 cursor-pointer transition-all hover:shadow-sm"
              onClick={() => handleNavigate('/mental')}
            >
              <div className="flex items-center text-indigo-700 dark:text-indigo-400 mb-1">
                <BookOpen className="h-4 w-4 mr-1" />
                <span className="text-sm font-medium">Aprender</span>
              </div>
              <p className="text-sm text-indigo-700/80 dark:text-indigo-300/90">
                Acesse vídeos e recursos educacionais
              </p>
            </div>
            
            <div 
              className="bg-gradient-to-br from-pink-50 to-pink-100 dark:from-pink-900/30 dark:to-pink-800/20 rounded-xl p-4 cursor-pointer transition-all hover:shadow-sm"
              onClick={() => handleNavigate('/mental')}
            >
              <div className="flex items-center text-pink-700 dark:text-pink-400 mb-1">
                <BrainCircuit className="h-4 w-4 mr-1" />
                <span className="text-sm font-medium">Módulos</span>
              </div>
              <p className="text-sm text-pink-700/80 dark:text-pink-300/90">
                Explore módulos temáticos de saúde mental
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
