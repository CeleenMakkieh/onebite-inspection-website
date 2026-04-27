import { useState, useEffect } from 'react';
import { G, WH, BK } from '../../constants';
import { fetchReceiptItems } from '../../receiptDb';


function StatCard({ label, value, sub, color }) {
    return (
        <div style={{ background: WH, borderRadius: '14px', padding: '20px 22px', boxShadow: '0 2px 10px rgba(0,0,0,0.07)', flex: '1', minWidth: '140px' }}>
            <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px' }}>{label}</div>
            <div style={{ fontSize: '26px', fontWeight: '800', color: color || BK }}>{value}</div>
            {sub && <div style={{ fontSize: '11px', color: '#aaa', marginTop: '3px' }}>{sub}</div>}
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
                if (!agg[key]) agg[key] = { name: it.name, totalSpend: 0 };
                agg[key].totalSpend += parseFloat(it.lineTotal) || 0;
            });
            const sorted = Object.values(agg).sort((a, b) => b.totalSpend - a.totalSpend).slice(0, 5);
            setTopItems(sorted);
            setLoading(false);
        }
        if (receipts.length) load();
        else setLoading(false);
    }, [receipts]);

    const totalSpend = receipts.reduce((s, r) => s + (parseFloat(r.total) || 0), 0);
    const thisMonth = new Date().toISOString().slice(0, 7);
    const monthSpend = receipts.filter(r => r.date?.startsWith(thisMonth)).reduce((s, r) => s + (parseFloat(r.total) || 0), 0);

    const vendorTotals = Object.values(
        receipts.reduce((acc, r) => {
            if (!acc[r.vendor]) acc[r.vendor] = { vendor: r.vendor, total: 0 };
            acc[r.vendor].total += parseFloat(r.total) || 0;
            return acc;
        }, {})
    ).sort((a, b) => b.total - a.total).slice(0, 5);

    const recent = receipts.slice(0, 6);

    const topItem = topItems[0] || null;

    return (
        <div style={{ maxWidth: '900px' }}>
            {/* Stats */}
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginBottom: '24px' }}>
                <StatCard label="Total Receipts" value={receipts.length} />
                <StatCard label="This Month" value={`$${monthSpend.toFixed(2)}`} color={G} />
                <StatCard label="All-Time Spend" value={`$${totalSpend.toFixed(2)}`} color={G} />
                {!loading && topItem && (
                    <StatCard label="Most Purchased Item" value={topItem.name} sub={`$${topItem.totalSpend.toFixed(2)} total spend`} color={BK} />
                )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '18px' }}>
                {/* Recent receipts */}
                <div style={{ background: WH, borderRadius: '16px', padding: '22px', boxShadow: '0 2px 10px rgba(0,0,0,0.07)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                        <div style={{ fontSize: '13px', fontWeight: '800', color: BK, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Recent Receipts</div>
                        <button onClick={onViewAll} style={{ background: 'none', border: 'none', color: G, fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: 'system-ui,sans-serif' }}>View all →</button>
                    </div>
                    {recent.length === 0 ? (
                        <div style={{ fontSize: '13px', color: '#aaa', padding: '16px 0', textAlign: 'center' }}>
                            No receipts yet.<br />
                            <button onClick={onUpload} style={{ marginTop: '10px', padding: '8px 16px', background: G, color: WH, border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: 'system-ui,sans-serif' }}>Upload First Receipt</button>
                        </div>
                    ) : recent.map((r, i) => (
                        <div key={r.id} onClick={() => { setSelReceipt(r); setView('detail'); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderBottom: i < recent.length - 1 ? '1px solid #f1f5f9' : 'none', cursor: 'pointer' }}
                            onMouseEnter={e => e.currentTarget.style.opacity = '0.7'} onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                            <div>
                                <div style={{ fontSize: '13px', fontWeight: '700', color: BK }}>{r.vendor}</div>
                                <div style={{ fontSize: '11px', color: '#aaa' }}>{r.date} · {r.location}</div>
                            </div>
                            <div style={{ fontSize: '14px', fontWeight: '800', color: BK }}>${(parseFloat(r.total) || 0).toFixed(2)}</div>
                        </div>
                    ))}
                </div>

                {/* Top vendors */}
                <div style={{ background: WH, borderRadius: '16px', padding: '22px', boxShadow: '0 2px 10px rgba(0,0,0,0.07)' }}>
                    <div style={{ fontSize: '13px', fontWeight: '800', color: BK, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '14px' }}>Top Vendors</div>
                    {vendorTotals.length === 0 ? <div style={{ fontSize: '13px', color: '#aaa' }}>No data yet.</div> : vendorTotals.map((v, i) => {
                        const pct = totalSpend > 0 ? (v.total / totalSpend) * 100 : 0;
                        return (
                            <div key={v.vendor} style={{ marginBottom: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                                    <span style={{ fontWeight: '600', color: BK }}>{v.vendor}</span>
                                    <span style={{ fontWeight: '700', color: G }}>${v.total.toFixed(2)}</span>
                                </div>
                                <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '4px' }}>
                                    <div style={{ height: '100%', width: `${pct}%`, background: G, borderRadius: '4px' }} />
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Top items */}
                <div style={{ background: WH, borderRadius: '16px', padding: '22px', boxShadow: '0 2px 10px rgba(0,0,0,0.07)' }}>
                    <div style={{ fontSize: '13px', fontWeight: '800', color: BK, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '14px' }}>Top Spend Items</div>
                    {loading ? <div style={{ fontSize: '12px', color: '#aaa' }}>Loading…</div> : topItems.length === 0 ? <div style={{ fontSize: '13px', color: '#aaa' }}>No data yet.</div> : topItems.map((it, i) => (
                        <div key={it.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < topItems.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: `rgba(0,138,95,0.10)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '800', color: G }}>{i + 1}</div>
                                <span style={{ fontSize: '13px', fontWeight: '600', color: BK }}>{it.name}</span>
                            </div>
                            <span style={{ fontSize: '13px', fontWeight: '700', color: G }}>${it.totalSpend.toFixed(2)}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
