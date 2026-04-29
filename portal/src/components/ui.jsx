import { WH, G, BK } from '../constants';

export function Card({ children, style = {} }) {
    return <div style={{ background: WH, borderRadius: '16px', padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)', ...style }}>{children}</div>;
}

export function ScoreBadge({ score }) {
    const c = score >= 90 ? '#166534' : score >= 75 ? '#92400e' : '#991b1b';
    const bg = score >= 90 ? '#dcfce7' : score >= 75 ? '#fef3c7' : '#fee2e2';
    const bd = score >= 90 ? '#86efac' : score >= 75 ? '#fcd34d' : '#fca5a5';
    return <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '800', color: c, background: bg, border: `1px solid ${bd}`, letterSpacing: '0.02em' }}>{score}%</span>;
}

export function StatusBadge({ status }) {
    const m = {
        'Completed': { c: '#166534', bg: '#dcfce7', bd: '#86efac' },
        'Needs Review': { c: '#991b1b', bg: '#fee2e2', bd: '#fca5a5' },
        'In Progress': { c: '#92400e', bg: '#fef3c7', bd: '#fcd34d' },
        'Reviewed': { c: '#166534', bg: '#dcfce7', bd: '#86efac' },
    };
    const s = m[status] || m['In Progress'];
    return <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', color: s.c, background: s.bg, border: `1px solid ${s.bd}`, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{status}</span>;
}

export function PFBtns({ result, onPass, onFail, onClear }) {
    return (
        <div style={{ display: 'flex', gap: '4px' }}>
            <button onClick={onPass} style={{ padding: '5px 12px', borderRadius: '20px', background: result === 'pass' ? '#dcfce7' : WH, border: result === 'pass' ? '2px solid #16a34a' : '1.5px solid #e2e8f0', color: result === 'pass' ? '#166534' : '#64748b', fontSize: '11px', fontWeight: '700', cursor: 'pointer', fontFamily: 'system-ui,sans-serif' }}>PASS</button>
            <button onClick={onFail} style={{ padding: '5px 12px', borderRadius: '20px', background: result === 'fail' ? '#fee2e2' : WH, border: result === 'fail' ? '2px solid #dc2626' : '1.5px solid #e2e8f0', color: result === 'fail' ? '#991b1b' : '#64748b', fontSize: '11px', fontWeight: '700', cursor: 'pointer', fontFamily: 'system-ui,sans-serif' }}>FAIL</button>
            <button onClick={onClear} style={{ padding: '5px 6px', background: 'transparent', border: 'none', color: '#cbd5e1', fontSize: '14px', cursor: 'pointer' }}>✕</button>
        </div>
    );
}

export function CheckRow({ label, result, onPass, onFail, onClear }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', marginBottom: '6px', background: result === 'pass' ? '#f0fdf4' : result === 'fail' ? '#fef2f2' : '#fafafa', border: `1.5px solid ${result === 'pass' ? '#86efac' : result === 'fail' ? '#fca5a5' : '#e2e8f0'}`, borderRadius: '10px' }}>
            <span style={{ flex: 1, fontSize: '14px', color: BK }}>{label}</span>
            <PFBtns result={result} onPass={onPass} onFail={onFail} onClear={onClear} />
        </div>
    );
}

export const inp = { background: WH, border: '1.5px solid #e2e8f0', borderRadius: '8px', color: BK, padding: '9px 12px', fontSize: '14px', fontFamily: 'system-ui,sans-serif', outline: 'none', boxSizing: 'border-box' };
export const lbl = { display: 'block', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#64748b', marginBottom: '5px', fontWeight: '700' };
export const sh = { fontSize: '11px', fontWeight: '800', color: BK, textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 14px 0', paddingLeft: '10px', borderLeft: `3px solid ${G}`, lineHeight: '1.6' };
export const gbtn = { padding: '10px 22px', background: G, border: 'none', borderRadius: '8px', color: WH, fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'system-ui,sans-serif' };
export const ghos = { padding: '10px 16px', background: 'transparent', border: '1.5px solid #e2e8f0', borderRadius: '8px', color: '#64748b', fontSize: '13px', cursor: 'pointer', fontFamily: 'system-ui,sans-serif', fontWeight: '600' };
