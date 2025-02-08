
import { useState } from "react";
import DailyMeals from "@/components/progress/DailyMeals";
import WaterIntakeSection from "@/components/progress/WaterIntakeSection";
import ProgressChart from "@/components/Progress";

const Progress = () => {
  const [date, setDate] = useState<Date>(new Date());

  return (
    <div className="container mx-auto px-4 py-6 space-y-8">
      <DailyMeals date={date} onDateChange={setDate} />
      <WaterIntakeSection date={date} />
      <ProgressChart />
    </div>
  );
};

export default Progress;
