import { useState, useEffect } from 'react';
import { G, WH, BK } from '../../constants';
import { fetchReceiptItems, saveReceipt, saveReceiptItems, deleteReceipt, deleteReceiptItems } from '../../receiptDb';


export function ReceiptDetail({ receipt, onBack, onDeleted, onUpdated }) {
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
                <button onClick={onBack} style={{ background: 'none', border: '1px solid #ddd', borderRadius: '8px', padding: '7px 14px', fontSize: '13px', color: '#555', cursor: 'pointer', fontFamily: 'system-ui,sans-serif' }}>← Back</button>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '20px', fontWeight: '800', color: BK }}>{receipt.vendor}</div>
                    <div style={{ fontSize: '12px', color: '#888' }}>{receipt.date}{receipt.receiptNumber ? ` · #${receipt.receiptNumber}` : ''} · {receipt.location}</div>
                </div>
                <button onClick={handleDelete} disabled={deleting} style={{ padding: '7px 14px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: deleting ? 'not-allowed' : 'pointer', fontFamily: 'system-ui,sans-serif' }}>
                    {deleting ? 'Deleting…' : 'Delete'}
                </button>
            </div>

            {/* Totals row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                {[['Subtotal', receipt.subtotal], ['Tax', receipt.tax], ['Total', receipt.total]].map(([label, val]) => (
                    <div key={label} style={{ background: WH, borderRadius: '12px', padding: '16px 18px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                        <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '4px' }}>{label}</div>
                        <div style={{ fontSize: '20px', fontWeight: '800', color: label === 'Total' ? G : BK }}>{fmt(val)}</div>
                    </div>
                ))}
                <div style={{ background: WH, borderRadius: '12px', padding: '16px 18px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                    <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '4px' }}>Items</div>
                    <div style={{ fontSize: '20px', fontWeight: '800', color: BK }}>{receipt.itemCount ?? items.length}</div>
                </div>
            </div>

            {/* Image */}
            {receipt.imageUrl && (
                <div style={{ background: WH, borderRadius: '12px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: '16px', textAlign: 'center' }}>
                    <img src={receipt.imageUrl} alt="Receipt" style={{ maxWidth: '100%', maxHeight: '360px', objectFit: 'contain', borderRadius: '8px' }} />
                </div>
            )}

            {/* Line items */}
            <div style={{ background: WH, borderRadius: '16px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: '13px', fontWeight: '800', color: BK, marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Line Items</div>
                {loading ? (
                    <div style={{ fontSize: '13px', color: '#aaa', padding: '20px 0' }}>Loading…</div>
                ) : items.length === 0 ? (
                    <div style={{ fontSize: '13px', color: '#aaa', padding: '20px 0' }}>No items recorded.</div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                                    {['Item', 'Qty', 'Unit', 'Unit Price', 'Line Total'].map(h => (
                                        <th key={h} style={{ textAlign: 'left', padding: '6px 10px', fontWeight: '700', color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((it, i) => (
                                    <tr key={i} style={{ borderBottom: '1px solid #f8fafc' }}>
                                        <td style={{ padding: '8px 10px', fontWeight: '600', color: BK }}>{it.name}</td>
                                        <td style={{ padding: '8px 10px', color: '#475569' }}>{it.quantity}</td>
                                        <td style={{ padding: '8px 10px', color: '#94a3b8' }}>{it.unit}</td>
                                        <td style={{ padding: '8px 10px', color: '#475569' }}>${(parseFloat(it.unitPrice) || 0).toFixed(2)}</td>
                                        <td style={{ padding: '8px 10px', fontWeight: '700', color: BK }}>${(parseFloat(it.lineTotal) || 0).toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div style={{ marginTop: '14px', fontSize: '11px', color: '#aaa' }}>Uploaded by {receipt.uploadedBy}</div>
        </div>
    );
}
