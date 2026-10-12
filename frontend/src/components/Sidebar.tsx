const primary: ReadonlyArray<readonly [icon: string, label: string, href: string]> = [
  ['⌂', 'Overview', '#planner'], ['⌘', 'Roadmaps', '#roadmaps'], ['◷', 'Upcoming', '#upcoming'], ['✳', 'Recent progress', '#activity'],
];

export default function Sidebar() {
  return <aside className="sidebar planner-sidebar">
    <a className="brand" href="#planner"><span className="brand-mark">f.</span><span>fieldnotes<small>ENGINEERING OS</small></span></a>
    <div className="side-label">WORKSPACE</div>
    <nav aria-label="Planner navigation">{primary.map(([icon, label, href], index) => <a className={`nav-item ${index === 0 ? 'active' : ''}`} href={href} key={label} aria-current={index === 0 ? 'page' : undefined}><span className="nav-icon">{icon}</span>{label}</a>)}</nav>
    <div className="side-label domains-label">YOUR PRACTICE</div>
    <nav className="domain-nav" aria-label="Engineering domains"><a href="#roadmaps"><i className="dot mint-dot"/>Mechanical</a><a href="#roadmaps"><i className="dot amber-dot"/>Electrical</a><a href="#roadmaps"><i className="dot violet-dot"/>Embedded systems</a><a href="#roadmaps"><i className="dot blue-dot"/>Software</a></nav>
    <div className="sidebar-bottom"><div className="streak-card"><div className="streak-top"><span>✳</span><span className="streak-value">ONE <small>STEP AT A TIME</small></span></div><p>Small steps, serious momentum.</p><div className="streak-bars"><i className="bar-on"/><i className="bar-on"/><i className="bar-on"/><i/><i/><i/><i/></div></div><div className="profile"><span className="avatar">J</span><span>Jordan Kim<small>Mechatronics engineer</small></span></div></div>
  </aside>;
}
