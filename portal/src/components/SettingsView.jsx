import { useState } from 'react';
import { Card, inp, lbl, gbtn, ghos } from './ui';
import { G, WH, BK } from '../constants';
import { saveSetting } from '../db';

const secHead = {
    fontSize: "11px", letterSpacing: "0.18em", textTransform: "uppercase",
    color: G, margin: "0 0 14px 0", paddingBottom: "8px",
    borderBottom: `2px solid ${G}`, fontWeight: "700"
};

const smBtn = (variant = 'default') => ({
    padding: "4px 10px",
    background: variant === 'danger' ? "#fff5f5" : variant === 'primary' ? G : WH,
    border: variant === 'danger' ? "1.5px solid #fca5a5" : variant === 'primary' ? "none" : "1.5px solid #ddd",
    borderRadius: "6px",
    color: variant === 'danger' ? "#991b1b" : variant === 'primary' ? WH : "#555",
    fontSize: "11px", cursor: "pointer", fontWeight: "600", fontFamily: "system-ui,sans-serif"
});

function rangeLabel(min, max) {
    if (min != null && max != null) return `${min}°F – ${max}°F`;
    if (min != null) return `≥ ${min}°F`;
    if (max != null) return `≤ ${max}°F`;
    return 'No range set';
}

const parseNum = (v) => (v === '' || v === null || v === undefined) ? null : parseFloat(v);

