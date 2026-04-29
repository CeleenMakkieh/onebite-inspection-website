import { useState, useEffect } from 'react';
import { G, WH, BK } from '../../constants';
import { fetchReceiptItems } from '../../receiptDb';
import * as XLSX from 'xlsx';

const SHADOW = '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)';
const TH = { textAlign: 'left', padding: '9px 12px', color: '#64748b', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '700' };

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

    const vendorTotals = Object.values(
        receipts.reduce((acc, r) => {
            if (!acc[r.vendor]) acc[r.vendor] = { vendor: r.vendor, totalSpend: 0, count: 0 };
            acc[r.vendor].totalSpend += parseFloat(r.total) || 0;
            acc[r.vendor].count += 1;
            return acc;
        }, {})
    ).sort((a, b) => b.totalSpend - a.totalSpend);

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
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(receipts.map(r => ({ Vendor: r.vendor, Date: r.date, 'Receipt #': r.receiptNumber || '', Location: r.location, Subtotal: r.subtotal, Tax: r.tax, Total: r.total, 'Uploaded By': r.uploadedBy }))), 'Receipts');
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(allItems.map(it => ({ Vendor: it.vendor, Date: it.date, Item: it.name, Quantity: it.quantity, Unit: it.unit, 'Unit Price': it.unitPrice, 'Line Total': it.lineTotal }))), 'Line Items');
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(itemTotals.map(it => ({ Item: it.name, 'Total Qty': it.totalQty.toFixed(2), 'Total Spend': it.totalSpend.toFixed(2) }))), 'Item Totals');
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(vendorTotals.map(v => ({ Vendor: v.vendor, 'Total Spend': v.totalSpend.toFixed(2), Receipts: v.count, 'Avg Receipt': (v.totalSpend / v.count).toFixed(2) }))), 'Vendor Spending');
        XLSX.writeFile(wb, `receipts_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    if (loading) return <div style={{ fontSize: '13px', color: '#94a3b8', padding: '40px' }}>Loading report data…</div>;

    const tabs = [{ id: 'items', label: 'Item Totals' }, { id: 'vendors', label: 'Vendor Spending' }, { id: 'compare', label: 'Price Comparison' }];

    return (
        <div style={{ maxWidth: '860px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ fontSize: '20px', fontWeight: '900', color: BK, letterSpacing: '-0.01em' }}>Reports</div>
                <button onClick={handleExport} style={{ padding: '10px 20px', background: G, color: WH, border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'system-ui,sans-serif' }}>Export Excel</button>
            </div>

            <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', flexWrap: 'wrap' }}>
                {tabs.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                        style={{ padding: '8px 18px', border: `1.5px solid ${tab === t.id ? G : '#e2e8f0'}`, borderRadius: '20px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'system-ui,sans-serif', background: tab === t.id ? G : WH, color: tab === t.id ? WH : '#64748b', transition: 'all 0.15s' }}>
                        {t.label}
                    </button>
                ))}
            </div>

            {tab === 'items' && (
                <div style={{ background: WH, borderRadius: '16px', boxShadow: SHADOW, overflow: 'hidden' }}>
                    <div style={{ padding: '18px 22px', borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{ fontSize: '12px', fontWeight: '800', color: BK, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Most Purchased Items</div>
                    </div>
                    {itemTotals.length === 0 ? <div style={{ color: '#94a3b8', fontSize: '13px', padding: '32px', textAlign: 'center' }}>No data yet</div> : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead><tr style={{ borderBottom: '2px solid #f1f5f9', background: '#f8fafc' }}>{['Item', 'Total Qty', 'Total Spend'].map(h => <th key={h} style={TH}>{h}</th>)}</tr></thead>
                            <tbody>
                                {itemTotals.map((it, i) => (
                                    <tr key={i} style={{ borderBottom: i < itemTotals.length - 1 ? '1px solid #f1f5f9' : 'none' }} onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                        <td style={{ padding: '11px 12px', fontWeight: '700', color: BK }}>{it.name}</td>
                                        <td style={{ padding: '11px 12px', color: '#64748b' }}>{it.totalQty % 1 === 0 ? it.totalQty : it.totalQty.toFixed(2)}</td>
                                        <td style={{ padding: '11px 12px', fontWeight: '800', color: G }}>${it.totalSpend.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {tab === 'vendors' && (
                <div style={{ background: WH, borderRadius: '16px', boxShadow: SHADOW, overflow: 'hidden' }}>
                    <div style={{ padding: '18px 22px', borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{ fontSize: '12px', fontWeight: '800', color: BK, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Vendor Spending</div>
                    </div>
                    {vendorTotals.length === 0 ? <div style={{ color: '#94a3b8', fontSize: '13px', padding: '32px', textAlign: 'center' }}>No data yet</div> : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead><tr style={{ borderBottom: '2px solid #f1f5f9', background: '#f8fafc' }}>{['Vendor', 'Receipts', 'Avg Receipt', 'Total Spend'].map(h => <th key={h} style={TH}>{h}</th>)}</tr></thead>
                            <tbody>
                                {vendorTotals.map((v, i) => (
                                    <tr key={i} style={{ borderBottom: i < vendorTotals.length - 1 ? '1px solid #f1f5f9' : 'none' }} onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                        <td style={{ padding: '11px 12px', fontWeight: '800', color: BK }}>{v.vendor}</td>
                                        <td style={{ padding: '11px 12px', color: '#64748b' }}>{v.count}</td>
                                        <td style={{ padding: '11px 12px', color: '#64748b' }}>${(v.totalSpend / v.count).toFixed(2)}</td>
                                        <td style={{ padding: '11px 12px', fontWeight: '800', color: G }}>${v.totalSpend.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {tab === 'compare' && (
                <div style={{ background: WH, borderRadius: '16px', boxShadow: SHADOW, overflow: 'hidden' }}>
                    <div style={{ padding: '18px 22px', borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{ fontSize: '12px', fontWeight: '800', color: BK, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Price Comparison</div>
                        <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '3px' }}>Items purchased from multiple vendors — cheapest in green</div>
                    </div>
                    <div style={{ padding: '16px 22px' }}>
                        {priceComparisons.length === 0 ? (
                            <div style={{ color: '#94a3b8', fontSize: '13px', padding: '16px 0', textAlign: 'center' }}>Need the same item from 2+ vendors to compare</div>
                        ) : priceComparisons.map((entry, i) => (
                            <div key={i} style={{ borderBottom: i < priceComparisons.length - 1 ? '1px solid #f1f5f9' : 'none', paddingBottom: '16px', marginBottom: i < priceComparisons.length - 1 ? '16px' : 0 }}>
                                <div style={{ fontWeight: '800', color: BK, marginBottom: '10px', fontSize: '14px' }}>{entry.name}</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {entry.vendors.map((v, j) => (
                                        <div key={j} style={{ padding: '10px 16px', borderRadius: '10px', background: j === 0 ? 'rgba(0,138,95,0.08)' : '#f8fafc', border: `1.5px solid ${j === 0 ? G : '#e2e8f0'}` }}>
                                            <div style={{ fontSize: '11px', color: j === 0 ? G : '#94a3b8', fontWeight: '700', marginBottom: '2px' }}>{v.vendor}{j === 0 ? ' — Best Price' : ''}</div>
                                            <div style={{ fontSize: '18px', fontWeight: '900', color: j === 0 ? G : '#475569' }}>${v.avgPrice.toFixed(2)}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
