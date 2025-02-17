
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import Layout from "./components/Layout";
import Menu from "./pages/Menu";
import Progress from "./pages/Progress";
import Store from "./pages/Store";
import Trainer from "./pages/Trainer";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import WorkoutPage from "./pages/Workout";
import Nutri from "./pages/Nutri";
import NotFound from "./pages/NotFound";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout><Outlet /></Layout>}>
          <Route index element={<Progress />} />
          <Route path="menu" element={<Menu />} />
          <Route path="nutri" element={<Nutri />} />
          <Route path="workout" element={<WorkoutPage />} />
          <Route path="store" element={<Store />} />
          <Route path="trainer" element={<Trainer />} />
          <Route path="admin" element={<Admin />} />
          <Route path="*" element={<NotFound />} />
        </Route>
        <Route path="/auth" element={<Auth />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
