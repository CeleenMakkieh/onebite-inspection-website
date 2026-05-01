import { useState, useEffect } from 'react';
import { G, WH, BK } from '../../constants';
import { fetchReceiptItems, deleteReceipt, deleteReceiptItems } from '../../receiptDb';

const SHADOW = '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)';
const TH = { textAlign: 'left', padding: '9px 12px', fontWeight: '700', color: '#64748b', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', whiteSpace: 'nowrap' };

export function ReceiptDetail({ receipt, onBack, onDeleted }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        fetchReceiptItems(receipt.id).then(its => { setItems(its); setLoading(false); });
    }, [receipt.id]);

    const handleDelete = async () => {
        if (!confirm(`Delete receipt from ${receipt.vendor} on ${receipt.date}?`)) return;
        setDeleting(true);
        await deleteReceipt(receipt.id);
        await deleteReceiptItems(receipt.id);
        onDeleted(receipt.id);
    };

    const fmt = (n) => '$' + (parseFloat(n) || 0).toFixed(2);

    return (
        <div style={{ maxWidth: '800px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
                <button onClick={onBack} style={{ background: 'transparent', border: '1.5px solid #e2e8f0', borderRadius: '8px', padding: '7px 14px', fontSize: '13px', color: '#64748b', cursor: 'pointer', fontFamily: 'system-ui,sans-serif', fontWeight: '600' }}>← Back</button>
                <div style={{ flex: 1, minWidth: '160px' }}>
                    <div style={{ fontSize: '20px', fontWeight: '900', color: BK, letterSpacing: '-0.01em' }}>{receipt.vendor}</div>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                        {receipt.date}{receipt.receiptNumber ? ` · #${receipt.receiptNumber}` : ''}{receipt.location ? ` · ${receipt.location}` : ''}
                    </div>
                </div>
                <button onClick={handleDelete} disabled={deleting} style={{ padding: '8px 16px', background: deleting ? '#f1f5f9' : '#fee2e2', color: deleting ? '#94a3b8' : '#dc2626', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: deleting ? 'not-allowed' : 'pointer', fontFamily: 'system-ui,sans-serif' }}>
                    {deleting ? 'Deleting…' : 'Delete'}
                </button>
            </div>

            {/* Totals */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '14px', marginBottom: '20px' }}>
                {[['Subtotal', receipt.subtotal, '#cbd5e1'], ['Tax', receipt.tax, '#cbd5e1'], ['Total', receipt.total, G], ['Items', receipt.itemCount ?? items.length, '#f59e0b']].map(([label, val, accent]) => (
                    <div key={label} style={{ background: WH, borderRadius: '14px', padding: '18px 20px', boxShadow: SHADOW, borderTop: `4px solid ${accent}` }}>
                        <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '700', marginBottom: '6px' }}>{label}</div>
                        <div style={{ fontSize: '22px', fontWeight: '900', color: label === 'Total' ? G : BK, letterSpacing: '-0.02em' }}>
                            {label === 'Items' ? val : fmt(val)}
                        </div>
                    </div>
                ))}
            </div>

            {/* Receipt image */}
            {receipt.imageUrl && (
                <div style={{ background: WH, borderRadius: '16px', padding: '16px', boxShadow: SHADOW, marginBottom: '16px', textAlign: 'center' }}>
                    <img src={receipt.imageUrl} alt="Receipt" style={{ maxWidth: '100%', maxHeight: '360px', objectFit: 'contain', borderRadius: '10px' }} />
                </div>
            )}

            {/* Line items */}
            <div style={{ background: WH, borderRadius: '16px', boxShadow: SHADOW, overflow: 'hidden' }}>
                <div style={{ padding: '18px 22px', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: '12px', fontWeight: '800', color: BK, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Line Items</div>
                </div>
                {loading ? (
                    <div style={{ fontSize: '13px', color: '#94a3b8', padding: '32px', textAlign: 'center' }}>Loading…</div>
                ) : items.length === 0 ? (
                    <div style={{ fontSize: '13px', color: '#94a3b8', padding: '32px', textAlign: 'center' }}>No items recorded.</div>
                ) : (() => {
                    const hasCats = items.some(it => it.category);
                    if (!hasCats) {
                        // Legacy receipts without categories — flat table
                        return (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                    <thead><tr style={{ borderBottom: '2px solid #f1f5f9', background: '#f8fafc' }}>{['Item', 'Qty', 'Unit', 'Unit Price', 'Line Total'].map(h => <th key={h} style={TH}>{h}</th>)}</tr></thead>
                                    <tbody>{items.map((it, i) => (
                                        <tr key={i} style={{ borderBottom: i < items.length - 1 ? '1px solid #f1f5f9' : 'none' }} onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                            <td style={{ padding: '11px 12px', fontWeight: '700', color: BK }}>{it.name}</td>
                                            <td style={{ padding: '11px 12px', color: '#64748b' }}>{it.quantity}</td>
                                            <td style={{ padding: '11px 12px', color: '#94a3b8' }}>{it.unit}</td>
                                            <td style={{ padding: '11px 12px', color: '#64748b' }}>${(parseFloat(it.unitPrice) || 0).toFixed(2)}</td>
                                            <td style={{ padding: '11px 12px', fontWeight: '800', color: BK }}>${(parseFloat(it.lineTotal) || 0).toFixed(2)}</td>
                                        </tr>
                                    ))}</tbody>
                                </table>
                            </div>
                        );
                    }
                    // Group by category
                    const grouped = items.reduce((acc, it) => {
                        const cat = it.category || 'Other';
                        if (!acc[cat]) acc[cat] = [];
                        acc[cat].push(it);
                        return acc;
                    }, {});
                    const CAT_ORDER = ['Meat & Poultry', 'Produce & Fresh Items', 'Dairy & Eggs', 'Dry Goods & Pantry', 'Frozen Foods', 'Beverages', 'Spices & Condiments', 'Bread & Bakery', 'Containers & Supplies', 'Cleaning & Household', 'Pickles & Preserved Items', 'Adjustments & Fees', 'Miscellaneous'];
                    const cats = [...new Set([...CAT_ORDER.filter(c => grouped[c]), ...Object.keys(grouped).filter(c => !CAT_ORDER.includes(c))])];
                    return (
                        <div>
                            {cats.map((cat, ci) => (
                                <div key={cat}>
                                    <div style={{ padding: '10px 22px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9', borderTop: ci > 0 ? '2px solid #f1f5f9' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '11px', fontWeight: '800', color: G, textTransform: 'uppercase', letterSpacing: '0.12em' }}>{cat}</span>
                                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>${grouped[cat].reduce((s, it) => s + (parseFloat(it.lineTotal) || 0), 0).toFixed(2)}</span>
                                    </div>
                                    <div style={{ overflowX: 'auto' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                            <thead><tr style={{ borderBottom: '1px solid #f1f5f9' }}>{['Item', 'Qty', 'Unit', 'Unit Price', 'Line Total'].map(h => <th key={h} style={TH}>{h}</th>)}</tr></thead>
                                            <tbody>{grouped[cat].map((it, i) => (
                                                <tr key={i} style={{ borderBottom: i < grouped[cat].length - 1 ? '1px solid #f1f5f9' : 'none' }} onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                    <td style={{ padding: '11px 12px', fontWeight: '700', color: BK }}>{it.name}</td>
                                                    <td style={{ padding: '11px 12px', color: '#64748b' }}>{it.quantity}</td>
                                                    <td style={{ padding: '11px 12px', color: '#94a3b8' }}>{it.unit}</td>
                                                    <td style={{ padding: '11px 12px', color: '#64748b' }}>${(parseFloat(it.unitPrice) || 0).toFixed(2)}</td>
                                                    <td style={{ padding: '11px 12px', fontWeight: '800', color: BK }}>${(parseFloat(it.lineTotal) || 0).toFixed(2)}</td>
                                                </tr>
                                            ))}</tbody>
                                        </table>
                                    </div>
                                </div>
                            ))}
                        </div>
                    );
                })()}
            </div>

            <div style={{ marginTop: '14px', fontSize: '11px', color: '#94a3b8' }}>Uploaded by {receipt.uploadedBy}</div>
        </div>
    );
}
