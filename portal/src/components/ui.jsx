import React from 'react';
import { WH, G, BK } from '../constants';

export function Card({ children, style = {} }) {
    return <div style={{ background: WH, borderRadius: "12px", padding: "20px 24px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", border: `1px solid rgba(0,138,95,0.1)`, ...style }}>{children}</div>;
}

export function ScoreBadge({ score }) {
    const c = score >= 90 ? "#166534" : score >= 75 ? "#92400e" : "#991b1b",
        bg = score >= 90 ? "#dcfce7" : score >= 75 ? "#fef3c7" : "#fee2e2",
        bd = score >= 90 ? "#86efac" : score >= 75 ? "#fcd34d" : "#fca5a5";
    return <span style={{ padding: "3px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "700", color: c, background: bg, border: `1px solid ${bd}` }}>{score}%</span>;
}

export function StatusBadge({ status }) {
    const m = {
        "Completed": { c: "#166534", bg: "#dcfce7", bd: "#86efac" },
        "Needs Review": { c: "#991b1b", bg: "#fee2e2", bd: "#fca5a5" },
        "In Progress": { c: "#92400e", bg: "#fef3c7", bd: "#fcd34d" }
    };
    const s = m[status] || m["In Progress"];
    return <span style={{ padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "700", color: s.c, background: s.bg, border: `1px solid ${s.bd}`, textTransform: "uppercase" }}>{status}</span>;
}

export function PFBtns({ result, onPass, onFail, onClear }) {
    return (
        <div style={{ display: 'flex', gap: '4px' }}>
            <button onClick={onPass} style={{ padding: "5px 12px", borderRadius: "20px", background: result === "pass" ? "#dcfce7" : WH, border: result === "pass" ? "2px solid #16a34a" : "1.5px solid #ccc", color: result === "pass" ? "#166534" : "#666", fontSize: "11px", fontWeight: "700", cursor: "pointer" }}>PASS</button>
            <button onClick={onFail} style={{ padding: "5px 12px", borderRadius: "20px", background: result === "fail" ? "#fee2e2" : WH, border: result === "fail" ? "2px solid #dc2626" : "1.5px solid #ccc", color: result === "fail" ? "#991b1b" : "#666", fontSize: "11px", fontWeight: "700", cursor: "pointer" }}>FAIL</button>
            <button onClick={onClear} style={{ padding: "5px 6px", background: "transparent", border: "none", color: "#bbb", fontSize: "14px", cursor: "pointer" }}>✕</button>
        </div>
    );
}

export function CheckRow({ label, result, onPass, onFail, onClear }) {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", marginBottom: "5px", background: result === "pass" ? "#f0fdf4" : result === "fail" ? "#fef2f2" : "#fafafa", border: result === "pass" ? "1.5px solid #86efac" : result === "fail" ? "1.5px solid #fca5a5" : "1.5px solid #ececec", borderRadius: "8px" }}>
            <span style={{ flex: 1, fontSize: "14px", color: BK }}>{label}</span>
            <PFBtns result={result} onPass={onPass} onFail={onFail} onClear={onClear} />
        </div>
    );
}

export const inp = { background: WH, border: "1.5px solid #ccc", borderRadius: "6px", color: BK, padding: "8px 12px", fontSize: "14px", fontFamily: "system-ui,sans-serif", outline: "none", boxSizing: "border-box" };
export const lbl = { display: "block", fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", color: G, marginBottom: "5px", fontWeight: "700" };
export const sh = { fontSize: "11px", letterSpacing: "0.18em", textTransform: "uppercase", color: G, margin: "0 0 12px 0", paddingBottom: "8px", borderBottom: `2px solid ${G}`, fontWeight: "700" };
export const gbtn = { padding: "10px 22px", background: G, border: "none", borderRadius: "6px", color: WH, fontSize: "13px", fontWeight: "700", cursor: "pointer", fontFamily: "system-ui,sans-serif" };
export const ghos = { padding: "10px 16px", background: "transparent", border: "1.5px solid #ccc", borderRadius: "6px", color: "#555", fontSize: "13px", cursor: "pointer", fontFamily: "system-ui,sans-serif" };
