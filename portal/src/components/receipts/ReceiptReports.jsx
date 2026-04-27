import { useState, useEffect } from 'react';
import { G, WH, BK } from '../../constants';
import { fetchReceiptItems } from '../../receiptDb';
import * as XLSX from 'xlsx';


export function ReceiptReports({ receipts }) {
    const [allItems, setAllItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('items');

    useEffect(() => {
        async function load() {
            const results = await Promise.all(receipts.map(r => fetchReceiptItems(r.id).then(its => its.map(it => ({ ...it, vendor: r.vendor, date: r.date, location: r.location, receiptId: r.id })))));
            setAllItems(results.flat());
            setLoading(false);
        }
        if (receipts.length) load();
        else setLoading(false);
    }, [receipts]);

    // ── Item totals ──
    const itemTotals = Object.values(
        allItems.reduce((acc, it) => {
            const key = it.name.toLowerCase();
            if (!acc[key]) acc[key] = { name: it.name, totalQty: 0, totalSpend: 0, count: 0 };
            acc[key].totalQty += parseFloat(it.quantity) || 0;
            acc[key].totalSpend += parseFloat(it.lineTotal) || 0;
            acc[key].count += 1;
            return acc;
        }, {})
    ).sort((a, b) => b.totalSpend - a.totalSpend);

    // ── Vendor totals ──
    const vendorTotals = Object.values(
        receipts.reduce((acc, r) => {
            if (!acc[r.vendor]) acc[r.vendor] = { vendor: r.vendor, totalSpend: 0, count: 0 };
            acc[r.vendor].totalSpend += parseFloat(r.total) || 0;
            acc[r.vendor].count += 1;
            return acc;
        }, {})
    ).sort((a, b) => b.totalSpend - a.totalSpend);

    // ── Price comparison: same item across vendors ──
    const priceByItemVendor = {};
    allItems.forEach(it => {
        const key = it.name.toLowerCase();
        if (!priceByItemVendor[key]) priceByItemVendor[key] = { name: it.name, vendors: {} };
        const v = it.vendor;
        if (!priceByItemVendor[key].vendors[v]) priceByItemVendor[key].vendors[v] = { prices: [], vendor: v };
        const up = parseFloat(it.unitPrice) || 0;
        if (up > 0) priceByItemVendor[key].vendors[v].prices.push(up);
    });
    const priceComparisons = Object.values(priceByItemVendor)
        .filter(entry => Object.keys(entry.vendors).length >= 2)
        .map(entry => {
            const vendors = Object.values(entry.vendors)
                .filter(v => v.prices.length > 0)
                .map(v => ({ vendor: v.vendor, avgPrice: v.prices.reduce((a, b) => a + b, 0) / v.prices.length }))
                .sort((a, b) => a.avgPrice - b.avgPrice);
            return { name: entry.name, vendors };
        });

    const handleExport = () => {
        const wb = XLSX.utils.book_new();

        // Receipts sheet
        const receiptRows = receipts.map(r => ({ Vendor: r.vendor, Date: r.date, 'Receipt #': r.receiptNumber || '', Location: r.location, Subtotal: r.subtotal, Tax: r.tax, Total: r.total, 'Uploaded By': r.uploadedBy }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(receiptRows), 'Receipts');

        // Items sheet
        const itemRows = allItems.map(it => ({ Vendor: it.vendor, Date: it.date, Item: it.name, Quantity: it.quantity, Unit: it.unit, 'Unit Price': it.unitPrice, 'Line Total': it.lineTotal }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(itemRows), 'Line Items');

        // Item totals
        const totRows = itemTotals.map(it => ({ Item: it.name, 'Total Qty': it.totalQty.toFixed(2), 'Total Spend': it.totalSpend.toFixed(2) }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(totRows), 'Item Totals');

        // Vendor sheet
        const vendRows = vendorTotals.map(v => ({ Vendor: v.vendor, 'Total Spend': v.totalSpend.toFixed(2), 'Receipts': v.count, 'Avg Receipt': (v.totalSpend / v.count).toFixed(2) }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(vendRows), 'Vendor Spending');

        XLSX.writeFile(wb, `receipts_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const tabs = [
        { id: 'items', label: 'Item Totals' },
        { id: 'vendors', label: 'Vendor Spending' },
        { id: 'compare', label: 'Price Comparison' },
    ];

    const tabBtn = (id) => ({
        padding: '8px 16px', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'system-ui,sans-serif',
        background: tab === id ? G : '#f1f5f9', color: tab === id ? WH : '#475569',
    });

    if (loading) return <div style={{ fontSize: '13px', color: '#aaa', padding: '40px' }}>Loading report data…</div>;

    return (
        <div style={{ maxWidth: '860px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ fontSize: '18px', fontWeight: '800', color: BK }}>Reports</div>
                <button onClick={handleExport} style={{ padding: '9px 18px', background: G, color: WH, border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'system-ui,sans-serif' }}>
                    Export Excel
                </button>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
                {tabs.map(t => <button key={t.id} onClick={() => setTab(t.id)} style={tabBtn(t.id)}>{t.label}</button>)}
            </div>

            {/* Item Totals */}
            {tab === 'items' && (
                <div style={{ background: WH, borderRadius: '16px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                    <div style={{ fontSize: '13px', fontWeight: '800', color: BK, marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Most Purchased Items</div>
                    {itemTotals.length === 0 ? <div style={{ color: '#aaa', fontSize: '13px' }}>No data yet.</div> : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                                    {['Item', 'Total Qty', 'Total Spend'].map(h => <th key={h} style={{ textAlign: 'left', padding: '6px 10px', color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {itemTotals.map((it, i) => (
                                    <tr key={i} style={{ borderBottom: '1px solid #f8fafc' }}>
                                        <td style={{ padding: '9px 10px', fontWeight: '600', color: BK }}>{it.name}</td>
                                        <td style={{ padding: '9px 10px', color: '#475569' }}>{it.totalQty % 1 === 0 ? it.totalQty : it.totalQty.toFixed(2)}</td>
                                        <td style={{ padding: '9px 10px', fontWeight: '700', color: G }}>${it.totalSpend.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* Vendor Spending */}
            {tab === 'vendors' && (
                <div style={{ background: WH, borderRadius: '16px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                    <div style={{ fontSize: '13px', fontWeight: '800', color: BK, marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Vendor Spending</div>
                    {vendorTotals.length === 0 ? <div style={{ color: '#aaa', fontSize: '13px' }}>No data yet.</div> : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                                    {['Vendor', 'Receipts', 'Avg Receipt', 'Total Spend'].map(h => <th key={h} style={{ textAlign: 'left', padding: '6px 10px', color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {vendorTotals.map((v, i) => (
                                    <tr key={i} style={{ borderBottom: '1px solid #f8fafc' }}>
                                        <td style={{ padding: '9px 10px', fontWeight: '700', color: BK }}>{v.vendor}</td>
                                        <td style={{ padding: '9px 10px', color: '#475569' }}>{v.count}</td>
                                        <td style={{ padding: '9px 10px', color: '#475569' }}>${(v.totalSpend / v.count).toFixed(2)}</td>
                                        <td style={{ padding: '9px 10px', fontWeight: '700', color: G }}>${v.totalSpend.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* Price Comparison */}
            {tab === 'compare' && (
                <div style={{ background: WH, borderRadius: '16px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                    <div style={{ fontSize: '13px', fontWeight: '800', color: BK, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Price Comparison</div>
                    <div style={{ fontSize: '12px', color: '#888', marginBottom: '16px' }}>Items purchased from multiple vendors — cheapest shown in green.</div>
                    {priceComparisons.length === 0 ? <div style={{ color: '#aaa', fontSize: '13px' }}>Need the same item from 2+ vendors to compare.</div> : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            {priceComparisons.map((entry, i) => (
                                <div key={i} style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '14px' }}>
                                    <div style={{ fontWeight: '700', color: BK, marginBottom: '8px', fontSize: '14px' }}>{entry.name}</div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                        {entry.vendors.map((v, j) => (
                                            <div key={j} style={{ padding: '7px 14px', borderRadius: '8px', background: j === 0 ? 'rgba(0,138,95,0.10)' : '#f8fafc', border: `1px solid ${j === 0 ? G : '#e2e8f0'}` }}>
                                                <div style={{ fontSize: '11px', color: j === 0 ? G : '#888', fontWeight: '700' }}>{v.vendor} {j === 0 ? '✓ Cheapest' : ''}</div>
                                                <div style={{ fontSize: '16px', fontWeight: '800', color: j === 0 ? G : '#475569' }}>${v.avgPrice.toFixed(2)}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
