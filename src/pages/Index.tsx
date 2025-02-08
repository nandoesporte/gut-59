
import Profile from "@/components/Profile";
import SymptomTracker from "@/components/SymptomTracker";
import FoodDiary from "@/components/FoodDiary";
import Education from "@/components/Education";
import Messages from "@/components/Messages";
import ShoppingList from "@/components/ShoppingList";

const Index = () => {
  return (
    <div className="space-y-8 flex flex-col items-center">
      <div className="w-full">
        <Profile />
      </div>
      <div className="w-full">
        <Messages />
      </div>
      <div className="w-full">
        <SymptomTracker />
      </div>
      <div className="w-full">
        <FoodDiary />
      </div>
      <div className="w-full">
        <ShoppingList />
      </div>
      <div className="w-full">
        <Education />
      </div>
    </div>
  );
};

export default Index;

