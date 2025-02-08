
import { useLocation } from "react-router-dom";
import ProgressChart from "@/components/Progress";
import DiaryHistory from "@/components/DiaryHistory";
import Layout from "@/components/Layout";

const Progress = () => {
  const location = useLocation();

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 space-y-8">
        <ProgressChart />
        <DiaryHistory />
      </div>
    </Layout>
  );
};

export default Progress;
