import { useState, useEffect } from 'react';
import { G, WH, BK, PINK, LOGO } from '../../constants';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase';
import { fetchReceipts, fetchReceiptsByLocation } from '../../receiptDb';
import { ReceiptDash } from './ReceiptDash';
import { ReceiptUpload } from './ReceiptUpload';
import { ReceiptDetail } from './ReceiptDetail';
import { ReceiptReports } from './ReceiptReports';


export function ReceiptPortal({ user, onSwitchPortal }) {
    const [view, setView] = useState('dashboard');
    const [receipts, setReceipts] = useState([]);
    const [selReceipt, setSelReceipt] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768);
    const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
    const [filterVendor, setFilterVendor] = useState('');
    const [filterLoc, setFilterLoc] = useState('');

    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    useEffect(() => {
        async function load() {
            try {
                const data = user.role === 'Owner'
                    ? await fetchReceipts()
                    : await fetchReceiptsByLocation(user.location);
                setReceipts(data);
            } catch (e) {
                console.error('Error loading receipts:', e);
            }
            setLoading(false);
        }
        load();
    }, [user]);

    const handleSaved = (receipt) => {
        setReceipts(prev => [receipt, ...prev]);
        setView('dashboard');
    };

    const handleDeleted = (id) => {
        setReceipts(prev => prev.filter(r => r.id !== id));
        setView('all');
    };

    const nav = [
        { id: 'dashboard', label: 'Dashboard', icon: '⊞' },
        { id: 'upload', label: 'Scan Receipt', icon: '+' },
        { id: 'all', label: 'All Receipts', icon: '≡' },
        { id: 'reports', label: 'Reports', icon: '▤' },
    ];

    const titles = { dashboard: 'Receipt Dashboard', upload: 'Scan Receipt', all: 'All Receipts', detail: 'Receipt Detail', reports: 'Reports' };

    // Filtered receipts for the "All Receipts" list
    const vendors = [...new Set(receipts.map(r => r.vendor))].sort();
    const locations = [...new Set(receipts.map(r => r.location).filter(Boolean))].sort();
    const filteredReceipts = receipts.filter(r =>
        (!filterVendor || r.vendor === filterVendor) &&
        (!filterLoc || r.location === filterLoc)
    );

    return (
        <div style={{ minHeight: '100vh', background: PINK, fontFamily: 'system-ui,sans-serif', color: BK }}>
            {/* Sidebar */}
            <div style={{ position: 'fixed', left: 0, top: 0, bottom: 0, width: '220px', background: G, display: 'flex', flexDirection: 'column', zIndex: 100, boxShadow: '4px 0 16px rgba(0,0,0,0.12)', transform: sidebarOpen ? 'translateX(0)' : 'translateX(-220px)', transition: 'transform 0.25s ease' }}>
                <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <img src={LOGO} alt="One Bite" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid rgba(255,255,255,0.4)' }} />
                    <div>
                        <div style={{ fontSize: '14px', fontWeight: '800', color: WH, lineHeight: 1.1 }}>Receipt Scanner</div>
                        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>One Bite</div>
                    </div>
                </div>
                <nav style={{ padding: '12px 10px', flex: 1 }}>
                    {nav.map(item => (
                        <button key={item.id} onClick={() => { setView(item.id); if (isMobile) setSidebarOpen(false); }}
                            style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '11px 14px', background: view === item.id ? 'rgba(255,255,255,0.18)' : 'transparent', border: 'none', borderRadius: '8px', color: WH, fontSize: '14px', cursor: 'pointer', textAlign: 'left', marginBottom: '3px', fontFamily: 'system-ui,sans-serif', fontWeight: view === item.id ? '700' : '400' }}>
                            <span style={{ fontSize: '16px', width: '20px', textAlign: 'center' }}>{item.icon}</span>{item.label}
                        </button>
                    ))}
                </nav>
                <div style={{ padding: '14px', borderTop: '1px solid rgba(255,255,255,0.15)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button onClick={onSwitchPortal}
                        style={{ width: '100%', padding: '9px', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: '8px', color: WH, fontSize: '12px', cursor: 'pointer', fontFamily: 'system-ui,sans-serif', textTransform: 'uppercase', letterSpacing: '0.08em' }}
                        onMouseEnter={e => e.target.style.background = 'rgba(255,255,255,0.22)'}
                        onMouseLeave={e => e.target.style.background = 'rgba(255,255,255,0.12)'}>
                        ⇄ Switch Portal
                    </button>
                    <div style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.10)', borderRadius: '8px' }}>
                        <div style={{ fontSize: '13px', color: WH, fontWeight: '700' }}>{user.name}</div>
                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{user.role}</div>
                        {user.location && <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.55)', marginTop: '1px' }}>{user.location}</div>}
                    </div>
                    <button onClick={() => signOut(auth)}
                        style={{ width: '100%', padding: '9px', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: '8px', color: 'rgba(255,255,255,0.85)', fontSize: '12px', cursor: 'pointer', fontFamily: 'system-ui,sans-serif', textTransform: 'uppercase', letterSpacing: '0.08em' }}
                        onMouseEnter={e => { e.target.style.background = 'rgba(220,50,50,0.35)'; e.target.style.color = WH; }}
                        onMouseLeave={e => { e.target.style.background = 'rgba(255,255,255,0.12)'; e.target.style.color = 'rgba(255,255,255,0.85)'; }}>
                        Sign Out
                    </button>
                </div>
            </div>

            {sidebarOpen && isMobile && (
                <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 99 }} />
            )}

            {/* Main */}
            <div style={{ marginLeft: isMobile ? 0 : (sidebarOpen ? '220px' : '0'), transition: 'margin-left 0.25s ease', minHeight: '100vh' }}>
                {/* Header */}
                <div style={{ padding: isMobile ? '12px 14px' : '18px 32px', background: 'rgba(246,209,209,0.92)', borderBottom: '1px solid rgba(0,138,95,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button onClick={() => setSidebarOpen(o => !o)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px 8px', color: G, fontSize: '22px', lineHeight: 1, borderRadius: '6px', flexShrink: 0, fontFamily: 'system-ui,sans-serif' }}>
                            {sidebarOpen ? '✕' : '☰'}
                        </button>
                        <h1 style={{ margin: 0, fontSize: isMobile ? '17px' : '22px', fontWeight: '800', color: G }}>{titles[view] || '—'}</h1>
                    </div>
                    {view === 'dashboard' && (
                        <button onClick={() => setView('upload')} style={{ padding: '9px 16px', background: G, color: WH, border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'system-ui,sans-serif' }}>
                            + Scan Receipt
                        </button>
                    )}
                </div>

                <div style={{ padding: isMobile ? '16px 14px' : '24px 32px' }}>
                    {loading ? (
                        <div style={{ fontSize: '14px', color: '#aaa', padding: '40px' }}>Loading receipts…</div>
                    ) : (
                        <>
                            {view === 'dashboard' && <ReceiptDash receipts={receipts} user={user} onUpload={() => setView('upload')} onViewAll={() => setView('all')} setSelReceipt={setSelReceipt} setView={setView} />}
                            {view === 'upload' && <ReceiptUpload user={user} onSaved={handleSaved} />}
                            {view === 'detail' && selReceipt && <ReceiptDetail receipt={selReceipt} onBack={() => setView('all')} onDeleted={handleDeleted} />}
                            {view === 'reports' && <ReceiptReports receipts={receipts} />}
                            {view === 'all' && (
                                <div style={{ maxWidth: '860px' }}>
                                    <div style={{ display: 'flex', gap: '10px', marginBottom: '18px', flexWrap: 'wrap', alignItems: 'center' }}>
                                        <select value={filterVendor} onChange={e => setFilterVendor(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', fontFamily: 'system-ui,sans-serif', background: WH }}>
                                            <option value=''>All Vendors</option>
                                            {vendors.map(v => <option key={v} value={v}>{v}</option>)}
                                        </select>
                                        {user.role === 'Owner' && (
                                            <select value={filterLoc} onChange={e => setFilterLoc(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', fontFamily: 'system-ui,sans-serif', background: WH }}>
                                                <option value=''>All Locations</option>
                                                {locations.map(l => <option key={l} value={l}>{l}</option>)}
                                            </select>
                                        )}
                                        <span style={{ fontSize: '12px', color: '#aaa', marginLeft: 'auto' }}>{filteredReceipts.length} receipt{filteredReceipts.length !== 1 ? 's' : ''}</span>
                                    </div>
                                    <div style={{ background: WH, borderRadius: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                                        {filteredReceipts.length === 0 ? (
                                            <div style={{ padding: '40px', textAlign: 'center', fontSize: '13px', color: '#aaa' }}>No receipts found. <button onClick={() => setView('upload')} style={{ background: 'none', border: 'none', color: G, fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'system-ui,sans-serif', textDecoration: 'underline' }}>Upload one</button></div>
                                        ) : filteredReceipts.map((r, i) => (
                                            <div key={r.id} onClick={() => { setSelReceipt(r); setView('detail'); }}
                                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: i < filteredReceipts.length - 1 ? '1px solid #f1f5f9' : 'none', cursor: 'pointer', transition: 'background 0.1s' }}
                                                onMouseEnter={e => e.currentTarget.style.background = '#f6f9f7'}
                                                onMouseLeave={e => e.currentTarget.style.background = WH}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                                    <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(0,138,95,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                        <span style={{ fontSize: '16px', fontWeight: '900', color: G }}>{(r.vendor || '?').charAt(0).toUpperCase()}</span>
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: '14px', fontWeight: '700', color: BK }}>{r.vendor}</div>
                                                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>{r.date}{r.location ? ` · ${r.location}` : ''} · {r.itemCount ?? '?'} items · {r.uploadedBy}</div>
                                                    </div>
                                                </div>
                                                <div style={{ fontSize: '16px', fontWeight: '800', color: G, flexShrink: 0 }}>${(parseFloat(r.total) || 0).toFixed(2)}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
