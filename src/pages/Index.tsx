
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
        <FoodDiary />
      </div>
      <div className="w-full">
        <Education />
      </div>
    </div>
  );
};

export default Index;
