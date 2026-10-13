import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import AuthPage from './pages/AuthPage';
import MainBar from './MainBar';
import Dashboard from './pages/Dashboard';
import Planner from './pages/Planner';
import Calendar from './pages/Calendar';
import MyCoach from './pages/MyCoach';
import CoachSteinAI from './pages/CoachSteinAI';
import { PublicOnlyRoute, RequireAuth } from './routes/AuthRoutes';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<PublicOnlyRoute />}>
            <Route path="/login" element={<AuthPage mode="login" />} />
            <Route path="/signup" element={<AuthPage mode="signup" />} />
          </Route>
          <Route element={<RequireAuth />}>
            <Route element={<MainBar />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="planner" element={<Planner />} />
              <Route path="calendar" element={<Calendar />} />
              <Route path="mycoach" element={<MyCoach />} />
              <Route path="ai" element={<CoachSteinAI />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
