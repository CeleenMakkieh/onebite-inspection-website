import { useState, useEffect } from 'react';
import { G, WH, BK } from '../../constants';
import { fetchReceiptItems } from '../../receiptDb';

const PINK_LIGHT = 'rgba(0,138,95,0.07)';

function StatCard({ label, value, accent, sub }) {
    return (
        <div style={{
            background: WH, borderRadius: '16px', padding: '22px 24px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)',
            flex: '1', minWidth: '150px', borderTop: `4px solid ${accent || '#e2e8f0'}`,
            display: 'flex', flexDirection: 'column', gap: '6px'
        }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
            <div style={{ fontSize: '28px', fontWeight: '900', color: BK, letterSpacing: '-0.02em', lineHeight: 1 }}>{value}</div>
            {sub && <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>{sub}</div>}
        </div>
    );
}

export function ReceiptDash({ receipts, onUpload, onViewAll, setSelReceipt, setView }) {
    const [topItems, setTopItems] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            const results = await Promise.all(receipts.slice(0, 30).map(r => fetchReceiptItems(r.id)));
            const flat = results.flat();
            const agg = {};
            flat.forEach(it => {
                const key = it.name?.toLowerCase() || '';
                if (!key) return;
                if (!agg[key]) agg[key] = { name: it.name, totalSpend: 0, count: 0 };
                agg[key].totalSpend += parseFloat(it.lineTotal) || 0;
                agg[key].count += 1;
            });
            setTopItems(Object.values(agg).sort((a, b) => b.totalSpend - a.totalSpend).slice(0, 5));
            setLoading(false);
        }
        if (receipts.length) load();
        else setLoading(false);
    }, [receipts]);

    const totalSpend = receipts.reduce((s, r) => s + (parseFloat(r.total) || 0), 0);
    const thisMonth = new Date().toISOString().slice(0, 7);
    const monthReceipts = receipts.filter(r => r.date?.startsWith(thisMonth));
    const monthSpend = monthReceipts.reduce((s, r) => s + (parseFloat(r.total) || 0), 0);

    const vendorTotals = Object.values(
        receipts.reduce((acc, r) => {
            if (!acc[r.vendor]) acc[r.vendor] = { vendor: r.vendor, total: 0, count: 0 };
            acc[r.vendor].total += parseFloat(r.total) || 0;
            acc[r.vendor].count += 1;
            return acc;
        }, {})
    ).sort((a, b) => b.total - a.total).slice(0, 5);

    const recent = receipts.slice(0, 5);
    const topItem = topItems[0] || null;
    const maxVendor = vendorTotals[0]?.total || 1;

    return (
        <div style={{ maxWidth: '960px' }}>

            {/* Stat cards */}
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '28px' }}>
                <StatCard label="Total Receipts" value={receipts.length} accent="#cbd5e1" sub={`${monthReceipts.length} this month`} />
                <StatCard label="This Month" value={`$${monthSpend.toFixed(2)}`} accent={G} sub={new Date().toLocaleString('default', { month: 'long', year: 'numeric' })} />
                <StatCard label="All-Time Spend" value={`$${totalSpend.toFixed(2)}`} accent={G} sub={`across ${receipts.length} receipt${receipts.length !== 1 ? 's' : ''}`} />
                {!loading && topItem && (
                    <StatCard label="Top Item" value={topItem.name} accent="#f59e0b" sub={`$${topItem.totalSpend.toFixed(2)} total · ${topItem.count}x purchased`} />
                )}
            </div>

            {/* Main grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>

                {/* Recent Receipts */}
                <div style={{ background: WH, borderRadius: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                    <div style={{ padding: '18px 22px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ fontSize: '13px', fontWeight: '800', color: BK, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Recent Receipts</div>
                        {recent.length > 0 && (
                            <button onClick={onViewAll} style={{ background: PINK_LIGHT, border: 'none', color: G, fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: 'system-ui,sans-serif', padding: '5px 10px', borderRadius: '6px' }}>View all</button>
                        )}
                    </div>
                    <div style={{ padding: '8px 0' }}>
                        {recent.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '32px 20px' }}>
                                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: PINK_LIGHT, margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <div style={{ width: '22px', height: '28px', border: `2px solid ${G}`, borderRadius: '3px', position: 'relative' }}>
                                        <div style={{ position: 'absolute', top: '5px', left: '3px', right: '3px', height: '2px', background: G, borderRadius: '1px' }} />
                                        <div style={{ position: 'absolute', top: '10px', left: '3px', right: '3px', height: '2px', background: G, borderRadius: '1px' }} />
                                        <div style={{ position: 'absolute', top: '15px', left: '3px', width: '8px', height: '2px', background: G, borderRadius: '1px' }} />
                                    </div>
                                </div>
                                <div style={{ fontSize: '13px', fontWeight: '700', color: BK, marginBottom: '4px' }}>No receipts yet</div>
                                <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '16px' }}>Scan your first receipt to get started</div>
                                <button onClick={onUpload} style={{ padding: '9px 18px', background: G, color: WH, border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: 'system-ui,sans-serif' }}>Scan First Receipt</button>
                            </div>
                        ) : recent.map((r, i) => (
                            <div key={r.id} onClick={() => { setSelReceipt(r); setView('detail'); }}
                                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 22px', cursor: 'pointer', borderBottom: i < recent.length - 1 ? '1px solid #f8fafc' : 'none', transition: 'background 0.15s' }}
                                onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: PINK_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <div style={{ fontSize: '14px', fontWeight: '900', color: G }}>{(r.vendor || '?').charAt(0).toUpperCase()}</div>
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: '13px', fontWeight: '700', color: BK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.vendor}</div>
                                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>{r.date}{r.location ? ` · ${r.location}` : ''}</div>
                                </div>
                                <div style={{ fontSize: '14px', fontWeight: '800', color: BK, flexShrink: 0 }}>${(parseFloat(r.total) || 0).toFixed(2)}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Top Vendors */}
                <div style={{ background: WH, borderRadius: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                    <div style={{ padding: '18px 22px', borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{ fontSize: '13px', fontWeight: '800', color: BK, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Top Vendors</div>
                    </div>
                    <div style={{ padding: '16px 22px' }}>
                        {vendorTotals.length === 0 ? (
                            <div style={{ fontSize: '13px', color: '#94a3b8', padding: '16px 0', textAlign: 'center' }}>No data yet</div>
                        ) : vendorTotals.map((v, i) => {
                            const pct = (v.total / maxVendor) * 100;
                            return (
                                <div key={v.vendor} style={{ marginBottom: i < vendorTotals.length - 1 ? '16px' : 0 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
                                        <span style={{ fontSize: '13px', fontWeight: '700', color: BK }}>{v.vendor}</span>
                                        <div style={{ textAlign: 'right' }}>
                                            <span style={{ fontSize: '13px', fontWeight: '800', color: G }}>${v.total.toFixed(2)}</span>
                                            <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: '6px' }}>{v.count} receipt{v.count !== 1 ? 's' : ''}</span>
                                        </div>
                                    </div>
                                    <div style={{ height: '7px', background: '#f1f5f9', borderRadius: '99px', overflow: 'hidden' }}>
                                        <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${G}, #00c47a)`, borderRadius: '99px', transition: 'width 0.6s ease' }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Top Spend Items */}
                <div style={{ background: WH, borderRadius: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                    <div style={{ padding: '18px 22px', borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{ fontSize: '13px', fontWeight: '800', color: BK, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Top Spend Items</div>
                    </div>
                    <div style={{ padding: '8px 0' }}>
                        {loading ? (
                            <div style={{ fontSize: '12px', color: '#94a3b8', padding: '24px', textAlign: 'center' }}>Loading…</div>
                        ) : topItems.length === 0 ? (
                            <div style={{ fontSize: '13px', color: '#94a3b8', padding: '24px', textAlign: 'center' }}>No data yet</div>
                        ) : topItems.map((it, i) => (
                            <div key={it.name} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 22px', borderBottom: i < topItems.length - 1 ? '1px solid #f8fafc' : 'none' }}>
                                <div style={{ width: '26px', height: '26px', borderRadius: '8px', background: i === 0 ? G : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <span style={{ fontSize: '11px', fontWeight: '900', color: i === 0 ? WH : '#64748b' }}>{i + 1}</span>
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: '13px', fontWeight: '700', color: BK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.name}</div>
                                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>purchased {it.count}x</div>
                                </div>
                                <span style={{ fontSize: '13px', fontWeight: '800', color: G, flexShrink: 0 }}>${it.totalSpend.toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
