import { domains } from '../data/roadmap';

export default function DomainSkills() {
  return <section className="panel domains-panel" id="skill-trees">
    <div className="section-heading compact"><div><div className="eyebrow">YOUR SKILL TREES</div><h2>Build range. Find your edge.</h2></div><button className="icon-button" aria-label="More options">···</button></div>
    <div className="domain-grid">{domains.map((d)=><article className="domain-card" key={d.name}><div className="domain-card-top"><span className={`domain-glyph ${d.color}`}>{d.short}</span><button className="card-arrow" aria-label={`Open ${d.name}`}>↗</button></div><div className="domain-title-row"><h3>{d.name}</h3><span>{d.progress}%</span></div><div className="progress-track"><i className={d.color} style={{width:`${d.progress}%`}}/></div><div className="skill-list">{d.skills.map((s,i)=><div className="skill-row" key={s}><span className={`skill-check ${i===0?'checked':''}`}>{i===0?'✓':'·'}</span>{s}<span className="skill-chevron">›</span></div>)}</div></article>)}</div>
  </section>;
}
