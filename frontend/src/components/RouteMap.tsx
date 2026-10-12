import { milestones } from '../data/roadmap';

export default function RouteMap() {
  return <section className="panel route-panel" id="roadmap">
    <div className="section-heading"><div><div className="eyebrow">THE MASTER ROUTE <span className="live-dot"/></div><h2>From curious to capable.</h2><p className="section-sub">Your next few steps, mapped out.</p></div><button className="quiet-button">View full roadmap <span>↗</span></button></div>
    <div className="route-line" aria-label="Engineering milestone roadmap">{milestones.map((m,i)=><article className={`milestone ${m.status}`} key={m.id}><div className="node-wrap"><span className="route-node">{m.status==='completed'?'✓':m.icon}</span>{i < milestones.length-1 && <span className="connector"/>}</div><div className="milestone-date">{m.date}</div><h3>{m.title}</h3><div className="milestone-domain">{m.domain}</div><span className={`status-pill ${m.status}`}>{m.status === 'in-progress' ? 'IN PROGRESS' : m.status.toUpperCase()}</span></article>)}</div>
    <div className="route-footer"><span><i className="live-dot"/> CURRENT FOCUS</span><strong>Close the loop: motor speed control</strong><span className="route-progress">2 of 8 milestones complete</span></div>
  </section>;
}
