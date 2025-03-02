
import { useState } from "react";
import DailyMeals from "@/components/progress/DailyMeals";
import WaterIntakeSection from "@/components/progress/WaterIntakeSection";
import ProgressChart from "@/components/Progress";
import { formatInTimeZone } from "date-fns-tz";

// Use Brasilia timezone
const BRAZIL_TIMEZONE = "America/Sao_Paulo";

const Progress = () => {
  // Initialize with current date in Brasilia timezone
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
