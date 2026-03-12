import React from 'react';
import { RepsTable } from './RepsTable';
import { G, WH, BK } from '../constants';

export function RepsView({ reports, filterStatus, setFilterStatus, setSelReport, setView }) {
    const ss = ["All", "Completed", "Needs Review", "In Progress"];
    const filtered = filterStatus === "All" ? reports : reports.filter(r => r.status === filterStatus);
    return (
        <div>
            <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap", alignItems: "center" }}>
                {ss.map(s => (
                    <button key={s} onClick={() => setFilterStatus(s)} style={{ padding: "7px 16px", background: filterStatus === s ? G : WH, border: filterStatus === s ? `1.5px solid ${G}` : "1.5px solid #ddd", borderRadius: "20px", color: filterStatus === s ? WH : BK, fontSize: "13px", cursor: "pointer", fontWeight: filterStatus === s ? "700" : "400" }}>{s}</button>
                ))}
                <div style={{ marginLeft: "auto", fontSize: "12px", color: "#999" }}>{filtered.length} report{filtered.length !== 1 ? "s" : ""}</div>
            </div>
            <RepsTable reports={filtered} setSelReport={setSelReport} setView={setView} />
        </div>
    );
}
