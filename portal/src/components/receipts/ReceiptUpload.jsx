import { useState, useRef, useEffect } from 'react';
import { G, WH, BK } from '../../constants';
import { scanReceiptImage } from '../../scanReceipt';
import { saveReceipt, saveReceiptItems, uploadReceiptImage } from '../../receiptDb';

const inp = { border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', fontFamily: 'system-ui,sans-serif', outline: 'none', background: WH };
const lbl = { display: 'block', fontSize: '11px', fontWeight: '700', color: '#555', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '5px' };

function emptyItem() { return { name: '', quantity: 1, unit: 'ea', unitPrice: '', lineTotal: '' }; }

// ── Camera scanner ──────────────────────────────────────────────────────
function CameraScanner({ onAutoScan, onClose }) {
    const videoRef = useRef();
    const analysisCanvasRef = useRef();
    const captureCanvasRef = useRef();
    const streamRef = useRef();
    const rafRef = useRef();
    const confidenceRef = useRef(0);
    const capturedRef = useRef(false);

    const [camStatus, setCamStatus] = useState('starting');
    const [camErr, setCamErr] = useState('');
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        let cancelled = false;
        navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } }
        }).then(stream => {
            if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
            streamRef.current = stream;
            const video = videoRef.current;
            video.srcObject = stream;
            video.onloadedmetadata = () => {
                video.play();
                setCamStatus('detecting');
                startAnalysis();
            };
        }).catch(() => {
            if (!cancelled) {
                setCamErr('Camera access denied. Allow camera permission and try again.');
                setCamStatus('error');
            }
        });
        return () => {
            cancelled = true;
            if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, []);

    const startAnalysis = () => {
        const MAX = 20;
        const tick = () => {
            if (capturedRef.current) return;
            const video = videoRef.current;
            const canvas = analysisCanvasRef.current;
            if (!video || !canvas || video.readyState < 2) {
                rafRef.current = requestAnimationFrame(tick);
                return;
            }
            const W = 200, H = 150;
            canvas.width = W; canvas.height = H;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(video, 0, 0, W, H);

            const mx = Math.floor(W * 0.18), my = Math.floor(H * 0.18);
            const centerPx = ctx.getImageData(mx, my, W - mx * 2, H - my * 2).data;
            const leftPx = ctx.getImageData(0, 0, mx, H).data;
            const rightPx = ctx.getImageData(W - mx, 0, mx, H).data;

            let cb = 0, eb = 0;
            for (let i = 0; i < centerPx.length; i += 4)
                if ((centerPx[i] * 0.299 + centerPx[i + 1] * 0.587 + centerPx[i + 2] * 0.114) > 175) cb++;
            for (let i = 0; i < leftPx.length; i += 4)
                if ((leftPx[i] * 0.299 + leftPx[i + 1] * 0.587 + leftPx[i + 2] * 0.114) > 175) eb++;
            for (let i = 0; i < rightPx.length; i += 4)
                if ((rightPx[i] * 0.299 + rightPx[i + 1] * 0.587 + rightPx[i + 2] * 0.114) > 175) eb++;

            const cRatio = cb / (centerPx.length / 4);
            const eRatio = eb / ((leftPx.length + rightPx.length) / 4);
            const detected = cRatio > 0.42 && cRatio > eRatio + 0.12;

            if (detected) confidenceRef.current = Math.min(confidenceRef.current + 1, MAX);
            else confidenceRef.current = Math.max(confidenceRef.current - 2, 0);

            const pct = Math.round((confidenceRef.current / MAX) * 100);
            setProgress(pct);

            if (confidenceRef.current >= MAX && !capturedRef.current) {
                capturedRef.current = true;
                setCamStatus('confirmed');
                setTimeout(doCapture, 350);
                return;
            }
            setTimeout(() => { rafRef.current = requestAnimationFrame(tick); }, 80);
        };
        rafRef.current = requestAnimationFrame(tick);
    };

    const doCapture = () => {
        const video = videoRef.current;
        const canvas = captureCanvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);
        canvas.toBlob(blob => {
            if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
            setCamStatus('captured');
            const file = new File([blob], 'receipt_scan.jpg', { type: 'image/jpeg' });
            onAutoScan(file);
        }, 'image/jpeg', 0.93);
    };

    const manualCapture = () => {
        if (capturedRef.current) return;
        capturedRef.current = true;
        doCapture();
    };

    const isReady = camStatus === 'confirmed' || camStatus === 'captured';
    const bColor = isReady ? '#22c55e' : progress > 55 ? '#f59e0b' : 'rgba(255,255,255,0.75)';
    const B = 22, T = 3;

    return (
        <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {camStatus === 'error' ? (
                <div style={{ color: WH, textAlign: 'center', padding: '24px' }}>
                    <div style={{ marginBottom: '16px', fontSize: '14px', lineHeight: 1.6 }}>{camErr}</div>
                    <button onClick={onClose} style={{ padding: '10px 22px', background: G, color: WH, border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'system-ui,sans-serif' }}>Close</button>
                </div>
            ) : (
                <>
                    <video ref={videoRef} playsInline muted style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />

                    {/* Vignette */}
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.38)', pointerEvents: 'none' }} />

                    {/* Guide frame */}
                    <div style={{ position: 'relative', width: '70%', maxWidth: '360px', aspectRatio: '0.6', zIndex: 2 }}>
                        {/* corners */}
                        <div style={{ position: 'absolute', top: 0, left: 0, width: B, height: B, borderTop: `${T}px solid ${bColor}`, borderLeft: `${T}px solid ${bColor}`, transition: 'border-color 0.25s' }} />
                        <div style={{ position: 'absolute', top: 0, right: 0, width: B, height: B, borderTop: `${T}px solid ${bColor}`, borderRight: `${T}px solid ${bColor}`, transition: 'border-color 0.25s' }} />
                        <div style={{ position: 'absolute', bottom: 0, left: 0, width: B, height: B, borderBottom: `${T}px solid ${bColor}`, borderLeft: `${T}px solid ${bColor}`, transition: 'border-color 0.25s' }} />
                        <div style={{ position: 'absolute', bottom: 0, right: 0, width: B, height: B, borderBottom: `${T}px solid ${bColor}`, borderRight: `${T}px solid ${bColor}`, transition: 'border-color 0.25s' }} />

                        {/* Flash overlay on capture */}
                        {camStatus === 'captured' && (
                            <div style={{ position: 'absolute', inset: 0, background: 'rgba(34,197,94,0.25)', borderRadius: '2px' }} />
                        )}

                        {/* Status below frame */}
                        <div style={{ position: 'absolute', bottom: '-44px', left: 0, right: 0, textAlign: 'center' }}>
                            <div style={{ fontSize: '13px', fontWeight: '700', letterSpacing: '0.04em', color: isReady ? '#22c55e' : progress > 55 ? '#fbbf24' : 'rgba(255,255,255,0.8)', transition: 'color 0.25s' }}>
                                {camStatus === 'captured' ? 'Scanning receipt...' : isReady ? 'Ready to scan' : progress > 55 ? 'Hold still...' : 'Point camera at receipt'}
                            </div>
                            {progress > 0 && !isReady && (
                                <div style={{ margin: '7px auto 0', width: '72px', height: '2px', background: 'rgba(255,255,255,0.18)', borderRadius: '2px' }}>
                                    <div style={{ height: '100%', width: `${progress}%`, background: progress > 55 ? '#fbbf24' : G, borderRadius: '2px', transition: 'width 0.12s' }} />
                                </div>
                            )}
                        </div>
                    </div>

                    <canvas ref={analysisCanvasRef} style={{ display: 'none' }} />
                    <canvas ref={captureCanvasRef} style={{ display: 'none' }} />

                    {/* Close */}
                    <button onClick={onClose} style={{ position: 'absolute', top: '18px', right: '18px', background: 'rgba(0,0,0,0.55)', border: 'none', color: WH, fontSize: '18px', width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer', zIndex: 10, fontFamily: 'system-ui,sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>✕</button>

                    {/* Manual capture */}
                    {camStatus !== 'captured' && (
                        <button onClick={manualCapture} style={{ position: 'absolute', bottom: '36px', left: '50%', transform: 'translateX(-50%)', padding: '11px 24px', background: 'rgba(255,255,255,0.15)', color: WH, border: '1px solid rgba(255,255,255,0.3)', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'system-ui,sans-serif', zIndex: 10 }}>
                            Capture now
                        </button>
                    )}
                </>
            )}
        </div>
    );
}

