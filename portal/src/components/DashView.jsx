import React from 'react';
import { Card, sh, ghos } from './ui';
import { RepsTable } from './RepsTable';
import { G, BK } from '../constants';

export function DashView({ reports, setView, setSelReport }) {
    const avg = reports.length > 0 ? Math.round(reports.reduce((a, r) => a + r.score, 0) / reports.length) : 0;
    const pass = reports.filter(r => r.score >= 75).length;
    const stats = [
        { l: "Total Inspections", v: reports.length, s: "All time" },
        { l: "Average Score", v: `${avg}%`, s: "Across all reports", a: true },
        { l: "Passing Rate", v: `${reports.length > 0 ? Math.round((pass / reports.length) * 100) : 0}%`, s: `${pass} of ${reports.length} passed` },
        { l: "Needs Review", v: reports.filter(r => r.status === "Needs Review").length, s: "Require attention" }
    ];

    return (
        <div>
            <div style={{ display: "flex", gap: "14px", marginBottom: "24px" }}>
                {stats.map(s => (
                    <Card key={s.l} style={{ flex: 1, borderTop: s.a ? `3px solid ${G}` : "3px solid transparent" }}>
                        <div style={{ fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", color: s.a ? G : "#888", marginBottom: "8px", fontWeight: "700" }}>{s.l}</div>
                        <div style={{ fontSize: "28px", fontWeight: "800", color: s.a ? G : BK, lineHeight: 1 }}>{s.v}</div>
                        <div style={{ fontSize: "12px", color: "#888", marginTop: "6px" }}>{s.s}</div>
                    </Card>
                ))}
            </div>
            <div style={{ ...sh, marginBottom: "14px" }}>Recent Inspections</div>
            <RepsTable reports={reports.slice(0, 5)} setSelReport={setSelReport} setView={setView} />
            {reports.length > 5 && <button onClick={() => setView("reports")} style={{ marginTop: "12px", ...ghos }}>View all reports →</button>}
        </div>
    );
}
