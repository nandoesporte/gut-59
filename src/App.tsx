
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Index from './pages/Index';
import Auth from './pages/Auth';
import Admin from './pages/Admin';
import Menu from './pages/Menu';
import Progress from './pages/Progress';
import Store from './pages/Store';
import Workout from './pages/Workout';
import Fisio from './pages/Fisio';
import Trainer from './pages/Trainer';
import Instructions from './pages/Instructions';
import NotFound from './pages/NotFound';
import Wallet from './pages/Wallet';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/" element={<Layout />}>
          <Route index element={<Index />} />
          <Route path="admin" element={<Admin />} />
          <Route path="menu" element={<Menu />} />
          <Route path="progress" element={<Progress />} />
          <Route path="store" element={<Store />} />
          <Route path="workout" element={<Workout />} />
          <Route path="fisio" element={<Fisio />} />
          <Route path="trainer" element={<Trainer />} />
          <Route path="instructions" element={<Instructions />} />
          <Route path="wallet" element={<Wallet />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
