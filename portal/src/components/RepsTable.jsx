import { useState } from 'react';
import { Card, ScoreBadge, StatusBadge } from './ui';
import { G, BK, WH } from '../constants';

export function RepsTable({ reports, setSelReport, setView }) {
    const [sortKey, setSortKey] = useState(null);
    const [sortDir, setSortDir] = useState('asc');

    const toggleSort = (key) => {
        if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortKey(key); setSortDir('asc'); }
    };

    const sorted = sortKey ? [...reports].sort((a, b) => {
        const av = (a[sortKey] || '').toLowerCase();
        const bv = (b[sortKey] || '').toLowerCase();
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    }) : reports;

    const cols = [
        { label: "Date", key: "date" },
        { label: "Location", key: "location" },
        { label: "Assigned To", key: "assignedTo" },
        { label: "Submitted By", key: "submittedBy" },
        { label: "Score", key: null },
        { label: "Status", key: null },
        { label: "", key: null },
    ];

    return (
        <Card style={{ padding: 0, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                    <tr style={{ borderBottom: "2px solid #f0e0e0", background: "#fdf5f5" }}>
                        {cols.map(col => (
                            <th key={col.label}
                                onClick={col.key ? () => toggleSort(col.key) : undefined}
                                style={{ padding: "11px 14px", textAlign: "left", fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase", color: sortKey === col.key ? BK : G, fontWeight: "700", cursor: col.key ? "pointer" : "default", userSelect: "none", whiteSpace: "nowrap" }}>
                                {col.label}
                                {col.key && (
                                    <span style={{ marginLeft: "4px", opacity: sortKey === col.key ? 1 : 0.3 }}>
                                        {sortKey === col.key ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
                                    </span>
                                )}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {sorted.map((r, i) => (
                        <tr key={r.id} style={{ borderBottom: i < sorted.length - 1 ? "1px solid #f5e8e8" : "none" }} onMouseEnter={e => e.currentTarget.style.background = "#fdf5f5"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                            <td style={{ padding: "12px 14px", fontSize: "14px", color: "#555" }}>{r.date}</td>
                            <td style={{ padding: "12px 14px", fontSize: "14px", color: "#555" }}>{r.location || "—"}</td>
                            <td style={{ padding: "12px 14px", fontSize: "14px", color: BK, fontWeight: "600" }}>{r.assignedTo || "—"}</td>
                            <td style={{ padding: "12px 14px", fontSize: "14px", color: "#555" }}>{r.submittedBy || "—"}</td>
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
