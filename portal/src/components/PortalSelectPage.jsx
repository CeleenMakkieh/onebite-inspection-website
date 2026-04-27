import { LOGO, G, PINK, WH, BK } from '../constants';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

export function PortalSelectPage({ user, onSelect }) {
    const canReceipts = user.role === 'Owner' || user.role === 'Manager';

    const cardBase = {
        background: WH,
        borderRadius: '20px',
        padding: '40px 36px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.10)',
        cursor: 'pointer',
        border: '2px solid transparent',
        transition: 'all 0.18s ease',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px',
        flex: 1,
        minWidth: '220px',
        maxWidth: '300px',
    };

    return (
        <div style={{ minHeight: '100vh', background: PINK, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui,sans-serif', padding: '24px' }}>
            <div style={{ marginBottom: '40px', textAlign: 'center' }}>
                <img src={LOGO} alt="One Bite" style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', marginBottom: '14px', boxShadow: `0 8px 24px rgba(0,138,95,0.28)` }} />
                <div style={{ fontSize: '22px', fontWeight: '800', color: G }}>One Bite Portal</div>
                <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>Mini Pitas & Juice Bar</div>
                <div style={{ fontSize: '13px', color: '#888', marginTop: '10px' }}>
                    Welcome, <strong style={{ color: BK }}>{user.name}</strong>
                    {user.location && <span style={{ color: '#aaa' }}> · {user.location}</span>}
                </div>
            </div>

            <div style={{ fontSize: '13px', color: '#888', marginBottom: '20px', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: '600' }}>Select a portal to continue</div>

            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
                {/* Inspection Portal */}
                <div
                    style={cardBase}
                    onClick={() => onSelect('inspection')}
                    onMouseEnter={e => { e.currentTarget.style.border = `2px solid ${G}`; e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = `0 16px 48px rgba(0,138,95,0.18)`; }}
                    onMouseLeave={e => { e.currentTarget.style.border = '2px solid transparent'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.10)'; }}
                >
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '17px', fontWeight: '800', color: BK, marginBottom: '6px' }}>Inspection Portal</div>
                        <div style={{ fontSize: '12px', color: '#888', lineHeight: 1.5 }}>Daily tasks, inspection reports,<br />and quality checklists</div>
                    </div>
                    <div style={{ marginTop: '4px', padding: '8px 20px', background: G, color: WH, borderRadius: '8px', fontSize: '13px', fontWeight: '700' }}>
                        Open →
                    </div>
                </div>

                {/* Receipts Portal */}
                {canReceipts && (
                    <div
                        style={cardBase}
                        onClick={() => onSelect('receipts')}
                        onMouseEnter={e => { e.currentTarget.style.border = '2px solid #2563eb'; e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 16px 48px rgba(37,99,235,0.14)'; }}
                        onMouseLeave={e => { e.currentTarget.style.border = '2px solid transparent'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.10)'; }}
                    >
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '17px', fontWeight: '800', color: BK, marginBottom: '6px' }}>Receipt Scanner</div>
                            <div style={{ fontSize: '12px', color: '#888', lineHeight: 1.5 }}>Upload receipts, track spending,<br />vendor reports, and price comparison</div>
                        </div>
                        <div style={{ marginTop: '4px', padding: '8px 20px', background: '#2563eb', color: WH, borderRadius: '8px', fontSize: '13px', fontWeight: '700' }}>
                            Open →
                        </div>
                    </div>
                )}
            </div>

            <button
                onClick={() => signOut(auth)}
                style={{ marginTop: '40px', background: 'none', border: 'none', color: '#aaa', fontSize: '12px', cursor: 'pointer', fontFamily: 'system-ui,sans-serif', textDecoration: 'underline' }}
            >
                Sign Out
            </button>
        </div>
    );
}
