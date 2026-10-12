import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import MainBar from './MainBar';
import Dashboard from './pages/Dashboard';
import Planner from './pages/Planner';
import Calendar from './pages/Calendar';
import MyCoach from './pages/MyCoach';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainBar />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="planner" element={<Planner />} />
          <Route path="calendar" element={<Calendar />} />
          <Route path="mycoach" element={<MyCoach />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
