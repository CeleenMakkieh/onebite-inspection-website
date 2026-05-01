import { useState, useEffect } from 'react';
import { G, WH, BK } from '../../constants';
import { fetchReceiptItems } from '../../receiptDb';
import XLSX from 'xlsx-js-style';

const SHADOW = '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)';
const TH = { textAlign: 'left', padding: '9px 12px', color: '#64748b', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '700' };

// Excel cell styles matching app palette (no # prefix for rgb)
const XL = {
    colHeader: { fill: { fgColor: { rgb: '008a5f' } }, font: { color: { rgb: 'FFFFFF' }, bold: true, sz: 10, name: 'Arial' }, alignment: { horizontal: 'left', vertical: 'center' } },
    catHeader: { fill: { fgColor: { rgb: '005c3f' } }, font: { color: { rgb: 'FFFFFF' }, bold: true, sz: 11, name: 'Arial' }, alignment: { horizontal: 'left', vertical: 'center' } },
    subtotal:  { fill: { fgColor: { rgb: 'e6f5ef' } }, font: { color: { rgb: '005c3f' }, bold: true, sz: 10, name: 'Arial' }, alignment: { horizontal: 'left', vertical: 'center' } },
    subtotalN: { fill: { fgColor: { rgb: 'e6f5ef' } }, font: { color: { rgb: '005c3f' }, bold: true, sz: 10, name: 'Arial' }, alignment: { horizontal: 'right', vertical: 'center' }, numFmt: '"$"#,##0.00' },
    data:      { fill: { fgColor: { rgb: 'FFFFFF' } }, font: { color: { rgb: '111111' }, sz: 10, name: 'Arial' }, alignment: { horizontal: 'left', vertical: 'center' } },
    dataN:     { fill: { fgColor: { rgb: 'FFFFFF' } }, font: { color: { rgb: '111111' }, sz: 10, name: 'Arial' }, alignment: { horizontal: 'right', vertical: 'center' }, numFmt: '"$"#,##0.00' },
    review:    { fill: { fgColor: { rgb: 'fef3c7' } }, font: { color: { rgb: 'd97706' }, bold: true, sz: 10, name: 'Arial' }, alignment: { horizontal: 'left', vertical: 'center' } },
    blank:     { fill: { fgColor: { rgb: 'f8fafc' } }, font: { sz: 10, name: 'Arial' } },
};

const CAT_ORDER = ['Meat & Poultry', 'Produce & Fresh Items', 'Dairy & Eggs', 'Dry Goods & Pantry', 'Frozen Foods', 'Beverages', 'Spices & Condiments', 'Bread & Bakery', 'Containers & Supplies', 'Cleaning & Household', 'Pickles & Preserved Items', 'Adjustments & Fees', 'Miscellaneous'];

const today = new Date().toISOString().split('T')[0];
const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

