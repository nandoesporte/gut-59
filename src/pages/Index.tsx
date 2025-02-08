
import Layout from "@/components/Layout";
import Profile from "@/components/Profile";
import SymptomTracker from "@/components/SymptomTracker";
import FoodDiary from "@/components/FoodDiary";
import Education from "@/components/Education";

const Index = () => {
  return (
    <Layout>
      <div className="space-y-8 flex flex-col items-center">
        <div className="w-full max-w-4xl">
          <Profile />
        </div>
        <div className="w-full max-w-4xl">
          <SymptomTracker />
        </div>
        <div className="w-full">
          <FoodDiary />
        </div>
        <Education />
      </div>
    </Layout>
  );
};

export default Index;

