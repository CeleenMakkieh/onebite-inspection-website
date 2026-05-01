import { useState, useEffect } from 'react';
import { G, WH, BK } from '../../constants';
import { fetchReceiptItems, fetchBudgets, saveBudget } from '../../receiptDb';

const SHADOW = '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)';
const PINK_LIGHT = 'rgba(0,138,95,0.07)';
const RED = '#dc2626';

function StatCard({ label, value, accent, sub }) {
    return (
        <div style={{ background: WH, borderRadius: '16px', padding: '22px 24px', boxShadow: SHADOW, flex: '1', minWidth: '150px', borderTop: `4px solid ${accent || '#e2e8f0'}`, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
            <div style={{ fontSize: '28px', fontWeight: '900', color: BK, letterSpacing: '-0.02em', lineHeight: 1 }}>{value}</div>
            {sub && <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>{sub}</div>}
        </div>
    );
}

export function ReceiptDash({ receipts, user, onUpload, onViewAll, setSelReceipt, setView }) {
    const [topItems, setTopItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [budgets, setBudgets] = useState({});
    const [editingLoc, setEditingLoc] = useState(null);
    const [editVal, setEditVal] = useState('');
    const [saving, setSaving] = useState(false);

    const isOwner = user?.role === 'Owner';
    const isManager = user?.role === 'Manager';
    const canEditBudget = isOwner || isManager;

    const thisMonth = new Date().toISOString().slice(0, 7);
    const monthLabel = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

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

    useEffect(() => {
        fetchBudgets().then(setBudgets);
    }, []);

    const LOCS = ['Richardson', 'Fort Worth', 'Haslet'];

    const totalSpend = receipts.reduce((s, r) => s + (parseFloat(r.total) || 0), 0);

    // Use upload date (createdAt) for budget tracking so recently scanned
    // receipts always count — receipt printed dates may be from prior months
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
    const monthReceipts = receipts.filter(r => (r.createdAt || 0) >= monthStart);
    const monthSpend = monthReceipts.reduce((s, r) => s + (parseFloat(r.total) || 0), 0);

    // Per-location spending this month (by upload date)
    const locationSpend = monthReceipts.reduce((acc, r) => {
        const loc = r.location || '';
        if (loc) acc[loc] = (acc[loc] || 0) + (parseFloat(r.total) || 0);
        return acc;
    }, {});

    // Always show all known locations for owner; manager sees only theirs
    const budgetLocations = isOwner
        ? LOCS
        : isManager && user.location ? [user.location] : [];

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

    const handleEditBudget = (loc) => {
        setEditingLoc(loc);
        setEditVal(budgets[loc] ? String(budgets[loc]) : '');
    };

    const handleSaveBudget = async (loc) => {
        const amt = parseFloat(editVal);
        if (isNaN(amt) || amt < 0) { setEditingLoc(null); return; }
        setSaving(true);
        await saveBudget(loc, amt);
        setBudgets(prev => ({ ...prev, [loc]: amt }));
        setSaving(false);
        setEditingLoc(null);
    };

    return (
        <div style={{ maxWidth: '960px' }}>

            {/* Stat cards */}
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '28px' }}>
                <StatCard label="Total Receipts" value={receipts.length} accent="#cbd5e1" sub={`${monthReceipts.length} this month`} />
                <StatCard label="This Month" value={`$${monthSpend.toFixed(2)}`} accent={G} sub={monthLabel} />
                <StatCard label="All-Time Spend" value={`$${totalSpend.toFixed(2)}`} accent={G} sub={`across ${receipts.length} receipt${receipts.length !== 1 ? 's' : ''}`} />
                {!loading && topItem && (
                    <StatCard label="Top Item" value={topItem.name} accent="#f59e0b" sub={`$${topItem.totalSpend.toFixed(2)} total · ${topItem.count}x purchased`} />
                )}
            </div>

            {/* Monthly Budget Section */}
            {canEditBudget && budgetLocations.length > 0 && (
                <div style={{ background: WH, borderRadius: '16px', boxShadow: SHADOW, overflow: 'hidden', marginBottom: '28px' }}>
                    <div style={{ padding: '18px 22px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <div style={{ fontSize: '13px', fontWeight: '800', color: BK, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Monthly Budget — {monthLabel}</div>
                            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>Click a budget to edit</div>
                        </div>
                    </div>
                    <div style={{ padding: '16px 22px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {budgetLocations.map(loc => {
                            const spent = locationSpend[loc] || 0;
                            const budget = budgets[loc] || 0;
                            const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
                            const over = budget > 0 && spent > budget;
                            const isEditing = editingLoc === loc;

                            return (
                                <div key={loc}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <span style={{ fontSize: '14px', fontWeight: '800', color: BK }}>{loc}</span>
                                            {over && (
                                                <span style={{ padding: '3px 10px', background: '#fee2e2', borderRadius: '99px', fontSize: '11px', fontWeight: '800', color: RED }}>Over Budget</span>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontSize: '14px', fontWeight: '800', color: over ? RED : G }}>${spent.toFixed(2)}</span>
                                            {budget > 0 && <span style={{ fontSize: '13px', color: '#94a3b8' }}>/ </span>}
                                            {isEditing ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span style={{ fontSize: '13px', color: '#94a3b8' }}>$</span>
                                                    <input
                                                        autoFocus
                                                        type="number"
                                                        value={editVal}
                                                        onChange={e => setEditVal(e.target.value)}
                                                        onKeyDown={e => { if (e.key === 'Enter') handleSaveBudget(loc); if (e.key === 'Escape') setEditingLoc(null); }}
                                                        style={{ width: '90px', padding: '4px 8px', border: `1.5px solid ${G}`, borderRadius: '6px', fontSize: '13px', fontFamily: 'system-ui,sans-serif', outline: 'none' }}
                                                    />
                                                    <button onClick={() => handleSaveBudget(loc)} disabled={saving} style={{ padding: '4px 12px', background: G, color: WH, border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: 'system-ui,sans-serif' }}>Save</button>
                                                    <button onClick={() => setEditingLoc(null)} style={{ padding: '4px 10px', background: 'none', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '12px', color: '#64748b', cursor: 'pointer', fontFamily: 'system-ui,sans-serif' }}>Cancel</button>
                                                </div>
                                            ) : (
                                                <button onClick={() => handleEditBudget(loc)} style={{ fontSize: '13px', color: budget > 0 ? '#64748b' : G, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'system-ui,sans-serif', fontWeight: budget > 0 ? '600' : '800', padding: 0 }}>
                                                    {budget > 0 ? `$${budget.toFixed(2)} budget` : '+ Set budget'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    {budget > 0 && (
                                        <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '99px', overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: `${pct}%`, background: over ? `linear-gradient(90deg, ${RED}, #ef4444)` : `linear-gradient(90deg, ${G}, #00c47a)`, borderRadius: '99px', transition: 'width 0.5s ease' }} />
                                        </div>
                                    )}
                                    {budget > 0 && (
                                        <div style={{ fontSize: '11px', color: over ? RED : '#94a3b8', marginTop: '5px' }}>
                                            {over ? `$${(spent - budget).toFixed(2)} over limit` : `$${(budget - spent).toFixed(2)} remaining · ${Math.round(pct)}% used`}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Main grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>

                {/* Recent Receipts */}
                <div style={{ background: WH, borderRadius: '16px', boxShadow: SHADOW, overflow: 'hidden' }}>
                    <div style={{ padding: '18px 22px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ fontSize: '13px', fontWeight: '800', color: BK, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Recent Receipts</div>
                        {recent.length > 0 && (
                            <button onClick={onViewAll} style={{ background: PINK_LIGHT, border: 'none', color: G, fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: 'system-ui,sans-serif', padding: '5px 10px', borderRadius: '6px' }}>View all</button>
                        )}
                    </div>
                    <div style={{ padding: '8px 0' }}>
                        {recent.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '32px 20px' }}>
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
                <div style={{ background: WH, borderRadius: '16px', boxShadow: SHADOW, overflow: 'hidden' }}>
                    <div style={{ padding: '18px 22px', borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{ fontSize: '13px', fontWeight: '800', color: BK, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Top Vendors</div>
                    </div>
                    <div style={{ padding: '16px 22px' }}>
                        {vendorTotals.length === 0 ? (
                            <div style={{ fontSize: '13px', color: '#94a3b8', padding: '16px 0', textAlign: 'center' }}>No data yet</div>
                        ) : vendorTotals.map((v, i) => (
                            <div key={v.vendor} style={{ marginBottom: i < vendorTotals.length - 1 ? '16px' : 0 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
                                    <span style={{ fontSize: '13px', fontWeight: '700', color: BK }}>{v.vendor}</span>
                                    <div style={{ textAlign: 'right' }}>
                                        <span style={{ fontSize: '13px', fontWeight: '800', color: G }}>${v.total.toFixed(2)}</span>
                                        <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: '6px' }}>{v.count} receipt{v.count !== 1 ? 's' : ''}</span>
                                    </div>
                                </div>
                                <div style={{ height: '7px', background: '#f1f5f9', borderRadius: '99px', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${(v.total / maxVendor) * 100}%`, background: `linear-gradient(90deg, ${G}, #00c47a)`, borderRadius: '99px', transition: 'width 0.6s ease' }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Top Spend Items */}
                <div style={{ background: WH, borderRadius: '16px', boxShadow: SHADOW, overflow: 'hidden' }}>
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
