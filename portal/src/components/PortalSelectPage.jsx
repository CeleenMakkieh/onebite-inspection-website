import { LOGO, G, PINK, WH, BK } from '../constants';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

const SHADOW = '0 1px 4px rgba(0,0,0,0.06), 0 8px 32px rgba(0,0,0,0.08)';

export function PortalSelectPage({ user, onSelect }) {
    const canReceipts = user.role === 'Owner' || user.role === 'Manager';

    return (
        <div style={{ minHeight: '100vh', background: PINK, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui,sans-serif', padding: '24px' }}>

            {/* Header */}
            <div style={{ marginBottom: '48px', textAlign: 'center' }}>
                <div style={{ width: '84px', height: '84px', borderRadius: '50%', overflow: 'hidden', margin: '0 auto 16px', boxShadow: `0 8px 28px rgba(0,138,95,0.28)` }}>
                    <img src={LOGO} alt="One Bite" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ fontSize: '24px', fontWeight: '900', color: BK, letterSpacing: '-0.02em' }}>One Bite Portal</div>
                <div style={{ fontSize: '13px', color: '#888', marginTop: '4px' }}>Mini Pitas & Juice Bar</div>
                <div style={{ marginTop: '14px', padding: '8px 20px', background: 'rgba(0,138,95,0.08)', borderRadius: '20px', display: 'inline-block' }}>
                    <span style={{ fontSize: '13px', color: BK, fontWeight: '700' }}>{user.name}</span>
                    <span style={{ fontSize: '12px', color: '#64748b' }}> · {user.role}{user.location ? ` · ${user.location}` : ''}</span>
                </div>
            </div>

            {/* Cards */}
            <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '20px', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: '700' }}>Choose a portal</div>
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center', maxWidth: '700px' }}>

                <PortalCard
                    title="Inspection Portal"
                    description="Daily tasks, inspection checklists, and quality reports"
                    accent={G}
                    onClick={() => onSelect('inspection')}
                    detail={[
                        'Daily task tracking',
                        'New inspections',
                        'Score reporting',
                    ]}
                />

                {canReceipts && (
                    <PortalCard
                        title="Receipt Scanner"
                        description="Upload receipts, track vendor spending, and compare prices"
                        accent={G}
                        onClick={() => onSelect('receipts')}
                        detail={[
                            'AI receipt scanning',
                            'Vendor spending reports',
                            'Price comparison',
                        ]}
                        secondary
                    />
                )}
            </div>

            <button
                onClick={() => signOut(auth)}
                style={{ marginTop: '44px', background: 'none', border: 'none', color: '#94a3b8', fontSize: '12px', cursor: 'pointer', fontFamily: 'system-ui,sans-serif' }}
                onMouseEnter={e => e.target.style.color = '#64748b'}
                onMouseLeave={e => e.target.style.color = '#94a3b8'}
            >
                Sign Out
            </button>
        </div>
    );
}

function PortalCard({ title, description, accent, onClick, detail, secondary }) {
    return (
        <div
            onClick={onClick}
            style={{ background: WH, borderRadius: '20px', padding: '32px 30px', boxShadow: SHADOW, cursor: 'pointer', border: '2px solid transparent', transition: 'all 0.18s ease', flex: 1, minWidth: '230px', maxWidth: '300px', borderTop: `4px solid ${accent}` }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = `0 8px 40px rgba(0,138,95,0.18)`; e.currentTarget.style.border = `2px solid ${accent}`; e.currentTarget.style.borderTop = `4px solid ${accent}`; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = SHADOW; e.currentTarget.style.border = '2px solid transparent'; e.currentTarget.style.borderTop = `4px solid ${accent}`; }}
        >
            <div style={{ fontSize: '17px', fontWeight: '900', color: '#111', marginBottom: '8px', letterSpacing: '-0.01em' }}>{title}</div>
            <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.6, marginBottom: '20px' }}>{description}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '24px' }}>
                {detail.map((d, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#475569' }}>
                        <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: accent, flexShrink: 0 }} />
                        {d}
                    </div>
                ))}
            </div>
            <div style={{ padding: '10px', background: secondary ? 'transparent' : accent, border: `1.5px solid ${accent}`, borderRadius: '10px', textAlign: 'center', fontSize: '13px', fontWeight: '700', color: secondary ? accent : WH }}>
                Open Portal
            </div>
        </div>
    );
}
