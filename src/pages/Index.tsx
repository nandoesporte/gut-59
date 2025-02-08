
import Profile from "@/components/Profile";
import SymptomTracker from "@/components/SymptomTracker";
import Education from "@/components/Education";

const Index = () => {
  return (
    <div className="space-y-8 flex flex-col items-center">
      <div className="w-full">
        <Profile />
      </div>
      <div className="w-full">
        <SymptomTracker />
      </div>
      <div className="w-full">
        <Education />
      </div>
    </div>
  );
};

export default Index;
