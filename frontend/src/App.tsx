import Sidebar from './components/Sidebar';
import Planner from './features/planner/Planner';

export default function App() {
  return <div className="app-shell" id="top"><Sidebar /><main className="main-content planner-main"><Planner /></main></div>;
}
