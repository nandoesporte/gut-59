
import * as React from "react";
import { useState } from "react";
import { Utensils } from "lucide-react";
import { Card } from "@/components/ui/card";
import { NutriPreferences } from "@/components/nutri/types";
import { NutriPreferencesForm } from "@/components/nutri/NutriPreferencesForm";
import { NutriPlanDisplay } from "@/components/nutri/NutriPlanDisplay";

const Nutri = () => {
  const [preferences, setPreferences] = useState<NutriPreferences | null>(null);

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center gap-3 mb-8">
        <Utensils className="w-8 h-8 text-primary-500" />
        <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-500 to-primary-600 bg-clip-text text-transparent">
          Plano Nutricional Personalizado
        </h1>
      </div>

      {!preferences ? (
        <Card className="p-6">
          <NutriPreferencesForm onSubmit={setPreferences} />
        </Card>
      ) : (
        <NutriPlanDisplay preferences={preferences} onReset={() => setPreferences(null)} />
      )}
    </div>
  );
};

export default Nutri;
