import { useState } from 'react';
import { Card, sh, inp, gbtn, ghos } from './ui';
import { G, WH, BK, TIMES, CATS, CC } from '../constants';

export function DailyView({ dailyTasks, onAdd, onRemove, onEdit, completions, setCompletions, canManageTasks, isOwner, user }) {
    const [adding, setAdding] = useState(false);
    const [newTask, setNewTask] = useState({ task: '', time: 'Opening', category: 'Sanitation' });
    const [editId, setEditId] = useState(null);
    const [editVal, setEditVal] = useState({});
    const [locationFilter, setLocationFilter] = useState('All');

    const LOCATIONS_LIST = ['Richardson', 'Fort Worth', 'Haslet'];
    const visibleTasks = isOwner && locationFilter !== 'All'
        ? dailyTasks.filter(t => t.location === locationFilter)
        : dailyTasks;

    const toggle = (id) => setCompletions({ ...completions, [id]: completions[id] ? false : (user?.name || true) });
    const addTask = () => {
        if (!newTask.task.trim()) return;
        onAdd(newTask);
        setNewTask({ task: '', time: 'Opening', category: 'Sanitation' });
        setAdding(false);
    };
    const save = (id) => { onEdit(id, editVal); setEditId(null); };

    const done = Object.values(completions).filter(Boolean).length;
    const pct = visibleTasks.length > 0 ? Math.round((done / visibleTasks.length) * 100) : 0;

    return (
        <div style={{ maxWidth: '800px' }}>
            {isOwner && (
                <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Location</span>
                    {['All', ...LOCATIONS_LIST].map(loc => (
                        <button key={loc} onClick={() => setLocationFilter(loc)}
                            style={{ padding: '6px 14px', borderRadius: '20px', border: '1.5px solid', fontSize: '12px', cursor: 'pointer', fontWeight: '600', fontFamily: 'system-ui,sans-serif', background: locationFilter === loc ? G : 'transparent', borderColor: locationFilter === loc ? G : '#e2e8f0', color: locationFilter === loc ? WH : '#64748b', transition: 'all 0.15s' }}>
                            {loc}
                        </button>
                    ))}
                </div>
            )}

            {/* Progress */}
            <Card style={{ marginBottom: '24px', borderTop: `4px solid ${pct === 100 ? '#16a34a' : G}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '12px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '700', color: BK }}>Today's Progress</span>
                    <span style={{ fontSize: '22px', fontWeight: '900', color: pct === 100 ? '#16a34a' : G, letterSpacing: '-0.02em' }}>{pct}%</span>
                </div>
                <div style={{ height: '10px', background: '#f1f5f9', borderRadius: '99px', overflow: 'hidden', marginBottom: '8px' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#16a34a' : `linear-gradient(90deg, ${G}, #00c47a)`, borderRadius: '99px', transition: 'width 0.4s ease' }} />
                </div>
                <div style={{ fontSize: '12px', color: pct === 100 ? '#166534' : '#64748b', fontWeight: pct === 100 ? '700' : '400' }}>
                    {pct === 100 ? 'All tasks completed!' : `${done} of ${visibleTasks.length} completed`}
                </div>
            </Card>

            {TIMES.map(time => {
                const group = visibleTasks.filter(t => t.time === time);
                if (!group.length) return null;
                return (
                    <div key={time} style={{ marginBottom: '24px' }}>
                        <div style={sh}>{time}</div>
                        {group.map(t => {
                            const isDone = !!completions[t.id];
                            const isEdit = editId === t.id;
                            return (
                                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', marginBottom: '6px', background: isDone ? '#f0fdf4' : WH, border: `1.5px solid ${isDone ? '#86efac' : '#e2e8f0'}`, borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', transition: 'all 0.15s' }}>
                                    <button onClick={() => toggle(t.id)} style={{ width: '24px', height: '24px', borderRadius: '7px', border: isDone ? `2px solid ${G}` : '2px solid #e2e8f0', background: isDone ? G : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '13px', color: WH, fontWeight: '900', transition: 'all 0.15s', fontFamily: 'system-ui,sans-serif' }}>{isDone ? '✓' : ''}</button>
                                    {isEdit && canManageTasks ? (
                                        <div style={{ flex: 1, display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                            <input value={editVal.task || ''} onChange={e => setEditVal(p => ({ ...p, task: e.target.value }))} style={{ ...inp, flex: 1, minWidth: '160px' }} />
                                            <select value={editVal.category || t.category} onChange={e => setEditVal(p => ({ ...p, category: e.target.value }))} style={inp}>
                                                {CATS.map(c => <option key={c}>{c}</option>)}
                                            </select>
                                            <select value={editVal.time || t.time} onChange={e => setEditVal(p => ({ ...p, time: e.target.value }))} style={inp}>
                                                {TIMES.map(tm => <option key={tm}>{tm}</option>)}
                                            </select>
                                            <button onClick={() => save(t.id)} style={{ ...gbtn, padding: '8px 14px', fontSize: '12px' }}>Save</button>
                                            <button onClick={() => setEditId(null)} style={{ ...ghos, padding: '8px 10px', fontSize: '12px' }}>✕</button>
                                        </div>
                                    ) : (
                                        <>
                                            <span style={{ flex: 1, fontSize: '14px', color: isDone ? '#94a3b8' : BK, textDecoration: isDone ? 'line-through' : 'none', transition: 'color 0.15s' }}>{t.task}</span>
                                            <span style={{ fontSize: '10px', padding: '3px 9px', borderRadius: '12px', background: `${CC[t.category]}18`, color: CC[t.category], border: `1px solid ${CC[t.category]}40`, fontWeight: '700', flexShrink: 0 }}>{t.category}</span>
                                            {canManageTasks && <button onClick={() => { setEditId(t.id); setEditVal({ task: t.task, category: t.category, time: t.time }); }} style={{ padding: '4px 10px', background: WH, border: '1.5px solid #e2e8f0', borderRadius: '6px', color: '#64748b', fontSize: '11px', cursor: 'pointer', fontWeight: '600', fontFamily: 'system-ui,sans-serif' }}>Edit</button>}
                                            {canManageTasks && <button onClick={() => onRemove(t.id)} style={{ padding: '4px 10px', background: '#fff5f5', border: '1.5px solid #fca5a5', borderRadius: '6px', color: '#991b1b', fontSize: '11px', cursor: 'pointer', fontWeight: '600', fontFamily: 'system-ui,sans-serif' }}>✕</button>}
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                );
            })}

            {canManageTasks && (adding ? (
                <Card style={{ border: `2px dashed ${G}` }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '8px', marginBottom: '12px' }}>
                        <input value={newTask.task} onChange={e => setNewTask(p => ({ ...p, task: e.target.value }))} placeholder="Task description…" style={{ ...inp, width: '100%' }} onKeyDown={e => e.key === 'Enter' && addTask()} autoFocus />
                        <select value={newTask.time} onChange={e => setNewTask(p => ({ ...p, time: e.target.value }))} style={inp}>
                            {TIMES.map(t => <option key={t}>{t}</option>)}
                        </select>
                        <select value={newTask.category} onChange={e => setNewTask(p => ({ ...p, category: e.target.value }))} style={inp}>
                            {CATS.map(c => <option key={c}>{c}</option>)}
                        </select>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={addTask} style={gbtn}>Add Task</button>
                        <button onClick={() => setAdding(false)} style={ghos}>Cancel</button>
                    </div>
                </Card>
            ) : (
                <button onClick={() => setAdding(true)} style={{ marginTop: '8px', padding: '11px 20px', background: WH, border: `2px dashed ${G}`, borderRadius: '10px', color: G, fontSize: '13px', cursor: 'pointer', fontWeight: '700', fontFamily: 'system-ui,sans-serif', width: '100%' }}>＋ Add New Task</button>
            ))}
        </div>
    );
}
