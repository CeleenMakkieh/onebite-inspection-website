import { useRef } from 'react';
import { Card, CheckRow, PFBtns, sh, inp, lbl, gbtn, ghos } from './ui';
import { G, PINK, BK, WH } from '../constants';

function evalTemp(value, min, max) {
    const n = parseFloat(value);
    if (value === '' || isNaN(n)) return undefined;
    if (min != null && max != null) return (n >= min && n <= max) ? 'pass' : 'fail';
    if (min != null) return n >= min ? 'pass' : 'fail';
    if (max != null) return n <= max ? 'pass' : 'fail';
    return undefined;
}

function rangeLabel(min, max) {
    if (min != null && max != null) return `${min}–${max}°F`;
    if (min != null) return `≥ ${min}°F`;
    if (max != null) return `≤ ${max}°F`;
    return null;
}

export function NewInspView({ inspection, setInspection, onSubmit, onCancel, inspCats, tempItems, appliances, tempRequired, appliancesRequired }) {
    const photoRef = useRef(null);
    const upd = (k, v) => setInspection(p => ({ ...p, [k]: v }));
    const setRes = (catId, item, v) => setInspection(p => ({ ...p, results: { ...p.results, [`${catId}__${item}`]: v } }));
    const getRes = (catId, item) => inspection.results[`${catId}__${item}`];

    const handleTempChange = (ti, val) => {
        const key = `TC__${ti.id}`;
        const result = evalTemp(val, ti.min, ti.max);
        setInspection(p => ({
            ...p,
            tempReadings: { ...p.tempReadings, [ti.id]: val },
            results: { ...p.results, [key]: result }
        }));
    };

    const handleApplChange = (a, val) => {
        const key = `AP__${a.id}`;
        const result = evalTemp(val, a.min, a.max);
        setInspection(p => ({
            ...p,
            applianceReadings: { ...p.applianceReadings, [a.id]: val },
            results: (a.min != null || a.max != null)
                ? { ...p.results, [key]: result }
                : p.results
        }));
    };

    const handlePhoto = (e) => {
        Array.from(e.target.files).forEach(f => {
            const r = new FileReader();
            r.onload = ev => setInspection(p => ({ ...p, photos: [...p.photos, { name: f.name, url: ev.target.result }] }));
            r.readAsDataURL(f);
        });
    };

    const total = inspCats.flatMap(c => c.items).length + tempItems.length;
    const ans = Object.values(inspection.results).filter(v => v !== undefined).length;
    const passed = Object.values(inspection.results).filter(v => v === "pass").length;
    const preview = ans > 0 ? Math.round((passed / total) * 100) : null;

    const handleSubmit = () => onSubmit(inspection);

    return (
        <div style={{ maxWidth: "800px" }}>
            <Card style={{ marginBottom: "22px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px" }}>
                    <div>
                        <label style={lbl}>Date <span style={{ color: "#dc2626" }}>*</span></label>
                        <input type="date" value={inspection.date} onChange={e => upd("date", e.target.value)} style={{ ...inp, width: "100%" }} />
                    </div>
                    <div>
                        <label style={lbl}>Assign To <span style={{ color: "#dc2626" }}>*</span></label>
                        <input value={inspection.assignedTo} onChange={e => upd("assignedTo", e.target.value)} placeholder="Staff name" style={{ ...inp, width: "100%" }} />
                    </div>
                    <div style={{ display: "flex", alignItems: "flex-end" }}>
                        <div style={{ flex: 1, padding: "12px", background: PINK, borderRadius: "10px", textAlign: "center", border: `1.5px solid rgba(0,138,95,0.2)` }}>
                            <div style={{ fontSize: "10px", textTransform: "uppercase", color: G, marginBottom: "2px", fontWeight: "700", letterSpacing: "0.1em" }}>Live Score</div>
                            <div style={{ fontSize: "26px", fontWeight: "800", color: preview !== null ? (preview >= 90 ? "#166534" : preview >= 75 ? "#92400e" : "#991b1b") : G }}>{preview !== null ? `${preview}%` : "—"}</div>
                            <div style={{ fontSize: "10px", color: "#888" }}>{ans}/{total} answered</div>
                        </div>
                    </div>
                </div>
            </Card>

            {inspCats.map(cat => (
                <div key={cat.id} style={{ marginBottom: "20px" }}>
                    <div style={sh}>{cat.category} {cat.required && <span style={{ color: "#dc2626" }}>*</span>}</div>
                    {cat.items.map(item => (
                        <CheckRow key={item} label={item} result={getRes(cat.id, item)} onPass={() => setRes(cat.id, item, "pass")} onFail={() => setRes(cat.id, item, "fail")} onClear={() => setRes(cat.id, item, undefined)} />
                    ))}
                </div>
            ))}

            {/* Food Temperature Control — auto pass/fail from range */}
            <div style={{ marginBottom: "20px" }}>
                <div style={sh}>Food Temperature Control {tempRequired && <span style={{ color: "#dc2626" }}>*</span>}</div>
                {tempItems.map(ti => {
                    const key = `TC__${ti.id}`;
                    const result = inspection.results[key];
                    const hasRange = ti.min != null || ti.max != null;
                    const rl = rangeLabel(ti.min, ti.max);
                    const tempVal = inspection.tempReadings[ti.id] || '';
                    const inputColor = result === 'pass' ? '#16a34a' : result === 'fail' ? '#dc2626' : '#ccc';
                    const inputBg = result === 'pass' ? '#f0fdf4' : result === 'fail' ? '#fef2f2' : WH;
                    return (
                        <div key={ti.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", marginBottom: "5px", background: result === "pass" ? "#f0fdf4" : result === "fail" ? "#fef2f2" : "#fafafa", border: result === "pass" ? "1.5px solid #86efac" : result === "fail" ? "1.5px solid #fca5a5" : "1.5px solid #ececec", borderRadius: "8px" }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: "14px", color: BK, fontWeight: "500" }}>{ti.name}</div>
                                <div style={{ fontSize: "11px", marginTop: "2px", display: "flex", gap: "8px", alignItems: "center" }}>
                                    <span style={{ color: G, fontWeight: "700" }}>Required: {ti.requiredTemp}</span>
                                    {hasRange && rl && (
                                        <span style={{ padding: "1px 7px", background: "#e8f5f0", borderRadius: "10px", color: "#166534", fontWeight: "600" }}>
                                            Range: {rl}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
                                <input
                                    type="number"
                                    value={tempVal}
                                    onChange={e => handleTempChange(ti, e.target.value)}
                                    placeholder="°F"
                                    style={{ ...inp, width: "80px", fontSize: "13px", textAlign: "center", background: inputBg, borderColor: inputColor, borderWidth: "2px", color: result === 'pass' ? '#166534' : result === 'fail' ? '#991b1b' : BK, fontWeight: result ? "700" : "400" }}
                                />
                                {hasRange && result && (
                                    <span style={{ fontSize: "10px", fontWeight: "700", color: result === 'pass' ? '#166534' : '#991b1b' }}>
                                        {result === 'pass' ? '✓ PASS' : '✗ FAIL'}
                                    </span>
                                )}
                            </div>
                            {!hasRange && (
                                <PFBtns
                                    result={result}
                                    onPass={() => setInspection(p => ({ ...p, results: { ...p.results, [key]: "pass" } }))}
                                    onFail={() => setInspection(p => ({ ...p, results: { ...p.results, [key]: "fail" } }))}
                                    onClear={() => setInspection(p => ({ ...p, results: { ...p.results, [key]: undefined } }))}
                                />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Appliance Temperature Log */}
            <div style={{ marginBottom: "20px" }}>
                <div style={sh}>Appliance Temperature Log {appliancesRequired && <span style={{ color: "#dc2626" }}>*</span>}</div>
                {appliances.map(a => {
                    const key = `AP__${a.id}`;
                    const result = inspection.results[key];
                    const hasRange = a.min != null || a.max != null;
                    const rl = rangeLabel(a.min, a.max);
                    const applVal = inspection.applianceReadings[a.id] || '';
                    const inputColor = result === 'pass' ? '#16a34a' : result === 'fail' ? '#dc2626' : '#ccc';
                    const inputBg = result === 'pass' ? '#f0fdf4' : result === 'fail' ? '#fef2f2' : WH;
                    return (
                        <div key={a.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", marginBottom: "5px", background: result === "pass" ? "#f0fdf4" : result === "fail" ? "#fef2f2" : "#fafafa", border: result === "pass" ? "1.5px solid #86efac" : result === "fail" ? "1.5px solid #fca5a5" : "1.5px solid #ececec", borderRadius: "8px" }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: "14px", color: BK, fontWeight: "500", display: "flex", alignItems: "center", gap: "8px" }}>
                                    {a.name}
                                    <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "12px", background: a.type === "Cold" ? "#dbeafe" : "#ffedd5", color: a.type === "Cold" ? "#1d4ed8" : "#c2410c", fontWeight: "700" }}>{a.type}</span>
                                </div>
                                <div style={{ fontSize: "11px", marginTop: "2px", display: "flex", gap: "8px", alignItems: "center" }}>
                                    <span style={{ color: G, fontWeight: "700" }}>Target: {a.targetTemp}</span>
                                    {hasRange && rl && (
                                        <span style={{ padding: "1px 7px", background: "#e8f5f0", borderRadius: "10px", color: "#166534", fontWeight: "600" }}>
                                            Range: {rl}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
                                <input
                                    type="number"
                                    value={applVal}
                                    onChange={e => handleApplChange(a, e.target.value)}
                                    placeholder="°F"
                                    style={{ ...inp, width: "80px", fontSize: "13px", textAlign: "center", background: inputBg, borderColor: inputColor, borderWidth: "2px", color: result === 'pass' ? '#166534' : result === 'fail' ? '#991b1b' : BK, fontWeight: result ? "700" : "400" }}
                                />
                                {hasRange && result && (
                                    <span style={{ fontSize: "10px", fontWeight: "700", color: result === 'pass' ? '#166534' : '#991b1b' }}>
                                        {result === 'pass' ? '✓ PASS' : '✗ FAIL'}
                                    </span>
                                )}
                            </div>
                            {!hasRange && (
                                <PFBtns
                                    result={result}
                                    onPass={() => setInspection(p => ({ ...p, results: { ...p.results, [key]: "pass" } }))}
                                    onFail={() => setInspection(p => ({ ...p, results: { ...p.results, [key]: "fail" } }))}
                                    onClear={() => setInspection(p => ({ ...p, results: { ...p.results, [key]: undefined } }))}
                                />
                            )}
                        </div>
                    );
                })}
            </div>

            <div style={{ marginBottom: "20px" }}>
                <div style={{ ...sh, display: "flex", alignItems: "center", gap: "8px" }}>
                    Photo Documentation
                    <span style={{ fontSize: "11px", fontWeight: "500", color: "#888", background: "#f0f0f0", borderRadius: "6px", padding: "2px 8px" }}>Optional</span>
                </div>
                <input type="file" accept="image/*" multiple ref={photoRef} onChange={handlePhoto} style={{ display: "none" }} />
                <button onClick={() => photoRef.current?.click()} style={{ padding: "10px 18px", background: WH, border: `2px dashed ${G}`, borderRadius: "8px", color: G, fontSize: "13px", cursor: "pointer", fontWeight: "700", marginBottom: "10px" }}>＋ Upload Photos</button>
                {inspection.photos.length > 0 && (
                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                        {inspection.photos.map((p, i) => (
                            <div key={i} style={{ width: "72px", height: "72px", borderRadius: "8px", overflow: "hidden", border: "2px solid #ddd" }}>
                                <img src={p.url} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div style={{ marginBottom: "24px" }}>
                <div style={sh}>Notes & Comments</div>
                <textarea value={inspection.notes} onChange={e => upd("notes", e.target.value)} placeholder="Add observations, corrective actions, or follow-up items…" rows={4} style={{ ...inp, width: "100%", resize: "vertical", lineHeight: 1.6, padding: "12px 14px" }} />
            </div>
            <div style={{ display: "flex", gap: "12px" }}>
                <button onClick={handleSubmit} style={{ ...gbtn, padding: "14px 32px", fontSize: "14px" }}>Submit Inspection</button>
                <button onClick={onCancel} style={{ ...ghos, padding: "14px 20px" }}>Cancel</button>
            </div>
        </div>
    );
}
