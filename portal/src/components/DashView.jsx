import { Card, sh, ghos } from './ui';
import { RepsTable } from './RepsTable';
import { G, BK, WH } from '../constants';

const LOCATIONS = [
    { name: "Richardson", address: "888 S Greenville Ave Suite 220, Richardson, TX 75081" },
    { name: "Fort Worth", address: "750 W Bonds Ranch Rd, Fort Worth, TX 76131" },
    { name: "Haslet", address: null },
];

function locStats(reports, loc) {
    const reps = reports.filter(r => r.location === loc);
    if (reps.length === 0) return null;
    const latest = reps[0]; // reports are ordered by date desc
    const lastScore = latest.score;
    const lastDate = latest.date;
    return { count: reps.length, lastScore, lastDate };
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

const TIME_COLOR = { Opening: "#1d4ed8", "Mid-Day": "#92400e", Closing: "#6b21a8" };
const TIME_BG = { Opening: "#dbeafe", "Mid-Day": "#fef3c7", Closing: "#f3e8ff" };

export function DashView({ reports, setView, setSelReport, hasletAddress, user, dailyTasks, todayCompletions, canViewReports, locationComps }) {

    // ── Staff dashboard: daily task completion report only ──
    if (!canViewReports) {
        const total = dailyTasks ? dailyTasks.length : 0;
        const done = Object.values(todayCompletions || {}).filter(Boolean).length;
        const pct = total > 0 ? Math.round((done / total) * 100) : 0;
        const allDone = total > 0 && done === total;
        const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

        return (
            <div>
                <div style={{ marginBottom: "14px" }}>
                    <div style={sh}>Today's Task Report</div>
                </div>
                <Card style={{ marginBottom: "20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                        <span style={{ fontSize: "14px", fontWeight: "600", color: BK }}>Daily Tasks Progress</span>
                        <span style={{ fontSize: "14px", color: pct === 100 ? "#166534" : G, fontWeight: "700" }}>{done} / {total} — {pct}%</span>
                    </div>
                    <div style={{ height: "10px", background: "#f0e8e8", borderRadius: "5px", overflow: "hidden", marginBottom: "10px" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: pct === 100 ? "#16a34a" : G, borderRadius: "5px", transition: "width 0.4s" }} />
                    </div>
                    {allDone
                        ? <div style={{ fontSize: "13px", color: "#166534", fontWeight: "700" }}>All tasks completed for today!</div>
                        : <div style={{ fontSize: "13px", color: "#888" }}>{total - done} task{(total - done) !== 1 ? "s" : ""} remaining</div>
                    }
                </Card>

                {allDone && (
                    <div style={{ padding: "24px", background: "#f0fdf4", border: "2px solid #86efac", borderRadius: "12px", textAlign: "center" }}>
                        <div style={{ fontSize: "18px", fontWeight: "800", color: "#166534", marginBottom: "6px" }}>Daily Tasks Complete!</div>
                        <div style={{ fontSize: "13px", color: "#555", marginBottom: "4px" }}>{today}</div>
                        <div style={{ fontSize: "13px", color: "#555" }}>{done} tasks completed · {user.location}</div>
                    </div>
                )}

                {!allDone && (
                    <button onClick={() => setView("daily")} style={{ marginTop: "8px", ...ghos }}>Go to Daily Tasks →</button>
                )}
            </div>
        );
    }

    // ── Owner / Manager dashboard ──
    const needsReview = reports.filter(r => r.status === "Needs Review").length;
    const visibleLocations = user && user.role !== 'Owner'
        ? LOCATIONS.filter(loc => loc.name === user.location)
        : LOCATIONS;

    return (
        <div>
            {/* ── NEEDS REVIEW BANNER ── */}
            {needsReview > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px", padding: "16px 20px", background: "#991b1b", borderRadius: "12px", boxShadow: "0 4px 12px rgba(153,27,27,0.25)" }}>
                    <div style={{ fontSize: "28px", fontWeight: "800", color: WH, lineHeight: 1, minWidth: "36px", textAlign: "center" }}>{needsReview}</div>
                    <div>
                        <div style={{ fontSize: "14px", fontWeight: "700", color: WH }}>Inspection{needsReview !== 1 ? "s" : ""} Need{needsReview === 1 ? "s" : ""} Review</div>
                        <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.75)", marginTop: "2px" }}>Open Inspection Reports to review and mark them as complete</div>
                    </div>
                </div>
            )}

            {/* ── BY LOCATION ── */}
            <div style={{ marginBottom: "14px" }}>
                <div style={sh}>Score by Location</div>
            </div>
            <div style={{ display: "flex", gap: "14px", marginBottom: "28px" }}>
                {visibleLocations.map(loc => {
                    const ls = locStats(reports, loc.name);
                    const addr = loc.name === "Haslet" ? hasletAddress : loc.address;
                    const scoreColor = ls ? (ls.lastScore >= 90 ? "#166534" : ls.lastScore >= 75 ? "#92400e" : "#991b1b") : "#aaa";
                    const barColor = ls ? (ls.lastScore >= 90 ? G : ls.lastScore >= 75 ? "#d97706" : "#dc2626") : "#e5e7eb";
                    return (
                        <Card key={loc.name} style={{ flex: 1 }}>
                            <div style={{ fontSize: "13px", fontWeight: "700", color: BK }}>{loc.name}</div>
                            {addr && <div style={{ fontSize: "10px", color: "#888", marginBottom: "10px", marginTop: "2px", lineHeight: 1.4 }}>{addr}</div>}
                            {!addr && <div style={{ marginBottom: "10px" }} />}
                            {ls ? (
                                <>
                                    <div style={{ fontSize: "30px", fontWeight: "800", color: scoreColor, lineHeight: 1 }}>{ls.lastScore}%</div>
                                    <div style={{ fontSize: "11px", color: "#888", margin: "4px 0 10px" }}>Last inspection · {ls.lastDate} · {ls.count} total</div>
                                    <div style={{ height: "6px", borderRadius: "3px", background: "#f0f0f0", overflow: "hidden" }}>
                                        <div style={{ height: "100%", width: `${ls.lastScore}%`, background: barColor, borderRadius: "3px", transition: "width 0.4s" }} />
                                    </div>
                                </>
                            ) : (
                                <div style={{ fontSize: "13px", color: "#aaa", fontStyle: "italic" }}>No inspections yet</div>
                            )}
                        </Card>
                    );
                })}
            </div>

            <div style={{ ...sh, marginBottom: "14px" }}>Recent Inspections</div>
            <RepsTable reports={reports.slice(0, 5)} setSelReport={setSelReport} setView={setView} />
            {reports.length > 5 && <button onClick={() => setView("reports")} style={{ marginTop: "12px", ...ghos }}>View all reports →</button>}

            {/* ── TODAY'S STAFF ACTIVITY ── */}
            <div style={{ ...sh, marginBottom: "14px", marginTop: "28px" }}>Today's Staff Activity</div>
            {user?.role === 'Owner' ? (
                ['Richardson', 'Fort Worth', 'Haslet'].map(loc => {
                    const locTasks = dailyTasks?.filter(t => t.location === loc) || [];
                    const locComps = locationComps?.[loc] || {};
                    const done = Object.values(locComps).filter(Boolean).length;
                    const total = locTasks.length;
                    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                    const activity = buildActivity(locComps, locTasks);
                    const entries = Object.entries(activity);
                    return (
                        <Card key={loc} style={{ marginBottom: "12px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                                <span style={{ fontSize: "13px", fontWeight: "700", color: BK }}>{loc}</span>
                                <span style={{ fontSize: "12px", fontWeight: "700", color: pct === 100 ? "#166534" : G }}>{done}/{total} — {pct}%</span>
                            </div>
                            {entries.length === 0
                                ? <div style={{ fontSize: "12px", color: "#aaa", fontStyle: "italic" }}>No activity yet today</div>
                                : entries.map(([name, items]) => (
                                    <div key={name} style={{ marginBottom: "10px" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "5px" }}>
                                            <span style={{ fontSize: "13px", fontWeight: "700", color: BK }}>{name}</span>
                                            <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "12px", background: "#e8f5f0", color: G, fontWeight: "700" }}>{items.length} task{items.length !== 1 ? "s" : ""}</span>
                                        </div>
                                        <div style={{ paddingLeft: "4px" }}>
                                            {items.map((item, i) => (
                                                <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px" }}>
                                                    <span style={{ fontSize: "10px", padding: "1px 6px", borderRadius: "8px", background: TIME_BG[item.time] || "#f0f0f0", color: TIME_COLOR[item.time] || "#555", fontWeight: "700", flexShrink: 0 }}>{item.time}</span>
                                                    <span style={{ fontSize: "12px", color: "#333" }}>{item.label}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))
                            }
                        </Card>
                    );
                })
            ) : (
                <Card>
                    {(() => {
                        const done = Object.values(todayCompletions || {}).filter(Boolean).length;
                        const total = dailyTasks?.length || 0;
                        const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                        const activity = buildActivity(todayCompletions, dailyTasks);
                        const entries = Object.entries(activity);
                        return (
                            <>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                                    <span style={{ fontSize: "13px", fontWeight: "600", color: BK }}>Daily Task Completion</span>
                                    <span style={{ fontSize: "13px", fontWeight: "700", color: pct === 100 ? "#166534" : G }}>{done}/{total} — {pct}%</span>
                                </div>
                                {entries.length === 0
                                    ? <div style={{ fontSize: "12px", color: "#aaa", fontStyle: "italic" }}>No activity yet today</div>
                                    : entries.map(([name, items]) => (
                                        <div key={name} style={{ marginBottom: "12px" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "5px" }}>
                                                <span style={{ fontSize: "13px", fontWeight: "700", color: BK }}>{name}</span>
                                                <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "12px", background: "#e8f5f0", color: G, fontWeight: "700" }}>{items.length} task{items.length !== 1 ? "s" : ""}</span>
                                            </div>
                                            <div style={{ paddingLeft: "4px" }}>
                                                {items.map((item, i) => (
                                                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px" }}>
                                                        <span style={{ fontSize: "10px", padding: "1px 6px", borderRadius: "8px", background: TIME_BG[item.time] || "#f0f0f0", color: TIME_COLOR[item.time] || "#555", fontWeight: "700", flexShrink: 0 }}>{item.time}</span>
                                                        <span style={{ fontSize: "12px", color: "#333" }}>{item.label}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))
                                }
                            </>
                        );
                    })()}
                </Card>
            )}
        </div>
    );
}