// ── Main upload component ───────────────────────────────────────────────
export function ReceiptUpload({ user, onSaved }) {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [scanning, setScanning] = useState(false);
    const [scanStep, setScanStep] = useState('');
    const [uploading, setUploading] = useState(false);
    const [scanErr, setScanErr] = useState('');
    const [extracted, setExtracted] = useState(null);
    const [showCamera, setShowCamera] = useState(false);
    const fileRef = useRef();

    const [vendor, setVendor] = useState('');
    const [date, setDate] = useState('');
    const [receiptNumber, setReceiptNumber] = useState('');
    const [items, setItems] = useState([emptyItem()]);
    const [subtotal, setSubtotal] = useState('');
    const [tax, setTax] = useState('');
    const [total, setTotal] = useState('');
    const [location, setLocation] = useState(user.location || 'Richardson');

    const LOCS = ['Richardson', 'Fort Worth', 'Haslet'];

    const handleFile = (f) => {
        if (!f) return;
        setFile(f);
        setScanErr('');
        setExtracted(null);
        setPreview(URL.createObjectURL(f));
    };

    const populateFromScan = (data) => {
        setVendor(data.vendor || '');
        setDate(data.date || '');
        setReceiptNumber(data.receiptNumber || '');
        setItems(data.items?.length ? data.items.map(it => ({
            name: it.name || '', quantity: it.quantity ?? 1, unit: it.unit || 'ea',
            unitPrice: it.unitPrice ?? '', lineTotal: it.lineTotal ?? '',
            confidence: it.confidence ?? 1, category: it.category || '',
        })) : [emptyItem()]);
        setSubtotal(data.subtotal ?? '');
        setTax(data.tax ?? '');
        setTotal(data.total ?? '');
        setExtracted(data);
    };

    const runScan = async (f) => {
        setScanning(true);
        setScanErr('');
        setScanStep('Uploading image to OCR…');
        try {
            setScanStep('Reading receipt with Veryfi OCR…');
            const data = await scanReceiptImage(f);
            setScanStep('Categorizing items…');
            populateFromScan(data);
        } catch (e) {
            setScanErr(e.message || 'Scan failed. Try again.');
            setExtracted({});
        }
        setScanning(false);
        setScanStep('');
    };

    const handleAutoScan = async (capturedFile) => {
        setShowCamera(false);
        setFile(capturedFile);
        setPreview(URL.createObjectURL(capturedFile));
        await runScan(capturedFile);
    };

    const handleScan = async () => {
        if (!file) return;
        await runScan(file);
    };

    // Returns array of issue strings for a given item row
    const getItemIssues = (it) => {
        const issues = [];
        const qty = parseFloat(it.quantity) || 0;
        const up = parseFloat(it.unitPrice) || 0;
        const lt = parseFloat(it.lineTotal) || 0;

        if (!it.name || !it.name.trim()) {
            issues.push({ field: 'name', msg: 'Item name missing — enter manually' });
        } else if (/[^\x20-\x7EÀ-ɏ]/.test(it.name) || /[|]{2,}|[_]{3,}|[?]{2,}/.test(it.name)) {
            issues.push({ field: 'name', msg: 'Name may be garbled — check spelling' });
        }
        if ((it.confidence ?? 1) < 0.5) {
            issues.push({ field: 'name', msg: 'Low confidence — could not read clearly' });
        } else if ((it.confidence ?? 1) < 1 && issues.length === 0) {
            issues.push({ field: 'name', msg: 'Partially unclear — verify this item' });
        }
        if (lt === 0 && it.lineTotal !== '') {
            issues.push({ field: 'lineTotal', msg: 'Line total is $0.00' });
        }
        if (qty > 0 && up > 0 && lt > 0) {
            const expected = qty * up;
            if (Math.abs(expected - lt) > 0.06) {
                issues.push({ field: 'lineTotal', msg: `Math check: ${qty} × $${up.toFixed(2)} = $${expected.toFixed(2)}, not $${lt.toFixed(2)}` });
            }
        }
        return issues;
    };

    const updateItem = (i, field, val) =>
        setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [field]: val, confidence: field === 'name' ? 1 : it.confidence } : it));
    const addItem = () => setItems(prev => [...prev, emptyItem()]);
    const removeItem = (i) => setItems(prev => prev.filter((_, idx) => idx !== i));

    const handleSave = async () => {
        if (!vendor.trim()) { setScanErr('Vendor name is required.'); return; }
        setUploading(true); setScanErr('');
        try {
            const id = String(Date.now());
            const receipt = {
                id, vendor: vendor.trim(), date: date || new Date().toISOString().split('T')[0],
                receiptNumber: receiptNumber.trim(), subtotal: parseFloat(subtotal) || 0,
                tax: parseFloat(tax) || 0, total: parseFloat(total) || 0,
                location, uploadedBy: user.name, createdAt: Date.now(), imageUrl: '', itemCount: items.length,
            };
            const cleanItems = items.filter(it => it.name.trim()).map(it => ({
                name: it.name.trim(), quantity: parseFloat(it.quantity) || 1, unit: it.unit || 'ea',
                unitPrice: parseFloat(it.unitPrice) || 0, lineTotal: parseFloat(it.lineTotal) || 0,
                category: it.category || '',
            }));
            await Promise.all([saveReceipt(receipt), saveReceiptItems(id, cleanItems)]);
            onSaved(receipt);
            // Upload image in background after user is already done
            if (file) {
                uploadReceiptImage(id, file)
                    .then(imageUrl => saveReceipt({ ...receipt, imageUrl }))
                    .catch(() => {});
            }
        } catch (e) {
            setScanErr('Failed to save: ' + (e.message || 'Unknown error'));
            setUploading(false);
        }
    };

    const reset = () => {
        setFile(null); setPreview(null); setExtracted(null); setScanErr('');
        setItems([emptyItem()]); setVendor(''); setDate(''); setReceiptNumber('');
        setSubtotal(''); setTax(''); setTotal('');
    };

    const STEPS = ['Uploading image to OCR…', 'Reading receipt with Veryfi OCR…', 'Categorizing items…'];
    const stepIdx = STEPS.indexOf(scanStep);

    if (scanning && !extracted) {
        return (
            <div style={{ maxWidth: '900px' }}>
                <div style={{ background: WH, borderRadius: '16px', padding: '48px 32px', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', textAlign: 'center' }}>
                    {preview && <img src={preview} alt="Receipt" style={{ maxHeight: '180px', maxWidth: '100%', borderRadius: '8px', objectFit: 'contain', marginBottom: '24px', opacity: 0.75 }} />}
                    <div style={{ fontSize: '15px', fontWeight: '800', color: BK, marginBottom: '6px' }}>{scanStep || 'Processing…'}</div>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '24px' }}>This usually takes 10–20 seconds</div>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        {STEPS.map((s, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: i < stepIdx ? G : i === stepIdx ? G : '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.3s' }}>
                                    {i < stepIdx ? <span style={{ color: WH, fontSize: '12px' }}>✓</span> : <span style={{ fontSize: '10px', fontWeight: '800', color: i === stepIdx ? WH : '#94a3b8' }}>{i + 1}</span>}
                                </div>
                                {i < STEPS.length - 1 && <div style={{ width: '32px', height: '2px', background: i < stepIdx ? G : '#e2e8f0', transition: 'background 0.3s' }} />}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            {showCamera && <CameraScanner onAutoScan={handleAutoScan} onClose={() => setShowCamera(false)} />}

            <div style={{ maxWidth: '900px' }}>
                {!extracted ? (
                    <div style={{ background: WH, borderRadius: '16px', padding: '32px', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
                        <h2 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: '800', color: BK }}>Upload Receipt</h2>
                        <p style={{ margin: '0 0 24px', fontSize: '13px', color: '#888' }}>Take a photo or upload an image. All line items will be extracted automatically.</p>

                        {/* Camera button */}
                        <button
                            onClick={() => setShowCamera(true)}
                            style={{ width: '100%', padding: '14px', marginBottom: '12px', background: BK, color: WH, border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: 'system-ui,sans-serif' }}
                        >
                            Use Camera
                        </button>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                            <div style={{ flex: 1, height: '1px', background: '#eee' }} />
                            <span style={{ fontSize: '11px', color: '#bbb', fontWeight: '600', textTransform: 'uppercase' }}>or upload file</span>
                            <div style={{ flex: 1, height: '1px', background: '#eee' }} />
                        </div>

                        {/* Drop zone */}
                        <div
                            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                            onDragOver={e => e.preventDefault()}
                            onClick={() => fileRef.current.click()}
                            style={{ border: `2px dashed ${file ? G : '#ddd'}`, borderRadius: '12px', padding: '32px 20px', textAlign: 'center', cursor: 'pointer', background: file ? 'rgba(37,99,235,0.03)' : '#fafafa', transition: 'all 0.15s' }}
                            onMouseEnter={e => { if (!file) e.currentTarget.style.borderColor = G; }}
                            onMouseLeave={e => { if (!file) e.currentTarget.style.borderColor = '#ddd'; }}
                        >
                            <input ref={fileRef} type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
                            {preview
                                ? <img src={preview} alt="Receipt preview" style={{ maxHeight: '220px', maxWidth: '100%', borderRadius: '8px', objectFit: 'contain' }} />
                                : <>
                                    <div style={{ fontSize: '14px', fontWeight: '700', color: BK, marginBottom: '4px' }}>Drop receipt here or click to browse</div>
                                    <div style={{ fontSize: '12px', color: '#aaa' }}>JPG, PNG, or PDF</div>
                                  </>
                            }
                        </div>

                        {file && (
                            <div style={{ marginTop: '8px', fontSize: '12px', color: '#666', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                                <button onClick={reset} style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: '12px', cursor: 'pointer', fontFamily: 'system-ui,sans-serif', padding: 0, flexShrink: 0 }}>Remove</button>
                            </div>
                        )}

                        {scanErr && <div style={{ marginTop: '14px', padding: '10px 14px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', fontSize: '13px', color: '#991b1b' }}>{scanErr}</div>}

                        <div style={{ marginTop: '16px', display: 'flex', gap: '10px' }}>
                            <button onClick={handleScan} disabled={!file || scanning}
                                style={{ flex: 1, padding: '13px', background: !file || scanning ? '#94a3b8' : G, color: WH, border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: file && !scanning ? 'pointer' : 'not-allowed', fontFamily: 'system-ui,sans-serif' }}>
                                {scanning ? 'Scanning…' : 'Scan with AI'}
                            </button>
                            <button onClick={() => setExtracted({})}
                                style={{ padding: '13px 18px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'system-ui,sans-serif' }}>
                                Enter Manually
                            </button>
                        </div>
                    </div>
                ) : (
                    /* ── Review & Edit ── */
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                            {preview && <img src={preview} alt="Receipt" style={{ width: '56px', height: '56px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #eee', flexShrink: 0 }} />}
                            <div>
                                <div style={{ fontSize: '17px', fontWeight: '800', color: BK }}>Review & Save</div>
                                <div style={{ fontSize: '12px', color: '#888' }}>Check and edit if needed, then save.</div>
                            </div>
                            <button onClick={reset} style={{ marginLeft: 'auto', background: 'none', border: '1px solid #ddd', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', color: '#666', cursor: 'pointer', fontFamily: 'system-ui,sans-serif', flexShrink: 0 }}>← Re-scan</button>
                        </div>

                        {/* Receipt Info */}
                        <div style={{ background: WH, borderRadius: '16px', padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', marginBottom: '14px' }}>
                            <div style={{ fontSize: '12px', fontWeight: '800', color: '#64748b', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Receipt Info</div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '14px' }}>
                                <div>
                                    <label style={lbl}>Vendor / Store <span style={{ color: '#dc2626' }}>*</span></label>
                                    <input value={vendor} onChange={e => setVendor(e.target.value)} placeholder="e.g. Restaurant Depot" style={{ ...inp, width: '100%', padding: '10px 12px', boxSizing: 'border-box' }} />
                                </div>
                                <div>
                                    <label style={lbl}>Date</label>
                                    <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ ...inp, width: '100%', padding: '10px 12px', boxSizing: 'border-box' }} />
                                </div>
                                <div>
                                    <label style={lbl}>Receipt #</label>
                                    <input value={receiptNumber} onChange={e => setReceiptNumber(e.target.value)} placeholder="Optional" style={{ ...inp, width: '100%', padding: '10px 12px', boxSizing: 'border-box' }} />
                                </div>
                                {user.role === 'Owner' && (
                                    <div>
                                        <label style={lbl}>Location</label>
                                        <select value={location} onChange={e => setLocation(e.target.value)} style={{ ...inp, width: '100%', padding: '10px 12px', boxSizing: 'border-box' }}>
                                            {LOCS.map(l => <option key={l} value={l}>{l}</option>)}
                                        </select>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Line Items */}
                        {(() => {
                            const allIssues = items.map(it => getItemIssues(it));
                            const flagCount = allIssues.filter(iss => iss.length > 0).length;
                            return (
                                <div style={{ background: WH, borderRadius: '16px', padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', marginBottom: '14px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{ fontSize: '12px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Line Items ({items.length})</div>
                                            {flagCount > 0 && (
                                                <div style={{ padding: '2px 9px', background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '20px', fontSize: '11px', fontWeight: '700', color: '#92400e' }}>
                                                    {flagCount} need{flagCount === 1 ? 's' : ''} review
                                                </div>
                                            )}
                                        </div>
                                        <button onClick={addItem} style={{ padding: '6px 12px', background: G, color: WH, border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: 'system-ui,sans-serif' }}>+ Add Item</button>
                                    </div>

                                    {flagCount > 0 && (
                                        <div style={{ marginBottom: '14px', padding: '10px 14px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '8px', fontSize: '12px', color: '#92400e', lineHeight: 1.5 }}>
                                            <strong>{flagCount} item{flagCount > 1 ? 's' : ''} flagged.</strong> Highlighted rows were not read clearly — check each one and edit before saving.
                                        </div>
                                    )}

                                    <div style={{ overflowX: 'auto' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                            <thead>
                                                <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                                                    {['Item Name', 'Qty', 'Unit', 'Unit Price', 'Line Total', ''].map(h => (
                                                        <th key={h} style={{ textAlign: 'left', padding: '5px 7px', fontWeight: '700', color: '#94a3b8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {items.map((it, i) => {
                                                    const issues = allIssues[i];
                                                    const hasIssue = issues.length > 0;
                                                    const nameIssue = issues.find(x => x.field === 'name');
                                                    const totalIssue = issues.find(x => x.field === 'lineTotal');
                                                    return (
                                                        <tr key={i} style={{ borderBottom: '1px solid #f8fafc', background: hasIssue ? '#fffbeb' : 'transparent', verticalAlign: 'top' }}>
                                                            <td style={{ padding: '5px 5px' }}>
                                                                <input value={it.name} onChange={e => updateItem(i, 'name', e.target.value)} placeholder="Enter item name"
                                                                    style={{ ...inp, padding: '7px 9px', width: '100%', minWidth: '140px', boxSizing: 'border-box', borderColor: nameIssue ? '#f59e0b' : '#ddd' }} />
                                                                {nameIssue && <div style={{ fontSize: '10px', color: '#b45309', marginTop: '3px', lineHeight: 1.4 }}>{nameIssue.msg}</div>}
                                                            </td>
                                                            <td style={{ padding: '5px 5px' }}>
                                                                <input type="number" value={it.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)}
                                                                    style={{ ...inp, padding: '7px 9px', width: '62px', borderColor: hasIssue ? '#f59e0b' : '#ddd' }} />
                                                            </td>
                                                            <td style={{ padding: '5px 5px' }}>
                                                                <input value={it.unit} onChange={e => updateItem(i, 'unit', e.target.value)} placeholder="ea"
                                                                    style={{ ...inp, padding: '7px 9px', width: '56px', borderColor: hasIssue ? '#f59e0b' : '#ddd' }} />
                                                            </td>
                                                            <td style={{ padding: '5px 5px' }}>
                                                                <input type="number" step="0.01" value={it.unitPrice} onChange={e => updateItem(i, 'unitPrice', e.target.value)} placeholder="0.00"
                                                                    style={{ ...inp, padding: '7px 9px', width: '84px', borderColor: hasIssue ? '#f59e0b' : '#ddd' }} />
                                                            </td>
                                                            <td style={{ padding: '5px 5px' }}>
                                                                <input type="number" step="0.01" value={it.lineTotal} onChange={e => updateItem(i, 'lineTotal', e.target.value)} placeholder="0.00"
                                                                    style={{ ...inp, padding: '7px 9px', width: '84px', borderColor: totalIssue ? '#f59e0b' : hasIssue ? '#f59e0b' : '#ddd' }} />
                                                                {totalIssue && <div style={{ fontSize: '10px', color: '#b45309', marginTop: '3px', lineHeight: 1.4 }}>{totalIssue.msg}</div>}
                                                            </td>
                                                            <td style={{ padding: '5px 5px', verticalAlign: 'middle' }}>
                                                                <button onClick={() => removeItem(i)} style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: '16px', cursor: 'pointer', padding: '2px 4px', fontFamily: 'system-ui,sans-serif' }}>×</button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Totals */}
                        <div style={{ background: WH, borderRadius: '16px', padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', marginBottom: '18px' }}>
                            <div style={{ fontSize: '12px', fontWeight: '800', color: '#64748b', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Totals</div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '14px', maxWidth: '460px' }}>
                                {[['Subtotal ($)', subtotal, setSubtotal], ['Tax ($)', tax, setTax], ['Total ($)', total, setTotal]].map(([label, val, setter]) => (
                                    <div key={label}>
                                        <label style={lbl}>{label}</label>
                                        <input type="number" step="0.01" value={val} onChange={e => setter(e.target.value)} placeholder="0.00" style={{ ...inp, width: '100%', padding: '10px 12px', boxSizing: 'border-box' }} />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {scanErr && <div style={{ marginBottom: '14px', padding: '10px 14px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', fontSize: '13px', color: '#991b1b' }}>{scanErr}</div>}

                        <button onClick={handleSave} disabled={uploading}
                            style={{ padding: '13px 32px', background: uploading ? '#94a3b8' : G, color: WH, border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: uploading ? 'not-allowed' : 'pointer', fontFamily: 'system-ui,sans-serif' }}>
                            {uploading ? 'Saving…' : 'Save Receipt'}
                        </button>
                    </div>
                )}
            </div>
        </>
    );
}
