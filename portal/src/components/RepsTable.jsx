import React from 'react';
import { Card, ScoreBadge, StatusBadge } from './ui';
import { G, BK, WH } from '../constants';

export function RepsTable({ reports, setSelReport, setView }) {
    return (
        <Card style={{ padding: 0, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                    <tr style={{ borderBottom: "2px solid #f0e0e0", background: "#fdf5f5" }}>
                        {["Date", "Assigned To", "Submitted By", "Score", "Status", ""].map(h => (
                            <th key={h} style={{ padding: "11px 14px", textAlign: "left", fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase", color: G, fontWeight: "700" }}>{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {reports.map((r, i) => (
                        <tr key={r.id} style={{ borderBottom: i < reports.length - 1 ? "1px solid #f5e8e8" : "none" }} onMouseEnter={e => e.currentTarget.style.background = "#fdf5f5"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                            <td style={{ padding: "12px 14px", fontSize: "14px", color: "#555" }}>{r.date}</td>
                            <td style={{ padding: "12px 14px", fontSize: "14px", color: BK, fontWeight: "600" }}>{r.assignedTo || "—"}</td>
                            <td style={{ padding: "12px 14px", fontSize: "14px", color: "#555" }}>{r.submittedBy}</td>
                            <td style={{ padding: "12px 14px" }}><ScoreBadge score={r.score} /></td>
                            <td style={{ padding: "12px 14px" }}><StatusBadge status={r.status} /></td>
                            <td style={{ padding: "12px 14px" }}>
                                <button onClick={() => { setSelReport(r); setView("detail"); }} style={{ background: G, border: "none", borderRadius: "6px", color: WH, fontSize: "11px", padding: "5px 12px", cursor: "pointer", fontWeight: "700" }}>View</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {reports.length === 0 && <div style={{ padding: "40px", textAlign: "center", color: "#bbb", fontSize: "14px" }}>No inspections yet</div>}
        </Card>
    );
}

