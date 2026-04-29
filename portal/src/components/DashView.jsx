import { useState } from 'react';
import { Card, sh, ghos } from './ui';
import { RepsTable } from './RepsTable';
import { G, BK, WH } from '../constants';

const LOCATIONS = [
    { name: 'Richardson', address: '888 S Greenville Ave Suite 220, Richardson, TX 75081' },
    { name: 'Fort Worth', address: '750 W Bonds Ranch Rd, Fort Worth, TX 76131' },
    { name: 'Haslet', address: null },
];

function locStats(reports, loc) {
    const reps = reports.filter(r => r.location === loc);
    if (reps.length === 0) return null;
    const latest = reps[0];
    return { count: reps.length, lastScore: latest.score, lastDate: latest.date };
}

function buildActivity(comps, tasks) {
    const byPerson = {};
    Object.entries(comps || {}).forEach(([taskId, val]) => {
        if (!val) return;
        const name = typeof val === 'string' ? val : 'Staff';
        const task = tasks?.find(t => String(t.id) === String(taskId));
        if (!task) return;
        if (!byPerson[name]) byPerson[name] = [];
        byPerson[name].push({ label: task.task, time: task.time });
    });
    return byPerson;
}

const TIME_COLOR = { Opening: '#1d4ed8', 'Mid-Day': '#92400e', Closing: '#6b21a8' };
const TIME_BG = { Opening: '#dbeafe', 'Mid-Day': '#fef3c7', Closing: '#f3e8ff' };

