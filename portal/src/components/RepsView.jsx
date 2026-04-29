import { RepsTable } from './RepsTable';
import { G, WH, BK } from '../constants';

export function RepsView({ reports, filterStatus, setFilterStatus, setSelReport, setView }) {
    const ss = ['All', 'Completed', 'Needs Review', 'In Progress'];
    const filtered = filterStatus === 'All' ? reports : reports.filter(r => r.status === filterStatus);

    const pillStyle = (active) => ({
        padding: '7px 16px',
        background: active ? G : WH,
        border: `1.5px solid ${active ? G : '#e2e8f0'}`,
        borderRadius: '20px',
        color: active ? WH : '#64748b',
        fontSize: '13px',
        cursor: 'pointer',
        fontWeight: active ? '700' : '500',
        fontFamily: 'system-ui,sans-serif',
        transition: 'all 0.15s',
    });

    return (
        <div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
                {ss.map(s => (
                    <button key={s} onClick={() => setFilterStatus(s)} style={pillStyle(filterStatus === s)}>{s}</button>
                ))}
                <div style={{ marginLeft: 'auto', fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>
                    {filtered.length} report{filtered.length !== 1 ? 's' : ''}
                </div>
            </div>
            <RepsTable reports={filtered} setSelReport={setSelReport} setView={setView} />
        </div>
    );
}
