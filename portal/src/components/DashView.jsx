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

export function DashView({ reports, setView, setSelReport, hasletAddress }) {
    const needsReview = reports.filter(r => r.status === "Needs Review").length;

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
                {LOCATIONS.map(loc => {
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
        </div>
    );
}