const TH = { padding: '10px 14px', textAlign: 'left', fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#64748b', fontWeight: '700', whiteSpace: 'nowrap' };

function ActivityRow({ name, items, date, isLast }) {
    const [open, setOpen] = useState(false);
    return (
        <>
            <tr style={{ borderBottom: !isLast || open ? '1px solid #f1f5f9' : 'none' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td style={{ padding: '12px 14px', fontSize: '14px', color: BK, fontWeight: '700' }}>{name}</td>
                <td style={{ padding: '12px 14px', fontSize: '13px', color: '#64748b' }}>{date}</td>
                <td style={{ padding: '12px 14px' }}>
                    <span style={{ padding: '3px 10px', background: 'rgba(0,138,95,0.08)', color: G, borderRadius: '20px', fontSize: '12px', fontWeight: '700' }}>{items.length} task{items.length !== 1 ? 's' : ''}</span>
                </td>
                <td style={{ padding: '12px 14px' }}>
                    <button onClick={() => setOpen(o => !o)} style={{ background: open ? G : 'transparent', border: `1.5px solid ${G}`, borderRadius: '6px', color: open ? WH : G, fontSize: '11px', padding: '5px 12px', cursor: 'pointer', fontWeight: '700', fontFamily: 'system-ui,sans-serif', transition: 'all 0.15s' }}>
                        {open ? 'Hide' : 'View'}
                    </button>
                </td>
            </tr>
            {open && (
                <tr style={{ borderBottom: !isLast ? '1px solid #f1f5f9' : 'none', background: '#f8fafc' }}>
                    <td colSpan={4} style={{ padding: '10px 18px 14px' }}>
                        {items.map((item, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', borderBottom: i < items.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                                <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '8px', background: TIME_BG[item.time] || '#f1f5f9', color: TIME_COLOR[item.time] || '#64748b', fontWeight: '700', flexShrink: 0 }}>{item.time}</span>
                                <span style={{ fontSize: '13px', color: '#334155' }}>{item.label}</span>
                            </div>
                        ))}
                    </td>
                </tr>
            )}
        </>
    );
}

export function DashView({ reports, setView, setSelReport, hasletAddress, user, dailyTasks, todayCompletions, canViewReports, locationComps }) {

    // ── Staff dashboard ──
    if (!canViewReports) {
        const total = dailyTasks ? dailyTasks.length : 0;
        const done = Object.values(todayCompletions || {}).filter(Boolean).length;
        const pct = total > 0 ? Math.round((done / total) * 100) : 0;
        const allDone = total > 0 && done === total;
        const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        return (
            <div style={{ maxWidth: '560px' }}>
                <Card style={{ marginBottom: '20px', borderTop: `4px solid ${allDone ? '#16a34a' : G}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '14px' }}>
                        <span style={{ fontSize: '14px', fontWeight: '700', color: BK }}>Today's Progress</span>
                        <span style={{ fontSize: '20px', fontWeight: '900', color: allDone ? '#16a34a' : G }}>{pct}%</span>
                    </div>
                    <div style={{ height: '10px', background: '#f1f5f9', borderRadius: '99px', overflow: 'hidden', marginBottom: '10px' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: allDone ? '#16a34a' : `linear-gradient(90deg, ${G}, #00c47a)`, borderRadius: '99px', transition: 'width 0.4s ease' }} />
                    </div>
                    <div style={{ fontSize: '13px', color: allDone ? '#166534' : '#64748b', fontWeight: allDone ? '700' : '400' }}>
                        {allDone ? 'All tasks completed for today!' : `${done} of ${total} tasks done — ${total - done} remaining`}
                    </div>
                </Card>

                {allDone && (
                    <div style={{ padding: '28px', background: '#f0fdf4', border: '2px solid #86efac', borderRadius: '16px', textAlign: 'center' }}>
                        <div style={{ fontSize: '20px', fontWeight: '900', color: '#166534', marginBottom: '6px' }}>All Done!</div>
                        <div style={{ fontSize: '13px', color: '#374151', marginBottom: '2px' }}>{today}</div>
                        <div style={{ fontSize: '13px', color: '#6b7280' }}>{done} tasks · {user.location}</div>
                    </div>
                )}

                {!allDone && (
                    <button onClick={() => setView('daily')} style={{ ...ghos, marginTop: '8px' }}>Go to Daily Tasks →</button>
                )}
            </div>
        );
    }

    // ── Owner / Manager dashboard ──
    const needsReview = reports.filter(r => r.status === 'Needs Review').length;
    const visibleLocations = user?.role !== 'Owner'
        ? LOCATIONS.filter(loc => loc.name === user.location)
        : LOCATIONS;

    return (
        <div>
            {needsReview > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', padding: '16px 22px', background: '#991b1b', borderRadius: '14px', boxShadow: '0 4px 16px rgba(153,27,27,0.25)' }}>
                    <div style={{ width: '48px', height: '48px', background: 'rgba(255,255,255,0.15)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: '22px', fontWeight: '900', color: WH }}>{needsReview}</span>
                    </div>
                    <div>
                        <div style={{ fontSize: '15px', fontWeight: '800', color: WH }}>Inspection{needsReview !== 1 ? 's' : ''} Need{needsReview === 1 ? 's' : ''} Review</div>
                        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.75)', marginTop: '2px' }}>Open Inspection Reports to review and mark as complete</div>
                    </div>
                </div>
            )}

            <div style={sh}>Score by Location</div>
            <div style={{ display: 'flex', gap: '14px', marginBottom: '32px', flexWrap: 'wrap' }}>
                {visibleLocations.map(loc => {
                    const ls = locStats(reports, loc.name);
                    const addr = loc.name === 'Haslet' ? hasletAddress : loc.address;
                    const scoreColor = ls ? (ls.lastScore >= 90 ? '#166534' : ls.lastScore >= 75 ? '#92400e' : '#991b1b') : '#94a3b8';
                    const barColor = ls ? (ls.lastScore >= 90 ? G : ls.lastScore >= 75 ? '#d97706' : '#dc2626') : '#e2e8f0';
                    const accentColor = ls ? (ls.lastScore >= 90 ? G : ls.lastScore >= 75 ? '#d97706' : '#dc2626') : '#e2e8f0';
                    return (
                        <Card key={loc.name} style={{ flex: 1, minWidth: '160px', borderTop: `4px solid ${accentColor}` }}>
                            <div style={{ fontSize: '13px', fontWeight: '800', color: BK, marginBottom: '2px' }}>{loc.name}</div>
                            {addr && <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '14px', lineHeight: 1.4 }}>{addr}</div>}
                            {!addr && <div style={{ marginBottom: '14px' }} />}
                            {ls ? (
                                <>
                                    <div style={{ fontSize: '34px', fontWeight: '900', color: scoreColor, lineHeight: 1, letterSpacing: '-0.02em' }}>{ls.lastScore}%</div>
                                    <div style={{ fontSize: '11px', color: '#94a3b8', margin: '5px 0 12px' }}>{ls.lastDate} · {ls.count} inspection{ls.count !== 1 ? 's' : ''}</div>
                                    <div style={{ height: '7px', borderRadius: '99px', background: '#f1f5f9', overflow: 'hidden' }}>
                                        <div style={{ height: '100%', width: `${ls.lastScore}%`, background: barColor, borderRadius: '99px', transition: 'width 0.4s ease' }} />
                                    </div>
                                </>
                            ) : (
                                <div style={{ fontSize: '13px', color: '#94a3b8' }}>No inspections yet</div>
                            )}
                        </Card>
                    );
                })}
            </div>

            <div style={{ ...sh, marginBottom: '14px' }}>Recent Inspections</div>
            <RepsTable reports={reports.slice(0, 5)} setSelReport={setSelReport} setView={setView} />
            {reports.length > 5 && <button onClick={() => setView('reports')} style={{ marginTop: '12px', ...ghos }}>View all reports →</button>}

            <div style={{ ...sh, marginBottom: '14px', marginTop: '32px' }}>Today's Staff Activity</div>
            {user?.role === 'Owner' ? (
                ['Richardson', 'Fort Worth', 'Haslet'].map(loc => {
                    const locTasks = dailyTasks?.filter(t => t.location === loc) || [];
                    const locTaskIds = new Set(locTasks.map(t => String(t.id)));
                    const locComps = locationComps?.[loc] || {};
                    const done = Object.entries(locComps).filter(([id, v]) => v && locTaskIds.has(id)).length;
                    const total = locTasks.length;
                    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                    const activity = buildActivity(locComps, locTasks);
                    const entries = Object.entries(activity);
                    return (
                        <div key={loc} style={{ marginBottom: '20px' }}>
                            <div style={{ fontSize: '13px', fontWeight: '800', color: BK, marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>{loc}</span>
                                <span style={{ fontSize: '12px', fontWeight: '700', color: pct === 100 ? '#166534' : G, background: pct === 100 ? '#f0fdf4' : 'rgba(0,138,95,0.08)', padding: '3px 10px', borderRadius: '20px' }}>{done}/{total} — {pct}%</span>
                            </div>
                            <Card style={{ padding: 0, overflow: 'hidden' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '2px solid #f1f5f9', background: '#f8fafc' }}>
                                            <th style={TH}>Name</th>
                                            <th style={TH}>Date</th>
                                            <th style={TH}>Tasks Done</th>
                                            <th style={TH}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {entries.length === 0
                                            ? <tr><td colSpan={4} style={{ padding: '28px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>No activity recorded yet today</td></tr>
                                            : entries.map(([name, items], i) => (
                                                <ActivityRow key={name} name={name} items={items} date={new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} isLast={i === entries.length - 1} />
                                            ))
                                        }
                                    </tbody>
                                </table>
                            </Card>
                        </div>
                    );
                })
            ) : (() => {
                const taskIds = new Set((dailyTasks || []).map(t => String(t.id)));
                const done = Object.entries(todayCompletions || {}).filter(([id, v]) => v && taskIds.has(id)).length;
                const total = taskIds.size;
                const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                const activity = buildActivity(todayCompletions, dailyTasks);
                const entries = Object.entries(activity);
                return (
                    <>
                        <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'flex-end' }}>
                            <span style={{ fontSize: '12px', fontWeight: '700', color: pct === 100 ? '#166534' : G, background: pct === 100 ? '#f0fdf4' : 'rgba(0,138,95,0.08)', padding: '3px 10px', borderRadius: '20px' }}>{done}/{total} — {pct}%</span>
                        </div>
                        <Card style={{ padding: 0, overflow: 'hidden' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid #f1f5f9', background: '#f8fafc' }}>
                                        <th style={TH}>Name</th>
                                        <th style={TH}>Date</th>
                                        <th style={TH}>Tasks Done</th>
                                        <th style={TH}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {entries.length === 0
                                        ? <tr><td colSpan={4} style={{ padding: '28px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>No activity recorded yet today</td></tr>
                                        : entries.map(([name, items], i) => (
                                            <ActivityRow key={name} name={name} items={items} date={new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} isLast={i === entries.length - 1} />
                                        ))
                                    }
                                </tbody>
                            </table>
                        </Card>
                    </>
                );
            })()}
        </div>
    );
}
