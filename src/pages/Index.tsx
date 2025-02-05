import Layout from "@/components/Layout";
import Profile from "@/components/Profile";
import SymptomTracker from "@/components/SymptomTracker";
import FoodDiary from "@/components/FoodDiary";
import Education from "@/components/Education";
import Progress from "@/components/Progress";

const Index = () => {
  return (
    <Layout>
      <div className="space-y-8">
        <Profile />
        <SymptomTracker />
        <FoodDiary />
        <Education />
        <Progress />
      </div>
    </Layout>
  );
};

export default Index;