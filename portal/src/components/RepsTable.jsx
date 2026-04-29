import { useState } from 'react';
import { Card, ScoreBadge, StatusBadge } from './ui';
import { G, BK, WH } from '../constants';

const TH = { padding: '10px 14px', textAlign: 'left', fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#64748b', fontWeight: '700', whiteSpace: 'nowrap' };

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
        { label: 'Date', key: 'date' },
        { label: 'Location', key: 'location' },
        { label: 'Assigned To', key: 'assignedTo' },
        { label: 'Submitted By', key: 'submittedBy' },
        { label: 'Score', key: null },
        { label: 'Status', key: null },
        { label: '', key: null },
    ];

    if (reports.length === 0) {
        return (
            <Card style={{ textAlign: 'center', padding: '48px' }}>
                <div style={{ fontSize: '14px', color: '#94a3b8', fontWeight: '600' }}>No inspections yet</div>
                <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '4px' }}>Submit your first inspection to see it here</div>
            </Card>
        );
    }

    return (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ borderBottom: '2px solid #f1f5f9', background: '#f8fafc' }}>
                        {cols.map(col => (
                            <th key={col.label}
                                onClick={col.key ? () => toggleSort(col.key) : undefined}
                                style={{ ...TH, color: sortKey === col.key ? BK : '#64748b', cursor: col.key ? 'pointer' : 'default', userSelect: 'none' }}>
                                {col.label}
                                {col.key && (
                                    <span style={{ marginLeft: '4px', opacity: sortKey === col.key ? 1 : 0.35 }}>
                                        {sortKey === col.key ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
                                    </span>
                                )}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {sorted.map((r, i) => (
                        <tr key={r.id} style={{ borderBottom: i < sorted.length - 1 ? '1px solid #f1f5f9' : 'none', transition: 'background 0.1s' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                            <td style={{ padding: '13px 14px', fontSize: '13px', color: '#64748b', fontWeight: '500' }}>{r.date}</td>
                            <td style={{ padding: '13px 14px', fontSize: '13px', color: BK, fontWeight: '600' }}>{r.location || '—'}</td>
                            <td style={{ padding: '13px 14px', fontSize: '13px', color: BK, fontWeight: '700' }}>{r.assignedTo || '—'}</td>
                            <td style={{ padding: '13px 14px', fontSize: '13px', color: '#64748b' }}>{r.submittedBy || '—'}</td>
                            <td style={{ padding: '13px 14px' }}><ScoreBadge score={r.score} /></td>
                            <td style={{ padding: '13px 14px' }}><StatusBadge status={r.status} /></td>
                            <td style={{ padding: '13px 14px' }}>
                                <button onClick={() => { setSelReport(r); setView('detail'); }}
                                    style={{ background: 'transparent', border: `1.5px solid ${G}`, borderRadius: '6px', color: G, fontSize: '11px', padding: '5px 12px', cursor: 'pointer', fontWeight: '700', fontFamily: 'system-ui,sans-serif', transition: 'all 0.15s' }}
                                    onMouseEnter={e => { e.target.style.background = G; e.target.style.color = WH; }}
                                    onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.color = G; }}>
                                    View
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </Card>
    );
}
