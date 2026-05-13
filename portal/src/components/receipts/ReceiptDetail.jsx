import { useState, useEffect } from 'react';
import { G, WH, BK } from '../../constants';
import { fetchReceipt, fetchReceiptItems, deleteReceipt, deleteReceiptItems, saveReceipt, saveReceiptItems } from '../../receiptDb';

const SHADOW = '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)';
const TH = { textAlign: 'left', padding: '9px 12px', fontWeight: '700', color: '#64748b', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', whiteSpace: 'nowrap' };
const CATEGORIES = ['Meat & Poultry', 'Produce & Fresh Items', 'Dairy & Eggs', 'Dry Goods & Pantry', 'Frozen Foods', 'Beverages', 'Spices & Condiments', 'Bread & Bakery', 'Containers & Supplies', 'Cleaning & Household', 'Pickles & Preserved Items', 'Adjustments & Fees', 'Miscellaneous'];

const INPUT = { fontFamily: 'system-ui,sans-serif', fontSize: '13px', border: '1.5px solid #e2e8f0', borderRadius: '6px', padding: '5px 8px', outline: 'none', background: '#f8fafc', width: '100%', boxSizing: 'border-box' };
const NUM_INPUT = { ...INPUT, width: '80px' };

function blankItem() {
    return { name: '', category: 'Miscellaneous', quantity: 1, unit: 'ea', unitPrice: 0, lineTotal: 0, needsReview: false };
}

export function ReceiptDetail({ receipt, user, onBack, onDeleted }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(false);
    const [imageUrl, setImageUrl] = useState(receipt.imageUrl || '');

    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editReceipt, setEditReceipt] = useState(null);
    const [editItems, setEditItems] = useState([]);
    const [recleaning, setRecleaning] = useState(false);
    const [recleanMsg, setRecleanMsg] = useState('');

    useEffect(() => {
        fetchReceiptItems(receipt.id).then(its => { setItems(its); setLoading(false); });
    }, [receipt.id]);

    // Poll for imageUrl in case background upload hasn't finished yet
    useEffect(() => {
        if (imageUrl) return;
        let attempts = 0;
        const interval = setInterval(async () => {
            attempts++;
            const fresh = await fetchReceipt(receipt.id);
            if (fresh?.imageUrl) { setImageUrl(fresh.imageUrl); clearInterval(interval); }
            if (attempts >= 10) clearInterval(interval);
        }, 3000);
        return () => clearInterval(interval);
    }, [receipt.id, imageUrl]);

    const handleDelete = async () => {
        if (!confirm(`Delete receipt from ${receipt.vendor} on ${receipt.date}?`)) return;
        setDeleting(true);
        await deleteReceipt(receipt.id);
        await deleteReceiptItems(receipt.id);
        onDeleted(receipt.id);
    };

    const startEdit = () => {
        setEditReceipt({ vendor: receipt.vendor, date: receipt.date, receiptNumber: receipt.receiptNumber || '', subtotal: receipt.subtotal, tax: receipt.tax, total: receipt.total });
        setEditItems(items.map(it => ({ ...it })));
        setEditing(true);
    };

    const cancelEdit = () => { setEditing(false); setEditReceipt(null); setEditItems([]); };

    const handleReclean = async () => {
        if (items.length === 0) return;
        setRecleaning(true);
        setRecleanMsg('');
        try {
            const names = items.map(it => it.name);
            const res = await fetch('/.netlify/functions/clean-items', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ names }),
            });
            const text = await res.text();
            let cleaned;
            try { cleaned = JSON.parse(text); } catch (_) {
                throw new Error('Server returned an unreadable response. Make sure the site is deployed or run netlify dev locally.');
            }
            if (!res.ok) throw new Error(cleaned?.error || 'Re-clean failed');
            if (Array.isArray(cleaned) && cleaned.length === items.length) {
                const updated = items.map((it, i) => ({
                    ...it,
                    name: cleaned[i]?.name || it.name,
                    category: cleaned[i]?.category || it.category,
                    needsReview: cleaned[i]?.confident === false,
                }));
                await saveReceiptItems(receipt.id, updated);
                setItems(updated);
                setRecleanMsg(`Updated ${items.length} items.`);
            }
        } catch (e) {
            setRecleanMsg('Error: ' + e.message);
        }
        setRecleaning(false);
    };

    const setItemField = (i, field, value) => {
        setEditItems(prev => {
            const next = prev.map((it, idx) => idx === i ? { ...it, [field]: value } : it);
            // Recalculate lineTotal when qty or unitPrice changes
            if (field === 'quantity' || field === 'unitPrice') {
                const it = next[i];
                const qty = parseFloat(it.quantity) || 0;
                const up = parseFloat(it.unitPrice) || 0;
                next[i] = { ...next[i], lineTotal: Math.round(qty * up * 100) / 100 };
            }
            return next;
        });
    };

    const addItem = () => setEditItems(prev => [...prev, blankItem()]);
    const removeItem = (i) => setEditItems(prev => prev.filter((_, idx) => idx !== i));

    const handleSave = async () => {
        setSaving(true);
        const itemCount = editItems.length;
        const updatedReceipt = { ...receipt, ...editReceipt, itemCount };
        await saveReceipt(updatedReceipt);
        await saveReceiptItems(receipt.id, editItems.map(it => {
            const { needsReview, ...rest } = it;
            return { ...rest, needsReview: false }; // clear review flag on manual save
        }));
        // Reflect changes locally
        Object.assign(receipt, updatedReceipt);
        setItems(editItems.map(it => ({ ...it, needsReview: false })));
        setEditing(false);
        setSaving(false);
    };

    const fmt = (n) => '$' + (parseFloat(n) || 0).toFixed(2);

    const displayReceipt = editing ? { ...receipt, ...editReceipt } : receipt;
    const displayItems = editing ? editItems : items;

    const itemsSum = displayItems.reduce((s, it) => s + (parseFloat(it.lineTotal) || 0), 0);
    const subtotalVal = parseFloat(displayReceipt.subtotal) || 0;
    const taxVal = parseFloat(displayReceipt.tax) || 0;
    const totalVal = parseFloat(displayReceipt.total) || 0;
    const mathWarnings = [];
    if (displayItems.length > 0 && subtotalVal > 0 && Math.abs(itemsSum - subtotalVal) > 0.05) {
        mathWarnings.push(`Item totals add up to ${fmt(itemsSum)}, but subtotal is ${fmt(subtotalVal)} (difference: ${fmt(Math.abs(itemsSum - subtotalVal))}).`);
    }
    if (subtotalVal > 0 && totalVal > 0 && Math.abs(subtotalVal + taxVal - totalVal) > 0.05) {
        mathWarnings.push(`Subtotal ${fmt(subtotalVal)} + tax ${fmt(taxVal)} = ${fmt(subtotalVal + taxVal)}, but total is ${fmt(totalVal)}.`);
    }

    return (
        <div style={{ maxWidth: '800px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
                <button onClick={editing ? cancelEdit : onBack} style={{ background: 'transparent', border: '1.5px solid #e2e8f0', borderRadius: '8px', padding: '7px 14px', fontSize: '13px', color: '#64748b', cursor: 'pointer', fontFamily: 'system-ui,sans-serif', fontWeight: '600' }}>
                    {editing ? 'Cancel' : '← Back'}
                </button>
                <div style={{ flex: 1, minWidth: '160px' }}>
                    {editing ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                            <input value={editReceipt.vendor} onChange={e => setEditReceipt(r => ({ ...r, vendor: e.target.value }))} placeholder="Vendor" style={{ ...INPUT, width: '160px', fontSize: '15px', fontWeight: '800' }} />
                            <input type="date" value={editReceipt.date} onChange={e => setEditReceipt(r => ({ ...r, date: e.target.value }))} style={{ ...INPUT, width: '140px' }} />
                            <input value={editReceipt.receiptNumber} onChange={e => setEditReceipt(r => ({ ...r, receiptNumber: e.target.value }))} placeholder="Receipt #" style={{ ...INPUT, width: '110px' }} />
                        </div>
                    ) : (
                        <>
                            <div style={{ fontSize: '20px', fontWeight: '900', color: BK, letterSpacing: '-0.01em' }}>{receipt.vendor}</div>
                            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                                {receipt.date}{receipt.receiptNumber ? ` · #${receipt.receiptNumber}` : ''}{receipt.location ? ` · ${receipt.location}` : ''}
                            </div>
                        </>
                    )}
                </div>
                {user?.role === 'Owner' && !editing && (
                    <>
                        <button onClick={handleReclean} disabled={recleaning || loading} style={{ padding: '8px 16px', background: recleaning ? '#f1f5f9' : '#f0fdf4', color: recleaning ? '#94a3b8' : G, border: `1.5px solid ${recleaning ? '#e2e8f0' : G}`, borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: recleaning || loading ? 'not-allowed' : 'pointer', fontFamily: 'system-ui,sans-serif' }}>
                            {recleaning ? 'Re-cleaning…' : 'Re-clean with AI'}
                        </button>
                        <button onClick={startEdit} style={{ padding: '8px 16px', background: '#eff6ff', color: '#2563eb', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: 'system-ui,sans-serif' }}>Edit</button>
                        <button onClick={handleDelete} disabled={deleting} style={{ padding: '8px 16px', background: deleting ? '#f1f5f9' : '#fee2e2', color: deleting ? '#94a3b8' : '#dc2626', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: deleting ? 'not-allowed' : 'pointer', fontFamily: 'system-ui,sans-serif' }}>
                            {deleting ? 'Deleting…' : 'Delete'}
                        </button>
                    </>
                )}
                {editing && (
                    <button onClick={handleSave} disabled={saving} style={{ padding: '8px 20px', background: saving ? '#f1f5f9' : G, color: saving ? '#94a3b8' : WH, border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'system-ui,sans-serif' }}>
                        {saving ? 'Saving…' : 'Save Changes'}
                    </button>
                )}
            </div>

            {recleanMsg && (
                <div style={{ marginBottom: '16px', padding: '10px 16px', background: recleanMsg.startsWith('Error') ? '#fee2e2' : '#f0fdf4', border: `1px solid ${recleanMsg.startsWith('Error') ? '#fca5a5' : '#bbf7d0'}`, borderRadius: '8px', fontSize: '13px', color: recleanMsg.startsWith('Error') ? '#991b1b' : '#166534', fontWeight: '600' }}>
                    {recleanMsg}
                </div>
            )}

            {/* Totals */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '14px', marginBottom: '20px' }}>
                {[['Subtotal', 'subtotal', '#cbd5e1'], ['Tax', 'tax', '#cbd5e1'], ['Total', 'total', G]].map(([label, field, accent]) => (
                    <div key={label} style={{ background: WH, borderRadius: '14px', padding: '18px 20px', boxShadow: SHADOW, borderTop: `4px solid ${accent}` }}>
                        <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '700', marginBottom: '6px' }}>{label}</div>
                        {editing ? (
                            <input type="number" step="0.01" value={editReceipt[field]} onChange={e => setEditReceipt(r => ({ ...r, [field]: e.target.value }))} style={{ ...INPUT, fontSize: '18px', fontWeight: '900', color: field === 'total' ? G : BK, width: '100%' }} />
                        ) : (
                            <div style={{ fontSize: '22px', fontWeight: '900', color: label === 'Total' ? G : BK, letterSpacing: '-0.02em' }}>{fmt(displayReceipt[field])}</div>
                        )}
                    </div>
                ))}
                <div style={{ background: WH, borderRadius: '14px', padding: '18px 20px', boxShadow: SHADOW, borderTop: '4px solid #f59e0b' }}>
                    <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '700', marginBottom: '6px' }}>Items</div>
                    <div style={{ fontSize: '22px', fontWeight: '900', color: BK, letterSpacing: '-0.02em' }}>{displayItems.length}</div>
                </div>
            </div>

            {/* Math warnings */}
            {mathWarnings.length > 0 && (
                <div style={{ marginBottom: '16px', padding: '12px 16px', background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '10px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '800', color: '#92400e', marginBottom: '4px' }}>Numbers don't add up</div>
                    {mathWarnings.map((w, i) => (
                        <div key={i} style={{ fontSize: '12px', color: '#92400e', lineHeight: 1.5 }}>{w}</div>
                    ))}
                    <div style={{ fontSize: '11px', color: '#b45309', marginTop: '6px' }}>Use Edit to correct the amounts.</div>
                </div>
            )}

            {/* Receipt image */}
            {imageUrl ? (
                <div style={{ background: WH, borderRadius: '16px', padding: '16px', boxShadow: SHADOW, marginBottom: '16px', textAlign: 'center' }}>
                    <img src={imageUrl} alt="Receipt" style={{ maxWidth: '100%', maxHeight: '360px', objectFit: 'contain', borderRadius: '10px' }} />
                </div>
            ) : (
                <div style={{ background: WH, borderRadius: '16px', padding: '14px 20px', boxShadow: SHADOW, marginBottom: '16px', fontSize: '12px', color: '#94a3b8' }}>
                    Photo uploading in background…
                </div>
            )}

            {/* Line items */}
            <div style={{ background: WH, borderRadius: '16px', boxShadow: SHADOW, overflow: 'hidden' }}>
                <div style={{ padding: '18px 22px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: '12px', fontWeight: '800', color: BK, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Line Items</div>
                    {editing && (
                        <button onClick={addItem} style={{ fontSize: '12px', fontWeight: '700', color: G, background: '#f0fdf4', border: `1.5px solid ${G}`, borderRadius: '7px', padding: '5px 12px', cursor: 'pointer', fontFamily: 'system-ui,sans-serif' }}>+ Add Item</button>
                    )}
                </div>
                {loading ? (
                    <div style={{ fontSize: '13px', color: '#94a3b8', padding: '32px', textAlign: 'center' }}>Loading…</div>
                ) : editing ? (
                    // Edit mode — flat editable table
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid #f1f5f9', background: '#f8fafc' }}>
                                    {['Item', 'Category', 'Qty', 'Unit', 'Unit Price', 'Line Total', ''].map(h => <th key={h} style={TH}>{h}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {editItems.map((it, i) => (
                                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '8px 10px', minWidth: '160px' }}>
                                            <input value={it.name} onChange={e => setItemField(i, 'name', e.target.value)} style={INPUT} />
                                        </td>
                                        <td style={{ padding: '8px 10px', minWidth: '160px' }}>
                                            <select value={it.category || ''} onChange={e => setItemField(i, 'category', e.target.value)} style={{ ...INPUT, padding: '5px 6px' }}>
                                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </td>
                                        <td style={{ padding: '8px 10px' }}>
                                            <input type="number" step="0.01" value={it.quantity} onChange={e => setItemField(i, 'quantity', e.target.value)} style={NUM_INPUT} />
                                        </td>
                                        <td style={{ padding: '8px 10px' }}>
                                            <input value={it.unit} onChange={e => setItemField(i, 'unit', e.target.value)} style={{ ...INPUT, width: '60px' }} />
                                        </td>
                                        <td style={{ padding: '8px 10px' }}>
                                            <input type="number" step="0.01" value={it.unitPrice} onChange={e => setItemField(i, 'unitPrice', e.target.value)} style={NUM_INPUT} />
                                        </td>
                                        <td style={{ padding: '8px 12px', fontWeight: '800', color: BK, whiteSpace: 'nowrap' }}>
                                            ${(parseFloat(it.lineTotal) || 0).toFixed(2)}
                                        </td>
                                        <td style={{ padding: '8px 10px' }}>
                                            <button onClick={() => removeItem(i)} title="Remove item" style={{ background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '6px', padding: '4px 9px', fontSize: '12px', cursor: 'pointer', fontFamily: 'system-ui,sans-serif', fontWeight: '700' }}>✕</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : displayItems.length === 0 ? (
                    <div style={{ fontSize: '13px', color: '#94a3b8', padding: '32px', textAlign: 'center' }}>No items recorded.</div>
                ) : (() => {
                    const hasCats = displayItems.some(it => it.category);
                    if (!hasCats) {
                        return (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                    <thead><tr style={{ borderBottom: '2px solid #f1f5f9', background: '#f8fafc' }}>{['Item', 'Qty', 'Unit', 'Unit Price', 'Line Total'].map(h => <th key={h} style={TH}>{h}</th>)}</tr></thead>
                                    <tbody>{displayItems.map((it, i) => (
                                        <tr key={i} style={{ borderBottom: i < displayItems.length - 1 ? '1px solid #f1f5f9' : 'none' }} onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                            <td style={{ padding: '11px 12px', fontWeight: '700', color: BK }}>
                                                {it.name}
                                                {it.needsReview && <span title="Name may be inaccurate — needs review" style={{ marginLeft: '6px', fontSize: '10px', background: '#fef3c7', color: '#d97706', padding: '1px 6px', borderRadius: '99px', fontWeight: '700', verticalAlign: 'middle' }}>Review</span>}
                                            </td>
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
                    const grouped = displayItems.reduce((acc, it) => {
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
                                                    <td style={{ padding: '11px 12px', fontWeight: '700', color: BK }}>
                                                        {it.name}
                                                        {it.needsReview && <span title="Name may be inaccurate — needs review" style={{ marginLeft: '6px', fontSize: '10px', background: '#fef3c7', color: '#d97706', padding: '1px 6px', borderRadius: '99px', fontWeight: '700', verticalAlign: 'middle' }}>Review</span>}
                                                    </td>
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
