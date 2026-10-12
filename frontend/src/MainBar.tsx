import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function MainBar() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#e6e8e3]">
      <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />
      <main className={`min-h-screen px-4 pb-8 pt-[68px] transition-[margin] duration-300 sm:px-6 md:pt-8 ${sidebarCollapsed ? 'md:ml-[78px]' : 'md:ml-[264px]'}`}>
        <Outlet />
      </main>
    </div>
  );
}
