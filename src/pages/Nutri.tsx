
import * as React from "react";
import { Card } from "@/components/ui/card";
import { NutriPlanGenerator } from "@/components/nutri/NutriPlanGenerator";
import { Apple } from "lucide-react";

const Nutri = () => {
  return (
    <div className="container max-w-6xl mx-auto py-8">
      <div className="flex items-center gap-3 mb-8">
        <Apple className="w-8 h-8 text-primary-500" />
        <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-500 to-primary-600 bg-clip-text text-transparent">
          Plano Nutricional Personalizado
        </h1>
      </div>
      <NutriPlanGenerator />
    </div>
  );
};

export default Nutri;