function HasletAddressField({ value, onSave }) {
    const [draft, setDraft] = useState(value || '');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const handleSave = async () => {
        setSaving(true);
        await onSave(draft.trim());
        setSaving(false);
        setSaved(true);
    };
    return (
        <div style={{ display: "flex", alignItems: "flex-end", gap: "10px" }}>
            <div style={{ flex: 1 }}>
                <label style={lbl}>Current Address</label>
                <input value={draft} onChange={e => { setDraft(e.target.value); setSaved(false); }}
                    placeholder="e.g. 123 Main St, Haslet, TX 76052"
                    style={{ ...inp, width: "100%" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <button onClick={handleSave} disabled={saving}
                    style={{ ...gbtn, padding: "8px 18px", fontSize: "13px", opacity: saving ? 0.6 : 1 }}>
                    {saving ? "Saving…" : "Update"}
                </button>
                {saved && <span style={{ fontSize: "11px", color: "#16a34a", fontWeight: "600", textAlign: "center" }}>✓ Saved</span>}
            </div>
        </div>
    );
}

export function SettingsView({ user, inspCats, setInspCats, tempItems, setTempItems, appliances, setAppliances, tempRequired, setTempRequired, appliancesRequired, setAppliancesRequired, hasletAddress, setHasletAddress, locationCodes, setLocationCodes }) {
    // ── Category section state ──
    const [editCatId, setEditCatId] = useState(null);
    const [editCatName, setEditCatName] = useState('');
    const [addingCat, setAddingCat] = useState(false);
    const [newCatName, setNewCatName] = useState('');
    const [catItemState, setCatItemState] = useState({});

    // ── Temp section state ──
    const [editTempId, setEditTempId] = useState(null);
    const [editTempData, setEditTempData] = useState({});
    const [addingTemp, setAddingTemp] = useState(false);
    const [newTempData, setNewTempData] = useState({ name: '', requiredTemp: '', min: '', max: '' });

    // ── Appliance section state ──
    const [editApplId, setEditApplId] = useState(null);
    const [editApplData, setEditApplData] = useState({});
    const [addingAppl, setAddingAppl] = useState(false);
    const [newApplData, setNewApplData] = useState({ name: '', targetTemp: '', type: 'Cold', min: '', max: '' });

    // ── Registration codes state ──
    const LOCATIONS_LIST = ['Richardson', 'Fort Worth', 'Haslet'];
    const generateCode = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    };
    const [codesSaving, setCodesSaving] = useState({});
    const [codesSaved, setCodesSaved] = useState({});
    const regenCode = async (codeKey) => {
        const newCode = generateCode();
        const updated = { ...locationCodes, [codeKey]: newCode };
        setLocationCodes(updated);
        setCodesSaving(p => ({ ...p, [codeKey]: true }));
        await saveSetting('locationCodes', updated);
        setCodesSaving(p => ({ ...p, [codeKey]: false }));
        setCodesSaved(p => ({ ...p, [codeKey]: true }));
        setTimeout(() => setCodesSaved(p => ({ ...p, [codeKey]: false })), 2000);
    };

    // ─── Category helpers ───
    const getCatState = (id) => catItemState[id] || { adding: false, newItem: '', editIdx: null, editVal: '' };
    const updCatState = (id, patch) => setCatItemState(p => ({ ...p, [id]: { ...getCatState(id), ...patch } }));

    const saveCatName = (id) => {
        setInspCats(inspCats.map(c => c.id === id ? { ...c, category: editCatName } : c));
        setEditCatId(null);
    };
    const deleteCat = (id) => setInspCats(inspCats.filter(c => c.id !== id));
    const addCat = () => {
        if (!newCatName.trim()) return;
        setInspCats([...inspCats, { id: Date.now(), category: newCatName.trim(), items: [] }]);
        setNewCatName('');
        setAddingCat(false);
    };
    const addItem = (catId) => {
        const s = getCatState(catId);
        if (!s.newItem.trim()) return;
        setInspCats(inspCats.map(c => c.id === catId ? { ...c, items: [...c.items, s.newItem.trim()] } : c));
        updCatState(catId, { adding: false, newItem: '' });
    };
    const saveItem = (catId) => {
        const s = getCatState(catId);
        setInspCats(inspCats.map(c => c.id === catId
            ? { ...c, items: c.items.map((it, i) => i === s.editIdx ? s.editVal : it) }
            : c));
        updCatState(catId, { editIdx: null, editVal: '' });
    };
    const deleteItem = (catId, idx) => {
        setInspCats(inspCats.map(c => c.id === catId ? { ...c, items: c.items.filter((_, i) => i !== idx) } : c));
    };

    // ─── Temp helpers ───
    const saveTempEdit = () => {
        setTempItems(tempItems.map(t => t.id === editTempId
            ? { ...t, name: editTempData.name, requiredTemp: editTempData.requiredTemp, min: parseNum(editTempData.min), max: parseNum(editTempData.max) }
            : t));
        setEditTempId(null);
    };
    const deleteTemp = (id) => setTempItems(tempItems.filter(t => t.id !== id));
    const addTemp = () => {
        if (!newTempData.name.trim()) return;
        setTempItems([...tempItems, {
            id: Date.now(), name: newTempData.name.trim(),
            requiredTemp: newTempData.requiredTemp.trim(),
            min: parseNum(newTempData.min), max: parseNum(newTempData.max)
        }]);
        setNewTempData({ name: '', requiredTemp: '', min: '', max: '' });
        setAddingTemp(false);
    };

    // ─── Appliance helpers ───
    const saveApplEdit = () => {
        setAppliances(appliances.map(a => a.id === editApplId
            ? { ...a, name: editApplData.name, targetTemp: editApplData.targetTemp, type: editApplData.type, min: parseNum(editApplData.min), max: parseNum(editApplData.max) }
            : a));
        setEditApplId(null);
    };
    const deleteAppl = (id) => setAppliances(appliances.filter(a => a.id !== id));
    const addAppl = () => {
        if (!newApplData.name.trim()) return;
        setAppliances([...appliances, {
            id: Date.now(), name: newApplData.name.trim(),
            targetTemp: newApplData.targetTemp.trim(), type: newApplData.type,
            min: parseNum(newApplData.min), max: parseNum(newApplData.max)
        }]);
        setNewApplData({ name: '', targetTemp: '', type: 'Cold', min: '', max: '' });
        setAddingAppl(false);
    };

    const roleLabel = user ? `${user.name} · ${user.role}` : '';

    return (
        <div style={{ maxWidth: "860px" }}>
            <div style={{ marginBottom: "18px", padding: "10px 16px", background: "#e8f5f0", borderRadius: "8px", fontSize: "13px", color: "#166534", fontWeight: "600" }}>
                Editing as {roleLabel} — all changes are saved automatically.
            </div>

            {/* ── REGISTRATION CODES ── */}
            <Card style={{ marginBottom: "24px" }}>
                <div style={secHead}>Registration Codes</div>
                <div style={{ fontSize: "12px", color: "#888", marginBottom: "16px" }}>
                    Staff and managers use these codes when creating accounts. Each code determines their role and location automatically. Regenerate a code to invalidate the old one.
                </div>
                {LOCATIONS_LIST.map(loc => (
                    <div key={loc} style={{ marginBottom: "18px", paddingBottom: "18px", borderBottom: "1px solid #f0e0e0" }}>
                        <div style={{ fontSize: "13px", fontWeight: "700", color: BK, marginBottom: "10px" }}>{loc}</div>
                        <div style={{ display: "flex", gap: "12px" }}>
                            {['staff', 'manager'].map(roleKey => {
                                const codeKey = `${loc}-${roleKey}`;
                                const codeVal = locationCodes[codeKey] || '—';
                                return (
                                    <div key={roleKey} style={{ flex: 1, padding: "12px", background: "#fafafa", border: "1px solid #eee", borderRadius: "8px" }}>
                                        <div style={{ fontSize: "10px", textTransform: "uppercase", color: G, fontWeight: "700", letterSpacing: "0.1em", marginBottom: "6px" }}>
                                            {roleKey.charAt(0).toUpperCase() + roleKey.slice(1)} Code
                                        </div>
                                        <div style={{ fontFamily: "monospace", fontSize: "18px", fontWeight: "800", letterSpacing: "0.15em", color: BK, marginBottom: "8px" }}>
                                            {codeVal}
                                        </div>
                                        <button onClick={() => regenCode(codeKey)} disabled={codesSaving[codeKey]}
                                            style={{ ...smBtn(), fontSize: "11px", opacity: codesSaving[codeKey] ? 0.6 : 1 }}>
                                            {codesSaving[codeKey] ? "Saving…" : codesSaved[codeKey] ? "✓ Saved" : "Regenerate"}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
                <div>
                    <div style={{ fontSize: "13px", fontWeight: "700", color: BK, marginBottom: "10px" }}>Owner</div>
                    <div style={{ padding: "12px", background: "#fafafa", border: "1px solid #eee", borderRadius: "8px", display: "inline-block", minWidth: "200px" }}>
                        <div style={{ fontSize: "10px", textTransform: "uppercase", color: G, fontWeight: "700", letterSpacing: "0.1em", marginBottom: "6px" }}>Owner Code</div>
                        <div style={{ fontFamily: "monospace", fontSize: "18px", fontWeight: "800", letterSpacing: "0.15em", color: BK, marginBottom: "8px" }}>
                            {locationCodes['owner'] || '—'}
                        </div>
                        <button onClick={() => regenCode('owner')} disabled={codesSaving['owner']}
                            style={{ ...smBtn(), fontSize: "11px", opacity: codesSaving['owner'] ? 0.6 : 1 }}>
                            {codesSaving['owner'] ? "Saving…" : codesSaved['owner'] ? "✓ Saved" : "Regenerate"}
                        </button>
                    </div>
                </div>
            </Card>

            {/* ── HASLET ADDRESS ── */}
            <Card style={{ marginBottom: "24px" }}>
                <div style={secHead}>Haslet Location Address</div>
                <div style={{ fontSize: "12px", color: "#888", marginBottom: "14px" }}>
                    Haslet is a food truck — update the current address here whenever it moves.
                </div>
                <HasletAddressField value={hasletAddress} onSave={setHasletAddress} />
            </Card>

            {/* ── INSPECTION CATEGORIES ── */}
            <Card style={{ marginBottom: "24px" }}>
                <div style={secHead}>Inspection Categories</div>
                {inspCats.map(cat => {
                    const cs = getCatState(cat.id);
                    const isEditCat = editCatId === cat.id;
                    return (
                        <div key={cat.id} style={{ marginBottom: "18px", paddingBottom: "18px", borderBottom: "1px solid #f0e0e0" }}>
                            {/* Category header row */}
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                                {isEditCat ? (
                                    <>
                                        <input value={editCatName} onChange={e => setEditCatName(e.target.value)}
                                            style={{ ...inp, flex: 1, fontWeight: "700" }}
                                            onKeyDown={e => e.key === 'Enter' && saveCatName(cat.id)} autoFocus />
                                        <button onClick={() => saveCatName(cat.id)} style={smBtn('primary')}>Save</button>
                                        <button onClick={() => setEditCatId(null)} style={smBtn()}>✕</button>
                                    </>
                                ) : (
                                    <>
                                        <span style={{ flex: 1, fontWeight: "700", fontSize: "15px", color: BK }}>{cat.category}</span>
                                        <button
                                            onClick={() => setInspCats(inspCats.map(c => c.id === cat.id ? { ...c, required: !c.required } : c))}
                                            style={{ padding: "3px 10px", background: cat.required ? G : "#f3f4f6", border: `1.5px solid ${cat.required ? G : "#d1d5db"}`, borderRadius: "12px", color: cat.required ? WH : "#6b7280", fontSize: "11px", cursor: "pointer", fontWeight: "600", fontFamily: "system-ui,sans-serif" }}>
                                            {cat.required ? "Required" : "Optional"}
                                        </button>
                                        <button onClick={() => { setEditCatId(cat.id); setEditCatName(cat.category); }} style={smBtn()}>Edit</button>
                                        <button onClick={() => deleteCat(cat.id)} style={smBtn('danger')}>Delete Category</button>
                                    </>
                                )}
                            </div>
                            {/* Items list */}
                            <ul style={{ margin: "0 0 8px 0", paddingLeft: "0", listStyle: "none" }}>
                                {cat.items.map((item, idx) => (
                                    <li key={idx} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "7px 10px", marginBottom: "4px", background: "#fafafa", border: "1px solid #eee", borderRadius: "6px" }}>
                                        {cs.editIdx === idx ? (
                                            <>
                                                <input value={cs.editVal}
                                                    onChange={e => updCatState(cat.id, { editVal: e.target.value })}
                                                    style={{ ...inp, flex: 1, fontSize: "13px", padding: "5px 10px" }}
                                                    onKeyDown={e => e.key === 'Enter' && saveItem(cat.id)} autoFocus />
                                                <button onClick={() => saveItem(cat.id)} style={smBtn('primary')}>Save</button>
                                                <button onClick={() => updCatState(cat.id, { editIdx: null })} style={smBtn()}>✕</button>
                                            </>
                                        ) : (
                                            <>
                                                <span style={{ flex: 1, fontSize: "13px", color: "#444" }}>{item}</span>
                                                <button onClick={() => updCatState(cat.id, { editIdx: idx, editVal: item })} style={smBtn()}>Edit</button>
                                                <button onClick={() => deleteItem(cat.id, idx)} style={smBtn('danger')}>✕</button>
                                            </>
                                        )}
                                    </li>
                                ))}
                            </ul>
                            {/* Add item row */}
                            {cs.adding ? (
                                <div style={{ display: "flex", gap: "6px" }}>
                                    <input value={cs.newItem} onChange={e => updCatState(cat.id, { newItem: e.target.value })}
                                        placeholder="New checklist item…"
                                        style={{ ...inp, flex: 1, fontSize: "13px", padding: "6px 10px" }}
                                        onKeyDown={e => e.key === 'Enter' && addItem(cat.id)} autoFocus />
                                    <button onClick={() => addItem(cat.id)} style={smBtn('primary')}>Add</button>
                                    <button onClick={() => updCatState(cat.id, { adding: false, newItem: '' })} style={smBtn()}>✕</button>
                                </div>
                            ) : (
                                <button onClick={() => updCatState(cat.id, { adding: true })}
                                    style={{ padding: "5px 12px", background: "transparent", border: `1.5px dashed ${G}`, borderRadius: "6px", color: G, fontSize: "12px", cursor: "pointer", fontWeight: "600" }}>
                                    ＋ Add Item
                                </button>
                            )}
                        </div>
                    );
                })}
                {/* Add category */}
                {addingCat ? (
                    <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                        <input value={newCatName} onChange={e => setNewCatName(e.target.value)}
                            placeholder="New category name…" style={{ ...inp, flex: 1 }}
                            onKeyDown={e => e.key === 'Enter' && addCat()} autoFocus />
                        <button onClick={addCat} style={{ ...gbtn, padding: "8px 16px" }}>Add Category</button>
                        <button onClick={() => setAddingCat(false)} style={ghos}>✕</button>
                    </div>
                ) : (
                    <button onClick={() => setAddingCat(true)}
                        style={{ marginTop: "8px", padding: "9px 18px", background: WH, border: `2px dashed ${G}`, borderRadius: "8px", color: G, fontSize: "13px", cursor: "pointer", fontWeight: "700" }}>
                        ＋ Add Category
                    </button>
                )}
            </Card>

            {/* ── FOOD TEMPERATURE CONTROL ── */}
            <Card style={{ marginBottom: "24px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px", paddingBottom: "8px", borderBottom: `2px solid ${G}` }}>
                    <div style={{ ...secHead, margin: 0, paddingBottom: 0, borderBottom: "none" }}>Food Temperature Control</div>
                    <button
                        onClick={() => setTempRequired(!tempRequired)}
                        style={{ padding: "3px 10px", background: tempRequired ? G : "#f3f4f6", border: `1.5px solid ${tempRequired ? G : "#d1d5db"}`, borderRadius: "12px", color: tempRequired ? WH : "#6b7280", fontSize: "11px", cursor: "pointer", fontWeight: "600", fontFamily: "system-ui,sans-serif" }}>
                        {tempRequired ? "Required" : "Optional"}
                    </button>
                </div>
                <div style={{ fontSize: "12px", color: "#888", marginBottom: "14px" }}>
                    Set a Min and/or Max °F for each item. During inspections, entered readings will automatically turn <strong style={{ color: "#16a34a" }}>green (pass)</strong> or <strong style={{ color: "#dc2626" }}>red (fail)</strong> based on the range.
                </div>
                {tempItems.map(ti => {
                    const isEdit = editTempId === ti.id;
                    return (
                        <div key={ti.id} style={{ padding: "12px 14px", marginBottom: "8px", background: "#fafafa", border: "1px solid #eee", borderRadius: "8px" }}>
                            {isEdit ? (
                                <div>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 80px 80px", gap: "10px", marginBottom: "10px" }}>
                                        <div>
                                            <label style={{ ...lbl, fontSize: "9px" }}>Name</label>
                                            <input value={editTempData.name || ''}
                                                onChange={e => setEditTempData(p => ({ ...p, name: e.target.value }))}
                                                style={{ ...inp, width: "100%", fontSize: "13px" }} />
                                        </div>
                                        <div>
                                            <label style={{ ...lbl, fontSize: "9px" }}>Display Label</label>
                                            <input value={editTempData.requiredTemp || ''}
                                                onChange={e => setEditTempData(p => ({ ...p, requiredTemp: e.target.value }))}
                                                placeholder="e.g. 135°F or above"
                                                style={{ ...inp, width: "100%", fontSize: "13px" }} />
                                        </div>
                                        <div>
                                            <label style={{ ...lbl, fontSize: "9px" }}>Min °F</label>
                                            <input type="number" value={editTempData.min ?? ''}
                                                onChange={e => setEditTempData(p => ({ ...p, min: e.target.value }))}
                                                placeholder="—" style={{ ...inp, width: "100%", fontSize: "13px" }} />
                                        </div>
                                        <div>
                                            <label style={{ ...lbl, fontSize: "9px" }}>Max °F</label>
                                            <input type="number" value={editTempData.max ?? ''}
                                                onChange={e => setEditTempData(p => ({ ...p, max: e.target.value }))}
                                                placeholder="—" style={{ ...inp, width: "100%", fontSize: "13px" }} />
                                        </div>
                                    </div>
                                    <div style={{ display: "flex", gap: "6px" }}>
                                        <button onClick={saveTempEdit} style={{ ...gbtn, padding: "7px 14px", fontSize: "12px" }}>Save</button>
                                        <button onClick={() => setEditTempId(null)} style={{ ...ghos, padding: "7px 12px", fontSize: "12px" }}>Cancel</button>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: "600", fontSize: "14px", color: BK }}>{ti.name}</div>
                                        <div style={{ fontSize: "11px", marginTop: "3px", display: "flex", gap: "10px", alignItems: "center" }}>
                                            <span style={{ color: G, fontWeight: "700" }}>{ti.requiredTemp}</span>
                                            <span style={{ padding: "2px 8px", background: "#e8f5f0", borderRadius: "10px", color: "#166534", fontWeight: "600" }}>
                                                Range: {rangeLabel(ti.min, ti.max)}
                                            </span>
                                        </div>
                                    </div>
                                    <div style={{ display: "flex", gap: "6px" }}>
                                        <button onClick={() => { setEditTempId(ti.id); setEditTempData({ name: ti.name, requiredTemp: ti.requiredTemp, min: ti.min ?? '', max: ti.max ?? '' }); }} style={smBtn()}>Edit</button>
                                        <button onClick={() => deleteTemp(ti.id)} style={smBtn('danger')}>✕</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
                {addingTemp ? (
                    <div style={{ padding: "14px", border: `1.5px dashed ${G}`, borderRadius: "8px", marginTop: "8px" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 80px 80px", gap: "10px", marginBottom: "12px" }}>
                            <div>
                                <label style={lbl}>Name</label>
                                <input value={newTempData.name}
                                    onChange={e => setNewTempData(p => ({ ...p, name: e.target.value }))}
                                    placeholder="e.g. Hot foods held…" style={{ ...inp, width: "100%" }} autoFocus />
                            </div>
                            <div>
                                <label style={lbl}>Display Label</label>
                                <input value={newTempData.requiredTemp}
                                    onChange={e => setNewTempData(p => ({ ...p, requiredTemp: e.target.value }))}
                                    placeholder="e.g. 135°F or above" style={{ ...inp, width: "100%" }} />
                            </div>
                            <div>
                                <label style={lbl}>Min °F</label>
                                <input type="number" value={newTempData.min}
                                    onChange={e => setNewTempData(p => ({ ...p, min: e.target.value }))}
                                    placeholder="—" style={{ ...inp, width: "100%" }} />
                            </div>
                            <div>
                                <label style={lbl}>Max °F</label>
                                <input type="number" value={newTempData.max}
                                    onChange={e => setNewTempData(p => ({ ...p, max: e.target.value }))}
                                    placeholder="—" style={{ ...inp, width: "100%" }} />
                            </div>
                        </div>
                        <div style={{ display: "flex", gap: "8px" }}>
                            <button onClick={addTemp} style={gbtn}>Add Item</button>
                            <button onClick={() => setAddingTemp(false)} style={ghos}>Cancel</button>
                        </div>
                    </div>
                ) : (
                    <button onClick={() => setAddingTemp(true)}
                        style={{ marginTop: "8px", padding: "9px 18px", background: WH, border: `2px dashed ${G}`, borderRadius: "8px", color: G, fontSize: "13px", cursor: "pointer", fontWeight: "700" }}>
                        ＋ Add Temp Item
                    </button>
                )}
            </Card>

            {/* ── APPLIANCES ── */}
            <Card>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px", paddingBottom: "8px", borderBottom: `2px solid ${G}` }}>
                    <div style={{ ...secHead, margin: 0, paddingBottom: 0, borderBottom: "none" }}>Appliance Temperature Targets</div>
                    <button
                        onClick={() => setAppliancesRequired(!appliancesRequired)}
                        style={{ padding: "3px 10px", background: appliancesRequired ? G : "#f3f4f6", border: `1.5px solid ${appliancesRequired ? G : "#d1d5db"}`, borderRadius: "12px", color: appliancesRequired ? WH : "#6b7280", fontSize: "11px", cursor: "pointer", fontWeight: "600", fontFamily: "system-ui,sans-serif" }}>
                        {appliancesRequired ? "Required" : "Optional"}
                    </button>
                </div>
                <div style={{ fontSize: "12px", color: "#888", marginBottom: "14px" }}>
                    Set acceptable temperature ranges per appliance. Readings entered during inspections will be color-coded automatically.
                </div>
                {appliances.map(a => {
                    const isEdit = editApplId === a.id;
                    return (
                        <div key={a.id} style={{ padding: "12px 14px", marginBottom: "8px", background: "#fafafa", border: "1px solid #eee", borderRadius: "8px" }}>
                            {isEdit ? (
                                <div>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 80px 80px 70px", gap: "10px", marginBottom: "10px" }}>
                                        <div>
                                            <label style={{ ...lbl, fontSize: "9px" }}>Name</label>
                                            <input value={editApplData.name || ''}
                                                onChange={e => setEditApplData(p => ({ ...p, name: e.target.value }))}
                                                style={{ ...inp, width: "100%", fontSize: "13px" }} />
                                        </div>
                                        <div>
                                            <label style={{ ...lbl, fontSize: "9px" }}>Target Label</label>
                                            <input value={editApplData.targetTemp || ''}
                                                onChange={e => setEditApplData(p => ({ ...p, targetTemp: e.target.value }))}
                                                placeholder="e.g. 35–38°F" style={{ ...inp, width: "100%", fontSize: "13px" }} />
                                        </div>
                                        <div>
                                            <label style={{ ...lbl, fontSize: "9px" }}>Min °F</label>
                                            <input type="number" value={editApplData.min ?? ''}
                                                onChange={e => setEditApplData(p => ({ ...p, min: e.target.value }))}
                                                placeholder="—" style={{ ...inp, width: "100%", fontSize: "13px" }} />
                                        </div>
                                        <div>
                                            <label style={{ ...lbl, fontSize: "9px" }}>Max °F</label>
                                            <input type="number" value={editApplData.max ?? ''}
                                                onChange={e => setEditApplData(p => ({ ...p, max: e.target.value }))}
                                                placeholder="—" style={{ ...inp, width: "100%", fontSize: "13px" }} />
                                        </div>
                                        <div>
                                            <label style={{ ...lbl, fontSize: "9px" }}>Type</label>
                                            <select value={editApplData.type || 'Cold'}
                                                onChange={e => setEditApplData(p => ({ ...p, type: e.target.value }))}
                                                style={{ ...inp, width: "100%", fontSize: "13px" }}>
                                                <option>Cold</option>
                                                <option>Hot</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div style={{ display: "flex", gap: "6px" }}>
                                        <button onClick={saveApplEdit} style={{ ...gbtn, padding: "7px 14px", fontSize: "12px" }}>Save</button>
                                        <button onClick={() => setEditApplId(null)} style={{ ...ghos, padding: "7px 12px", fontSize: "12px" }}>Cancel</button>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                            <span style={{ fontWeight: "600", fontSize: "14px", color: BK }}>{a.name}</span>
                                            <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "12px", background: a.type === "Cold" ? "#dbeafe" : "#ffedd5", color: a.type === "Cold" ? "#1d4ed8" : "#c2410c", fontWeight: "700" }}>{a.type}</span>
                                        </div>
                                        <div style={{ fontSize: "11px", marginTop: "3px", display: "flex", gap: "10px", alignItems: "center" }}>
                                            <span style={{ color: a.type === 'Cold' ? "#1d4ed8" : "#c2410c", fontWeight: "700" }}>{a.targetTemp}</span>
                                            <span style={{ padding: "2px 8px", background: "#e8f5f0", borderRadius: "10px", color: "#166534", fontWeight: "600" }}>
                                                Range: {rangeLabel(a.min, a.max)}
                                            </span>
                                        </div>
                                    </div>
                                    <div style={{ display: "flex", gap: "6px" }}>
                                        <button onClick={() => { setEditApplId(a.id); setEditApplData({ name: a.name, targetTemp: a.targetTemp, type: a.type, min: a.min ?? '', max: a.max ?? '' }); }} style={smBtn()}>Edit</button>
                                        <button onClick={() => deleteAppl(a.id)} style={smBtn('danger')}>✕</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
                {addingAppl ? (
                    <div style={{ padding: "14px", border: `1.5px dashed ${G}`, borderRadius: "8px", marginTop: "8px" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 80px 80px 70px", gap: "10px", marginBottom: "12px" }}>
                            <div>
                                <label style={lbl}>Name</label>
                                <input value={newApplData.name}
                                    onChange={e => setNewApplData(p => ({ ...p, name: e.target.value }))}
                                    placeholder="Appliance name…" style={{ ...inp, width: "100%" }} autoFocus />
                            </div>
                            <div>
                                <label style={lbl}>Target Label</label>
                                <input value={newApplData.targetTemp}
                                    onChange={e => setNewApplData(p => ({ ...p, targetTemp: e.target.value }))}
                                    placeholder="e.g. 35–38°F" style={{ ...inp, width: "100%" }} />
                            </div>
                            <div>
                                <label style={lbl}>Min °F</label>
                                <input type="number" value={newApplData.min}
                                    onChange={e => setNewApplData(p => ({ ...p, min: e.target.value }))}
                                    placeholder="—" style={{ ...inp, width: "100%" }} />
                            </div>
                            <div>
                                <label style={lbl}>Max °F</label>
                                <input type="number" value={newApplData.max}
                                    onChange={e => setNewApplData(p => ({ ...p, max: e.target.value }))}
                                    placeholder="—" style={{ ...inp, width: "100%" }} />
                            </div>
                            <div>
                                <label style={lbl}>Type</label>
                                <select value={newApplData.type}
                                    onChange={e => setNewApplData(p => ({ ...p, type: e.target.value }))}
                                    style={{ ...inp, width: "100%" }}>
                                    <option>Cold</option>
                                    <option>Hot</option>
                                </select>
                            </div>
                        </div>
                        <div style={{ display: "flex", gap: "8px" }}>
                            <button onClick={addAppl} style={gbtn}>Add Appliance</button>
                            <button onClick={() => setAddingAppl(false)} style={ghos}>Cancel</button>
                        </div>
                    </div>
                ) : (
                    <button onClick={() => setAddingAppl(true)}
                        style={{ marginTop: "8px", padding: "9px 18px", background: WH, border: `2px dashed ${G}`, borderRadius: "8px", color: G, fontSize: "13px", cursor: "pointer", fontWeight: "700" }}>
                        ＋ Add Appliance
                    </button>
                )}
            </Card>
        </div>
    );
}
