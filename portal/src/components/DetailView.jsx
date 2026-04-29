import { useState } from 'react';
import { Card, ScoreBadge, StatusBadge, lbl } from './ui';
import { G, BK, WH } from '../constants';

export function DetailView({ report, onBack, tempItems = [], appliances = [], onReview }) {
    const [saving, setSaving] = useState(false);

    const getLabel = (key) => {
        const [prefix, id] = key.split('__');
        if (prefix === 'TC') {
            const item = tempItems.find(t => String(t.id) === id);
            const reading = report.tempReadings?.[id];
            const readingStr = reading !== undefined && reading !== '' ? ` — reading: ${reading}°F` : '';
            return item ? `${item.name}${readingStr} (required: ${item.requiredTemp})` : key;
        }
        if (prefix === 'AP') {
            const item = appliances.find(a => String(a.id) === id);
            const reading = report.applianceReadings?.[id];
            const readingStr = reading !== undefined && reading !== '' ? ` — reading: ${reading}°F` : '';
            return item ? `${item.name}${readingStr} (target: ${item.targetTemp})` : key;
        }
        return id;
    };

    const failed = Object.entries(report.results).filter(([, v]) => v === 'fail').map(([k]) => ({ key: k, label: getLabel(k) }));

    const handleReview = async () => {
        setSaving(true);
        await onReview(report);
        setSaving(false);
    };

    return (
        <div style={{ maxWidth: '720px' }}>
            <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: G, fontSize: '13px', cursor: 'pointer', padding: '0 0 20px', fontWeight: '700', fontFamily: 'system-ui,sans-serif', display: 'flex', alignItems: 'center', gap: '4px' }}>← Back to Reports</button>

            {/* Header */}
            <Card style={{ marginBottom: '16px', borderTop: `4px solid ${report.score >= 90 ? G : report.score >= 75 ? '#d97706' : '#dc2626'}` }}>
                <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                        <div style={{ fontSize: '20px', fontWeight: '900', color: BK, letterSpacing: '-0.01em', marginBottom: '6px' }}>
                            Inspection — {report.date}
                        </div>
                        <div style={{ fontSize: '13px', color: '#64748b' }}>
                            Assigned to <strong style={{ color: BK }}>{report.assignedTo || '—'}</strong>
                            <span style={{ margin: '0 6px', color: '#cbd5e1' }}>·</span>
                            Submitted by <strong style={{ color: BK }}>{report.submittedBy}</strong>
                        </div>
                        {report.location && (
                            <div style={{ marginTop: '4px', fontSize: '12px', color: '#94a3b8' }}>{report.location}</div>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                        <ScoreBadge score={report.score} />
                        <StatusBadge status={report.status} />
                    </div>
                </div>
            </Card>

            {/* Failed items */}
            {failed.length > 0 && (
                <Card style={{ marginBottom: '16px', border: '1.5px solid #fca5a5', background: '#fff5f5' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#dc2626', flexShrink: 0 }} />
                        <div style={{ fontSize: '12px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#991b1b', fontWeight: '800' }}>
                            Failed Items ({failed.length})
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {failed.map(({ key, label }) => (
                            <div key={key} style={{ padding: '8px 12px', background: '#fee2e2', borderRadius: '8px', fontSize: '13px', color: '#991b1b' }}>
                                {label}
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* Notes */}
            {report.notes && (
                <Card style={{ marginBottom: '16px' }}>
                    <div style={{ ...lbl, marginBottom: '8px' }}>Notes</div>
                    <p style={{ margin: 0, fontSize: '14px', color: '#334155', lineHeight: 1.7 }}>{report.notes}</p>
                </Card>
            )}

            {/* Actions */}
            {report.status === 'Needs Review' && (
                <div style={{ marginTop: '8px' }}>
                    <button
                        onClick={handleReview}
                        disabled={saving}
                        style={{ padding: '13px 32px', background: saving ? '#94a3b8' : G, color: WH, border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'system-ui,sans-serif' }}
                    >
                        {saving ? 'Saving…' : 'Mark as Reviewed'}
                    </button>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '8px' }}>This will remove it from the Needs Review count on the dashboard.</div>
                </div>
            )}

            {report.status === 'Reviewed' && (
                <div style={{ marginTop: '8px', padding: '14px 18px', background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: '10px', color: '#166534', fontSize: '13px', fontWeight: '700' }}>
                    This inspection has been reviewed.
                </div>
            )}
        </div>
    );
}
