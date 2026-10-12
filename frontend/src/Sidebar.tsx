import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';

type IconName = 'dashboard' | 'calendar' | 'planner' | 'user' | 'menu' | 'close' | 'chevronLeft';

function SidebarIcon({ name, size = 21, strokeWidth = 1.8 }: { name: IconName; size?: number; strokeWidth?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true as const };
  switch (name) {
    case 'dashboard': return <svg {...common}><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>;
    case 'calendar':
    case 'planner': return <svg {...common}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/>{name === 'planner' && <path d="M8 15h3M8 18h7"/>}</svg>;
    case 'user': return <svg {...common}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
    case 'menu': return <svg {...common}><path d="M4 6h16M4 12h16M4 18h16"/></svg>;
    case 'close': return <svg {...common}><path d="m18 6-12 12M6 6l12 12"/></svg>;
    case 'chevronLeft': return <svg {...common}><path d="m15 18-6-6 6-6"/></svg>;
  }
}

interface NavItem { name: string; path: string; icon: IconName }

const navItems: NavItem[] = [
  { name: 'Dashboard', path: '/dashboard', icon: 'dashboard' },
  { name: 'Planner', path: '/planner', icon: 'planner' },
  { name: 'Calendar', path: '/calendar', icon: 'calendar' },
  { name: 'MyCoach', path: '/mycoach', icon: 'user' },
];

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export default function Sidebar({ collapsed, setCollapsed }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const visualCollapsed = collapsed && !mobileOpen;

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, []);

  return <>
    <button
      className="fixed left-3 top-3 z-[60] grid size-10 place-items-center rounded-xl border border-[#35434a] bg-[#182126] text-[#c8e9d6] shadow-lg md:hidden"
      onClick={() => setMobileOpen((open) => !open)}
      aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
      aria-expanded={mobileOpen}
      aria-controls="app-sidebar"
    >
      <SidebarIcon name={mobileOpen ? 'close' : 'menu'} size={20}/>
    </button>

    {mobileOpen && <button className="fixed inset-0 z-40 border-0 bg-black/70 backdrop-blur-[2px] md:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />}

    <aside
      id="app-sidebar"
      className={`fixed inset-y-0 left-0 z-50 flex h-dvh flex-col border-r border-[#263138] bg-gradient-to-b from-[#151b20] to-[#11171b] px-[15px] pb-[13px] pt-[21px] text-[#e5eae6] shadow-[10px_0_35px_rgba(0,0,0,0.08)] transition-[width,transform] duration-300 ease-out ${visualCollapsed ? 'w-[min(82vw,292px)] md:w-[78px]' : 'w-[min(82vw,292px)] md:w-[264px]'} ${mobileOpen ? 'translate-x-0' : '-translate-x-[102%] md:translate-x-0'}`}
      aria-label="Main navigation"
    >
      <Link to="/dashboard" onClick={() => setMobileOpen(false)} aria-label="MySpace dashboard" className={`flex h-[51px] shrink-0 items-center gap-3 border-b border-[#263138] px-[5px] pb-[17px] text-inherit ${visualCollapsed ? 'justify-center' : ''}`}>
        <span className="grid size-[34px] shrink-0 place-items-center rounded-[11px] border border-[#5da984] bg-gradient-to-br from-[#9be2c5] to-[#6fc49a] text-[17px] font-extrabold text-[#132019] shadow-[0_5px_14px_rgba(155,226,197,0.13)]">M</span>
        {!visualCollapsed && <span className="grid gap-[3px] whitespace-nowrap"><strong className="font-[Manrope] text-[15px] font-bold tracking-[-0.35px] text-[#edf2ed]">MySpace</strong><small className="font-mono text-[8px] tracking-[1.15px] text-[#75837d]">PERSONAL WORKSPACE</small></span>}
      </Link>

      <nav className="flex flex-1 flex-col gap-[5px] py-[26px]" aria-label="Workspace">
        {!visualCollapsed && <span className="px-[10px] pb-2 font-mono text-[8px] tracking-[1.3px] text-[#6f7d82]">WORKSPACE</span>}
        {navItems.map(({ name, path, icon }) => <NavLink
            key={name}
            to={path}
            end={path === '/dashboard'}
            onClick={() => setMobileOpen(false)}
            title={visualCollapsed ? name : undefined}
            className={({ isActive }) => `group relative flex min-h-[43px] items-center gap-3 rounded-lg border px-[10px] text-[11px] font-medium transition-colors duration-150 ${visualCollapsed ? 'justify-center' : ''} ${isActive ? 'border-[#30463b] bg-gradient-to-r from-[#20342a] to-[#1b2824] text-[#b5edce] shadow-[inset_2px_0_#95dfb9,0_5px_14px_rgba(0,0,0,0.1)]' : 'border-transparent text-[#909c9e] hover:bg-[#1d262b] hover:text-[#e0e8e2]'}`}
          >
            {({ isActive }) => <>
              <span className={`grid size-[22px] shrink-0 place-items-center transition-colors ${isActive ? 'text-[#9be2c5]' : 'text-[#82918f] group-hover:text-[#c5d2ca]'}`}><SidebarIcon name={icon} strokeWidth={isActive ? 2.2 : 1.8}/></span>
              {!visualCollapsed && <><span className="whitespace-nowrap">{name}</span>{isActive && <span className="ml-auto size-1.5 rounded-full bg-[#9be2c5] shadow-[0_0_9px_rgba(155,226,197,0.5)]"/>}</>}
            </>}
          </NavLink>)}
      </nav>

      <div className="mt-auto">
        {!visualCollapsed && <div className="mb-3 flex items-center gap-[10px] rounded-[9px] border border-[#2b3933] bg-gradient-to-br from-[#1d2b25] to-[#18211f] px-[10px] py-[11px]">
          <span className="grid size-7 shrink-0 place-items-center rounded-lg border border-[#3c5848] bg-[#23372c] text-sm text-[#a5e7c4]">✳</span>
          <span className="grid gap-[3px]"><strong className="text-[9px] font-medium text-[#cbdad0]">Make room for progress.</strong><small className="text-[8px] text-[#7e8e85]">Small steps add up.</small></span>
        </div>}

        <div className={`flex min-w-0 items-center gap-[10px] border-t border-[#283238] px-[7px] py-[11px] ${visualCollapsed ? 'justify-center px-0' : ''}`}>
          <span className="relative grid size-8 shrink-0 place-items-center rounded-full border border-[#6a8f7b] bg-gradient-to-br from-[#475e52] to-[#33443d] font-[Manrope] text-[10px] font-semibold text-[#e4f2e9]">JD<span className="absolute bottom-0 right-[-1px] size-2 rounded-full border-2 border-[#11171b] bg-[#9be2c5]"/></span>
          {!visualCollapsed && <><span className="grid min-w-0 flex-1 gap-[3px]"><strong className="truncate text-[10px] font-semibold text-[#d9e1db]">John Doe</strong><small className="text-[8px] text-[#77847e]">Personal workspace</small></span><span aria-hidden="true" className="ml-auto tracking-widest text-[#7f8d88]">···</span></>}
        </div>

        <button className="hidden h-[34px] w-full items-center justify-center gap-[7px] rounded-lg border border-transparent text-[9px] text-[#788782] transition hover:border-[#2b373b] hover:bg-[#1b2429] hover:text-[#c2d0c7] md:flex" onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={collapsed ? 'Expand sidebar' : undefined}>
          <span className={`transition-transform ${visualCollapsed ? 'rotate-180' : ''}`}><SidebarIcon name="chevronLeft" size={17}/></span>{!visualCollapsed && <span>Collapse sidebar</span>}
        </button>
      </div>
    </aside>
  </>;
}
