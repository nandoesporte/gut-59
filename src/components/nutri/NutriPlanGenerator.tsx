
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { NutriPreferencesForm } from "./NutriPreferencesForm";
import { NutriPlanDisplay } from "./NutriPlanDisplay";
import { NutriPlan, NutriPreferences } from "./types";

export const NutriPlanGenerator = () => {
  const [preferences, setPreferences] = useState<NutriPreferences | null>(null);

  return (
    <Card className="p-6">
      {!preferences ? (
        <NutriPreferencesForm onSubmit={setPreferences} />
      ) : (
        <NutriPlanDisplay preferences={preferences} onReset={() => setPreferences(null)} />
      )}
    </Card>
  );
};
