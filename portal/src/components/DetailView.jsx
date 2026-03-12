import { useState } from 'react';
import { Card, ScoreBadge, StatusBadge, lbl } from './ui';
import { G, BK } from '../constants';

export function DetailView({ report, onBack, tempItems = [], appliances = [], onReview }) {
    const [saving, setSaving] = useState(false);

    const getLabel = (key) => {
        const [prefix, id] = key.split("__");
        if (prefix === "TC") {
            const item = tempItems.find(t => String(t.id) === id);
            const reading = report.tempReadings?.[id];
            const readingStr = reading !== undefined && reading !== '' ? ` — reading: ${reading}°F` : '';
            return item ? `${item.name}${readingStr} (required: ${item.requiredTemp})` : key;
        }
        if (prefix === "AP") {
            const item = appliances.find(a => String(a.id) === id);
            const reading = report.applianceReadings?.[id];
            const readingStr = reading !== undefined && reading !== '' ? ` — reading: ${reading}°F` : '';
            return item ? `${item.name}${readingStr} (target: ${item.targetTemp})` : key;
        }
        return id;
    };
    const failed = Object.entries(report.results).filter(([, v]) => v === "fail").map(([k]) => ({ key: k, label: getLabel(k) }));

    const handleReview = async () => {
        setSaving(true);
        await onReview(report);
        setSaving(false);
    };
    return (
        <div style={{ maxWidth: "720px" }}>
            <button onClick={onBack} style={{ background: "transparent", border: "none", color: G, fontSize: "14px", cursor: "pointer", padding: "0 0 18px", fontWeight: "700", fontFamily: "system-ui,sans-serif" }}>← Back to Reports</button>
            <div style={{ display: "flex", gap: "14px", alignItems: "flex-start", marginBottom: "20px" }}>
                <div style={{ flex: 1 }}>
                    <h2 style={{ margin: "0 0 6px", fontSize: "22px", color: G, fontWeight: "800" }}>Inspection — {report.date}</h2>
                    <div style={{ fontSize: "14px", color: "#555" }}>
                        Assigned to <strong style={{ color: BK }}>{report.assignedTo || "—"}</strong> · Submitted by <strong style={{ color: BK }}>{report.submittedBy}</strong>
                    </div>
                </div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <ScoreBadge score={report.score} />
                    <StatusBadge status={report.status} />
                </div>
            </div>
            {failed.length > 0 && (
                <Card style={{ marginBottom: "14px", border: "1.5px solid #fca5a5", background: "#fff5f5" }}>
                    <div style={{ fontSize: "12px", letterSpacing: "0.12em", textTransform: "uppercase", color: "#991b1b", fontWeight: "700", marginBottom: "10px" }}>⚠ Failed Items ({failed.length})</div>
                    {failed.map(({ key, label }) => <div key={key} style={{ fontSize: "13px", color: "#991b1b", marginBottom: "5px" }}>• {label}</div>)}
                </Card>
            )}
            {report.notes && (
                <Card>
                    <div style={{ ...lbl, marginBottom: "8px" }}>Notes</div>
                    <p style={{ margin: 0, fontSize: "14px", color: "#444", lineHeight: 1.7 }}>{report.notes}</p>
                </Card>
            )}
            {report.status === "Needs Review" && (
                <div style={{ marginTop: "24px" }}>
                    <button
                        onClick={handleReview}
                        disabled={saving}
                        style={{ padding: "14px 32px", background: G, color: "#fff", border: "none", borderRadius: "10px", fontSize: "14px", fontWeight: "700", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, fontFamily: "system-ui,sans-serif" }}
                    >
                        {saving ? "Saving…" : "✓ Mark as Reviewed"}
                    </button>
                    <div style={{ fontSize: "12px", color: "#888", marginTop: "8px" }}>This will remove it from the Needs Review count on the dashboard.</div>
                </div>
            )}
            {report.status === "Reviewed" && (
                <div style={{ marginTop: "24px", padding: "12px 16px", background: "#dcfce7", border: "1px solid #86efac", borderRadius: "10px", color: "#166534", fontSize: "13px", fontWeight: "600" }}>
                    ✓ This inspection has been reviewed.
                </div>
            )}
        </div>
    );
}
