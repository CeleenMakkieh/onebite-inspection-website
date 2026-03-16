import { useState } from 'react';
import { Card, sh, inp, gbtn, ghos } from './ui';
import { G, WH, BK, TIMES, CATS, CC } from '../constants';

export function DailyView({ dailyTasks, onAdd, onRemove, onEdit, completions, setCompletions, canManageTasks, isOwner, user }) {
    const [adding, setAdding] = useState(false);
    const [newTask, setNewTask] = useState({ task: "", time: "Opening", category: "Sanitation" });
    const [editId, setEditId] = useState(null);
    const [editVal, setEditVal] = useState({});
    const [locationFilter, setLocationFilter] = useState("All");

    const LOCATIONS_LIST = ["Richardson", "Fort Worth", "Haslet"];
    const visibleTasks = isOwner && locationFilter !== "All"
        ? dailyTasks.filter(t => t.location === locationFilter)
        : dailyTasks;

    const toggle = (id) => setCompletions({ ...completions, [id]: completions[id] ? false : (user?.name || true) });
    const addTask = () => {
        if (!newTask.task.trim()) return;
        onAdd(newTask);
        setNewTask({ task: "", time: "Opening", category: "Sanitation" });
        setAdding(false);
    };
    const save = (id) => {
        onEdit(id, editVal);
        setEditId(null);
    };

    const done = Object.values(completions).filter(Boolean).length;
    const pct = visibleTasks.length > 0 ? Math.round((done / visibleTasks.length) * 100) : 0;

    return (
        <div style={{ maxWidth: "800px" }}>
            {isOwner && (
                <div style={{ marginBottom: "16px", display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "13px", fontWeight: "600", color: BK }}>Location:</span>
                    {["All", ...LOCATIONS_LIST].map(loc => (
                        <button key={loc} onClick={() => setLocationFilter(loc)}
                            style={{ padding: "5px 12px", borderRadius: "16px", border: "1.5px solid", fontSize: "12px", cursor: "pointer", fontWeight: "600", fontFamily: "system-ui,sans-serif", background: locationFilter === loc ? G : "transparent", borderColor: locationFilter === loc ? G : "#ccc", color: locationFilter === loc ? WH : "#555" }}>
                            {loc}
                        </button>
                    ))}
                </div>
            )}
            <Card style={{ marginBottom: "22px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                    <span style={{ fontSize: "14px", fontWeight: "600", color: BK }}>Today's Progress</span>
                    <span style={{ fontSize: "14px", color: pct === 100 ? "#166534" : G, fontWeight: "700" }}>{done} / {visibleTasks.length} — {pct}%</span>
                </div>
                <div style={{ height: "10px", background: "#f0e8e8", borderRadius: "5px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: pct === 100 ? "#16a34a" : G, borderRadius: "5px", transition: "width 0.3s" }} />
                </div>
            </Card>

            {TIMES.map(time => {
                const group = visibleTasks.filter(t => t.time === time);
                if (!group.length) return null;
                return (
                    <div key={time} style={{ marginBottom: "22px" }}>
                        <div style={sh}>{time}</div>
                        {group.map(t => {
                            const isDone = !!completions[t.id];
                            const isEdit = editId === t.id;
                            return (
                                <div key={t.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "11px 14px", marginBottom: "5px", background: isDone ? "#f0fdf4" : WH, border: isDone ? "1.5px solid #86efac" : "1.5px solid #ececec", borderRadius: "8px" }}>
                                    <button onClick={() => toggle(t.id)} style={{ width: "22px", height: "22px", borderRadius: "6px", border: isDone ? `2px solid ${G}` : "2px solid #ccc", background: isDone ? G : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "13px", color: WH, fontWeight: "800" }}>{isDone ? "✓" : ""}</button>
                                    {isEdit && canManageTasks ? (
                                        <div style={{ flex: 1, display: "flex", gap: "6px", flexWrap: "wrap" }}>
                                            <input value={editVal.task || ""} onChange={e => setEditVal(p => ({ ...p, task: e.target.value }))} style={{ ...inp, flex: 1, minWidth: "160px" }} />
                                            <select value={editVal.category || t.category} onChange={e => setEditVal(p => ({ ...p, category: e.target.value }))} style={inp}>
                                                {CATS.map(c => <option key={c}>{c}</option>)}
                                            </select>
                                            <select value={editVal.time || t.time} onChange={e => setEditVal(p => ({ ...p, time: e.target.value }))} style={inp}>
                                                {TIMES.map(tm => <option key={tm}>{tm}</option>)}
                                            </select>
                                            <button onClick={() => save(t.id)} style={{ ...gbtn, padding: "7px 12px", fontSize: "12px" }}>Save</button>
                                            <button onClick={() => setEditId(null)} style={{ ...ghos, padding: "7px 10px", fontSize: "12px" }}>✕</button>
                                        </div>
                                    ) : (
                                        <>
                                            <span style={{ flex: 1, fontSize: "14px", color: isDone ? "#999" : BK, textDecoration: isDone ? "line-through" : "none" }}>{t.task}</span>
                                            <span style={{ fontSize: "10px", padding: "3px 8px", borderRadius: "12px", background: `${CC[t.category]}18`, color: CC[t.category], border: `1px solid ${CC[t.category]}40`, fontWeight: "700", flexShrink: 0 }}>{t.category}</span>
                                            {canManageTasks && <button onClick={() => { setEditId(t.id); setEditVal({ task: t.task, category: t.category, time: t.time }); }} style={{ padding: "4px 10px", background: WH, border: "1.5px solid #ddd", borderRadius: "6px", color: "#555", fontSize: "11px", cursor: "pointer", fontWeight: "600" }}>Edit</button>}
                                            {canManageTasks && <button onClick={() => onRemove(t.id)} style={{ padding: "4px 10px", background: "#fff5f5", border: "1.5px solid #fca5a5", borderRadius: "6px", color: "#991b1b", fontSize: "11px", cursor: "pointer", fontWeight: "600" }}>✕</button>}
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                );
            })}

            {canManageTasks && (adding ? (
                <Card style={{ border: `1.5px dashed ${G}` }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: "8px", marginBottom: "10px" }}>
                        <input value={newTask.task} onChange={e => setNewTask(p => ({ ...p, task: e.target.value }))} placeholder="Task description…" style={{ ...inp, width: "100%" }} onKeyDown={e => e.key === "Enter" && addTask()} />
                        <select value={newTask.time} onChange={e => setNewTask(p => ({ ...p, time: e.target.value }))} style={inp}>
                            {TIMES.map(t => <option key={t}>{t}</option>)}
                        </select>
                        <select value={newTask.category} onChange={e => setNewTask(p => ({ ...p, category: e.target.value }))} style={inp}>
                            {CATS.map(c => <option key={c}>{c}</option>)}
                        </select>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                        <button onClick={addTask} style={gbtn}>Add Task</button>
                        <button onClick={() => setAdding(false)} style={ghos}>Cancel</button>
                    </div>
                </Card>
            ) : (
                <button onClick={() => setAdding(true)} style={{ marginTop: "8px", padding: "10px 18px", background: WH, border: `2px dashed ${G}`, borderRadius: "8px", color: G, fontSize: "13px", cursor: "pointer", fontWeight: "700" }}>＋ Add New Task</button>
            ))}
        </div>
    );
}