export function ReceiptReports({ receipts }) {
    const [allItems, setAllItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('categories');
    const [exportFrom, setExportFrom] = useState(firstOfMonth);
    const [exportTo, setExportTo] = useState(today);

    useEffect(() => {
        async function load() {
            const results = await Promise.all(receipts.map(r => fetchReceiptItems(r.id).then(its => its.map(it => ({ ...it, vendor: r.vendor, date: r.date, location: r.location, receiptId: r.id })))));
            setAllItems(results.flat());
            setLoading(false);
        }
        if (receipts.length) load();
        else setLoading(false);
    }, [receipts]);

    // Items within export date range (for the count badge)
    const exportReceiptIds = new Set(
        receipts.filter(r => (!exportFrom || r.date >= exportFrom) && (!exportTo || r.date <= exportTo)).map(r => r.id)
    );
    const exportCount = allItems.filter(it => exportReceiptIds.has(it.receiptId)).length;

    const itemTotals = Object.values(
        allItems.reduce((acc, it) => {
            const key = it.name.toLowerCase();
            if (!acc[key]) acc[key] = { name: it.name, category: it.category || '', totalQty: 0, totalSpend: 0, count: 0 };
            acc[key].totalQty += parseFloat(it.quantity) || 0;
            acc[key].totalSpend += parseFloat(it.lineTotal) || 0;
            acc[key].count += 1;
            return acc;
        }, {})
    ).sort((a, b) => b.totalSpend - a.totalSpend);

    const categoryTotals = Object.values(
        allItems.reduce((acc, it) => {
            const cat = it.category || 'Other';
            if (!acc[cat]) acc[cat] = { category: cat, totalSpend: 0, count: 0 };
            acc[cat].totalSpend += parseFloat(it.lineTotal) || 0;
            acc[cat].count += 1;
            return acc;
        }, {})
    ).sort((a, b) => {
        const ai = CAT_ORDER.indexOf(a.category);
        const bi = CAT_ORDER.indexOf(b.category);
        if (ai === -1 && bi === -1) return b.totalSpend - a.totalSpend;
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
    });
    const maxCatSpend = categoryTotals.reduce((m, c) => Math.max(m, c.totalSpend), 0);

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

    function styleSheet(ws, rowMeta, totalCol, numCols) {
        rowMeta.forEach((type, r) => {
            for (let c = 0; c < numCols; c++) {
                const cellRef = XLSX.utils.encode_cell({ r, c });
                if (!ws[cellRef]) ws[cellRef] = { v: '', t: 's' };
                const isNum = c === totalCol || c === totalCol - 1; // unit price + total
                if (type === 'colheader') ws[cellRef].s = XL.colHeader;
                else if (type === 'catHeader') ws[cellRef].s = XL.catHeader;
                else if (type === 'subtotal') ws[cellRef].s = (c === totalCol) ? XL.subtotalN : XL.subtotal;
                else if (type === 'review') ws[cellRef].s = (c === numCols - 1) ? XL.review : (c === totalCol ? XL.dataN : XL.data);
                else if (type === 'data') ws[cellRef].s = (c === totalCol) ? XL.dataN : XL.data;
                else if (type === 'blank') ws[cellRef].s = XL.blank;
            }
        });
    }

    const handleExport = () => {
        const wb = XLSX.utils.book_new();

        // Filter by date range
        const fReceipts = receipts.filter(r => (!exportFrom || r.date >= exportFrom) && (!exportTo || r.date <= exportTo));
        const fIds = new Set(fReceipts.map(r => r.id));
        const fItems = allItems.filter(it => fIds.has(it.receiptId));

        // ── Sheet 1: By Category ──
        const catCols = 7;
        const catTotalCol = 5; // 0-indexed "Total ($)"
        const catAoa = [['Category', 'Receipt #', 'Date', 'Vendor', 'Item', 'Total ($)', 'Notes']];
        const catMeta = ['colheader'];

        const catGrouped = {};
        fItems.forEach(it => {
            const cat = it.category || 'Miscellaneous';
            if (!catGrouped[cat]) catGrouped[cat] = [];
            catGrouped[cat].push(it);
        });
        const orderedCats = [...CAT_ORDER.filter(c => catGrouped[c]), ...Object.keys(catGrouped).filter(c => !CAT_ORDER.includes(c))];

        orderedCats.forEach(cat => {
            catAoa.push([cat, '', '', '', '', '', '']);
            catMeta.push('catHeader');
            catGrouped[cat].forEach(it => {
                const rcpt = fReceipts.find(r => r.id === it.receiptId);
                catAoa.push(['', rcpt?.receiptNumber || it.receiptId, it.date, it.vendor, it.name, parseFloat(it.lineTotal) || 0, it.needsReview ? 'Needs Review' : '']);
                catMeta.push(it.needsReview ? 'review' : 'data');
            });
            const sub = catGrouped[cat].reduce((s, it) => s + (parseFloat(it.lineTotal) || 0), 0);
            catAoa.push([`${cat} — Subtotal`, '', '', '', '', sub, '']);
            catMeta.push('subtotal');
            catAoa.push(['', '', '', '', '', '', '']);
            catMeta.push('blank');
        });

        const catWs = XLSX.utils.aoa_to_sheet(catAoa);
        catWs['!cols'] = [{ wch: 30 }, { wch: 12 }, { wch: 12 }, { wch: 22 }, { wch: 36 }, { wch: 13 }, { wch: 26 }];
        styleSheet(catWs, catMeta, catTotalCol, catCols);
        XLSX.utils.book_append_sheet(wb, catWs, 'By Category');

        // ── Sheet 2: Detailed ──
        const detCols = 10;
        const detHeaders = ['Receipt #', 'Date Purchased', 'Vendor', 'Item', 'Category', 'Qty', 'Unit', 'Unit Price ($)', 'Total ($)', 'Needs Review'];
        const detAoa = [detHeaders];
        const detMeta = ['colheader'];

        fItems.forEach(it => {
            const rcpt = fReceipts.find(r => r.id === it.receiptId);
            detAoa.push([
                rcpt?.receiptNumber || it.receiptId,
                it.date,
                it.vendor,
                it.name,
                it.category || '',
                parseFloat(it.quantity) || 1,
                it.unit || '',
                parseFloat(it.unitPrice) || 0,
                parseFloat(it.lineTotal) || 0,
                it.needsReview ? 'Yes' : '',
            ]);
            detMeta.push(it.needsReview ? 'review' : 'data');
        });

        const detWs = XLSX.utils.aoa_to_sheet(detAoa);
        detWs['!cols'] = [{ wch: 12 }, { wch: 15 }, { wch: 22 }, { wch: 36 }, { wch: 22 }, { wch: 7 }, { wch: 7 }, { wch: 14 }, { wch: 13 }, { wch: 14 }];

        // Style detailed sheet — unit price col = 7, total col = 8, review col = 9
        detMeta.forEach((type, r) => {
            for (let c = 0; c < detCols; c++) {
                const cellRef = XLSX.utils.encode_cell({ r, c });
                if (!detWs[cellRef]) detWs[cellRef] = { v: '', t: 's' };
                if (type === 'colheader') detWs[cellRef].s = XL.colHeader;
                else if (type === 'review') detWs[cellRef].s = (c === 9) ? XL.review : (c === 7 || c === 8) ? XL.dataN : XL.data;
                else detWs[cellRef].s = (c === 7 || c === 8) ? XL.dataN : XL.data;
            }
        });
        XLSX.utils.book_append_sheet(wb, detWs, 'Detailed');

        const label = exportFrom && exportTo ? `${exportFrom}_to_${exportTo}` : today;
        XLSX.writeFile(wb, `receipts_${label}.xlsx`);
    };

    if (loading) return <div style={{ fontSize: '13px', color: '#94a3b8', padding: '40px' }}>Loading report data…</div>;

    const tabs = [{ id: 'categories', label: 'By Category' }, { id: 'items', label: 'Item Totals' }, { id: 'vendors', label: 'Vendor Spending' }, { id: 'compare', label: 'Price Comparison' }];

    return (
        <div style={{ maxWidth: '860px' }}>
            <div style={{ fontSize: '20px', fontWeight: '900', color: BK, letterSpacing: '-0.01em', marginBottom: '18px' }}>Reports</div>

            {/* Export card */}
            <div style={{ background: WH, borderRadius: '14px', boxShadow: SHADOW, padding: '16px 20px', marginBottom: '22px', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
                <div style={{ fontSize: '11px', fontWeight: '800', color: BK, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Export Excel</div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
                    <input type="date" value={exportFrom} onChange={e => setExportFrom(e.target.value)}
                        style={{ border: '1px solid #ddd', borderRadius: '7px', padding: '7px 10px', fontSize: '13px', fontFamily: 'system-ui,sans-serif', outline: 'none' }} />
                    <span style={{ color: '#94a3b8', fontSize: '13px', fontWeight: '600' }}>to</span>
                    <input type="date" value={exportTo} onChange={e => setExportTo(e.target.value)}
                        style={{ border: '1px solid #ddd', borderRadius: '7px', padding: '7px 10px', fontSize: '13px', fontFamily: 'system-ui,sans-serif', outline: 'none' }} />
                    <span style={{ fontSize: '12px', color: '#94a3b8', whiteSpace: 'nowrap' }}>{exportCount} item{exportCount !== 1 ? 's' : ''} in range</span>
                </div>
                <button onClick={handleExport}
                    style={{ padding: '9px 22px', background: G, color: WH, border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'system-ui,sans-serif', flexShrink: 0 }}>
                    Export
                </button>
            </div>

            <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', flexWrap: 'wrap' }}>
                {tabs.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                        style={{ padding: '8px 18px', border: `1.5px solid ${tab === t.id ? G : '#e2e8f0'}`, borderRadius: '20px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'system-ui,sans-serif', background: tab === t.id ? G : WH, color: tab === t.id ? WH : '#64748b', transition: 'all 0.15s' }}>
                        {t.label}
                    </button>
                ))}
            </div>

            {tab === 'categories' && (
                <div style={{ background: WH, borderRadius: '16px', boxShadow: SHADOW, overflow: 'hidden' }}>
                    <div style={{ padding: '18px 22px', borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{ fontSize: '12px', fontWeight: '800', color: BK, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Spending by Category</div>
                    </div>
                    {categoryTotals.length === 0 ? <div style={{ color: '#94a3b8', fontSize: '13px', padding: '32px', textAlign: 'center' }}>No data yet — scan receipts to see categories</div> : (
                        <div style={{ padding: '8px 0' }}>
                            {categoryTotals.map((cat, i) => (
                                <div key={i} style={{ padding: '14px 22px', borderBottom: i < categoryTotals.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                        <div style={{ fontWeight: '700', fontSize: '13px', color: BK }}>{cat.category}</div>
                                        <div style={{ fontSize: '14px', fontWeight: '800', color: G }}>${cat.totalSpend.toFixed(2)}</div>
                                    </div>
                                    <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '99px', overflow: 'hidden' }}>
                                        <div style={{ height: '100%', borderRadius: '99px', background: `linear-gradient(90deg, ${G}, #00c47a)`, width: `${maxCatSpend > 0 ? (cat.totalSpend / maxCatSpend) * 100 : 0}%`, transition: 'width 0.4s ease' }} />
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '5px' }}>{cat.count} line item{cat.count !== 1 ? 's' : ''}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {tab === 'items' && (
                <div style={{ background: WH, borderRadius: '16px', boxShadow: SHADOW, overflow: 'hidden' }}>
                    <div style={{ padding: '18px 22px', borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{ fontSize: '12px', fontWeight: '800', color: BK, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Most Purchased Items</div>
                    </div>
                    {itemTotals.length === 0 ? <div style={{ color: '#94a3b8', fontSize: '13px', padding: '32px', textAlign: 'center' }}>No data yet</div> : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead><tr style={{ borderBottom: '2px solid #f1f5f9', background: '#f8fafc' }}>{['Item', 'Category', 'Total Qty', 'Total Spend'].map(h => <th key={h} style={TH}>{h}</th>)}</tr></thead>
                            <tbody>
                                {itemTotals.map((it, i) => (
                                    <tr key={i} style={{ borderBottom: i < itemTotals.length - 1 ? '1px solid #f1f5f9' : 'none' }} onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                        <td style={{ padding: '11px 12px', fontWeight: '700', color: BK }}>{it.name}</td>
                                        <td style={{ padding: '11px 12px' }}>{it.category ? <span style={{ padding: '3px 10px', background: 'rgba(0,138,95,0.08)', borderRadius: '99px', fontSize: '11px', fontWeight: '700', color: G }}>{it.category}</span> : <span style={{ color: '#94a3b8', fontSize: '12px' }}>—</span>}</td>
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
