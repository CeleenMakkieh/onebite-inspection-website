import { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';
import { fetchUserProfile, saveUserProfile, fetchSettings } from '../db';
import { LOGO, PINK, G, WH } from '../constants';
import { inp, lbl, gbtn } from './ui';

const MODES = { login: 'login', register: 'register', forgot: 'forgot' };

function PasswordInput({ value, onChange, onKeyDown, placeholder }) {
    const [show, setShow] = useState(false);
    return (
        <div style={{ position: 'relative' }}>
            <input
                type={show ? 'text' : 'password'}
                value={value}
                onChange={onChange}
                onKeyDown={onKeyDown}
                placeholder={placeholder || '••••••••'}
                style={{ ...inp, width: '100%', padding: '11px 44px 11px 14px', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.borderColor = G}
                onBlur={e => e.target.style.borderColor = '#ccc'}
            />
            <button
                type="button"
                onClick={() => setShow(s => !s)}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#999', fontSize: '13px', fontWeight: '600', padding: '2px 4px', fontFamily: 'system-ui,sans-serif' }}
            >
                {show ? 'Hide' : 'Show'}
            </button>
        </div>
    );
}

function ErrBox({ msg }) {
    if (!msg) return null;
    return <div style={{ padding: "10px 14px", marginBottom: "14px", background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: "8px", color: "#991b1b", fontSize: "13px" }}>{msg}</div>;
}

function OkBox({ msg }) {
    if (!msg) return null;
    return <div style={{ padding: "10px 14px", marginBottom: "14px", background: "#dcfce7", border: "1px solid #86efac", borderRadius: "8px", color: "#166534", fontSize: "13px" }}>{msg}</div>;
}

function authErrMsg(e) {
    switch (e.code) {
        case 'auth/configuration-not-found':
        case 'auth/operation-not-allowed': return 'Email sign-in is not enabled. Go to Firebase Console → Authentication → Sign-in method → enable Email/Password.';
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential': return 'Incorrect email or password.';
        case 'auth/invalid-email': return 'Please enter a valid email address.';
        case 'auth/too-many-requests': return 'Too many failed attempts. Try again later.';
        case 'auth/email-already-in-use': return 'An account with this email already exists.';
        case 'auth/weak-password': return 'Password must be at least 6 characters.';
        case 'auth/network-request-failed': return 'Network error. Check your internet connection.';
        default: return e.message || 'Something went wrong. Try again.';
    }
}

export function LoginPage({ onLogin }) {
    const [mode, setMode] = useState(MODES.login);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [name, setName] = useState('');
    const [regCode, setRegCode] = useState('');
    const [err, setErr] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [load, setLoad] = useState(false);

    const goMode = (m) => { setMode(m); setErr(''); setSuccessMsg(''); };

    const handleLogin = async () => {
        if (!email || !password) { setErr('Please enter your email and password.'); return; }
        setLoad(true); setErr('');
        try {
            const cred = await signInWithEmailAndPassword(auth, email, password);
            const profile = await fetchUserProfile(cred.user.uid);
            if (!profile) { setErr('Account has no profile. Contact the owner.'); setLoad(false); return; }
            onLogin({ uid: cred.user.uid, email: cred.user.email, name: profile.name, role: profile.role, location: profile.location || null });
        } catch (e) {
            setErr(authErrMsg(e));
            setLoad(false);
        }
    };

    const handleRegister = async () => {
        if (!name.trim() || !email || !password || !confirm || !regCode.trim()) { setErr('All fields are required.'); return; }
        if (password.length < 6) { setErr('Password must be at least 6 characters.'); return; }
        if (password !== confirm) { setErr('Passwords do not match.'); return; }
        setLoad(true); setErr('');
        try {
            const settings = await fetchSettings();
            const codes = settings.locationCodes || {};
            const entered = regCode.trim().toUpperCase();
            const matchedKey = Object.keys(codes).find(k => codes[k].toUpperCase() === entered);
            if (!matchedKey) {
                setErr('Invalid registration code. Contact the owner.');
                setLoad(false);
                return;
            }
            let derivedRole, derivedLocation;
            if (matchedKey === 'owner') {
                derivedRole = 'Owner';
                derivedLocation = null;
            } else {
                const parts = matchedKey.split('-'); // e.g. ["Fort Worth", "staff"] or ["Richardson", "manager"]
                const roleSlug = parts[parts.length - 1];
                derivedLocation = parts.slice(0, -1).join('-');
                derivedRole = roleSlug.charAt(0).toUpperCase() + roleSlug.slice(1);
            }
            const cred = await createUserWithEmailAndPassword(auth, email, password);
            const profile = { name: name.trim(), role: derivedRole, email, location: derivedLocation };
            await saveUserProfile(cred.user.uid, profile);
            onLogin({ uid: cred.user.uid, email, name: name.trim(), role: derivedRole, location: derivedLocation });
        } catch (e) {
            setErr(authErrMsg(e));
            setLoad(false);
        }
    };

    const handleForgot = async () => {
        if (!email) { setErr('Please enter your email address.'); return; }
        setLoad(true); setErr(''); setSuccessMsg('');
        try {
            await sendPasswordResetEmail(auth, email);
            setSuccessMsg('Password reset email sent — check your inbox.');
        } catch (e) {
            setErr(authErrMsg(e));
        }
        setLoad(false);
    };

    const handleKey = (e) => {
        if (e.key !== 'Enter') return;
        if (mode === MODES.login) handleLogin();
        else if (mode === MODES.register) handleRegister();
        else handleForgot();
    };

    const fieldStyle = { marginBottom: "14px" };
    const linkStyle = { color: G, fontWeight: "700", cursor: "pointer", textDecoration: "underline" };
    const backStyle = { background: "none", border: "none", color: G, fontSize: "13px", fontWeight: "700", cursor: "pointer", padding: "0 0 16px 0", fontFamily: "system-ui,sans-serif", display: "block" };

    return (
        <div style={{ minHeight: "100vh", background: PINK, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui,sans-serif", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: "-80px", right: "-80px", width: "300px", height: "300px", borderRadius: "50%", background: "rgba(0,138,95,0.08)" }} />
            <div style={{ position: "absolute", bottom: "-60px", left: "-60px", width: "240px", height: "240px", borderRadius: "50%", background: "rgba(0,138,95,0.05)" }} />

            <div style={{ width: "420px", background: WH, borderRadius: "20px", padding: "40px 44px 36px", boxShadow: "0 20px 60px rgba(0,0,0,0.12)", position: "relative", zIndex: 1 }}>

                {/* Logo — always visible */}
                <div style={{ textAlign: "center", marginBottom: "28px" }}>
                    <img src={LOGO} alt="One Bite" style={{ width: "90px", height: "90px", borderRadius: "50%", objectFit: "cover", marginBottom: "12px", boxShadow: `0 8px 24px rgba(0,138,95,0.3)` }} />
                    <div style={{ fontSize: "11px", letterSpacing: "0.25em", color: G, textTransform: "uppercase", fontWeight: "700", marginBottom: "2px" }}>Staff Portal</div>

                    <p style={{ fontSize: "13px", color: "#888", margin: "3px 0 0" }}>Mini Pitas & Juice Bar</p>
                </div>

                {/* ── SIGN IN ── */}
                {mode === MODES.login && (
                    <>
                        <div style={fieldStyle}>
                            <label style={lbl}>Email</label>
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={handleKey}
                                placeholder="your@email.com"
                                style={{ ...inp, width: "100%", padding: "11px 14px", boxSizing: "border-box" }}
                                onFocus={e => e.target.style.borderColor = G} onBlur={e => e.target.style.borderColor = "#ccc"} />
                        </div>
                        <div style={fieldStyle}>
                            <label style={lbl}>Password</label>
                            <PasswordInput value={password} onChange={e => setPassword(e.target.value)} onKeyDown={handleKey} />
                        </div>
                        <ErrBox msg={err} />
                        <button onClick={handleLogin} disabled={load}
                            style={{ ...gbtn, width: "100%", padding: "13px", fontSize: "14px", opacity: load ? 0.6 : 1, boxSizing: "border-box" }}>
                            {load ? "Signing in…" : "Sign In"}
                        </button>
                        <div style={{ marginTop: "18px", textAlign: "center", fontSize: "13px", color: "#888" }}>
                            <span onClick={() => goMode(MODES.forgot)} style={linkStyle}>Forgot password?</span>
                        </div>
                        <div style={{ marginTop: "10px", textAlign: "center", fontSize: "13px", color: "#888" }}>
                            No account?{" "}
                            <span onClick={() => goMode(MODES.register)} style={linkStyle}>Create one</span>
                        </div>
                    </>
                )}

                {/* ── CREATE ACCOUNT ── */}
                {mode === MODES.register && (
                    <>
                        <button onClick={() => goMode(MODES.login)} style={backStyle}>← Back to Sign In</button>
                        <div style={fieldStyle}>
                            <label style={lbl}>Full Name</label>
                            <input value={name} onChange={e => setName(e.target.value)} onKeyDown={handleKey}
                                placeholder="e.g. Alex Rivera"
                                style={{ ...inp, width: "100%", padding: "11px 14px", boxSizing: "border-box" }}
                                onFocus={e => e.target.style.borderColor = G} onBlur={e => e.target.style.borderColor = "#ccc"} />
                        </div>
                        <div style={fieldStyle}>
                            <label style={lbl}>Registration Code <span style={{ color: "#dc2626" }}>*</span></label>
                            <input value={regCode} onChange={e => setRegCode(e.target.value)} onKeyDown={handleKey}
                                placeholder="Enter your registration code"
                                style={{ ...inp, width: "100%", padding: "11px 14px", boxSizing: "border-box", textTransform: "uppercase", letterSpacing: "0.08em" }}
                                onFocus={e => e.target.style.borderColor = G} onBlur={e => e.target.style.borderColor = "#ccc"} />
                            <div style={{ fontSize: "11px", color: "#888", marginTop: "5px" }}>Your role and location will be assigned automatically based on this code.</div>
                        </div>
                        <div style={fieldStyle}>
                            <label style={lbl}>Email</label>
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={handleKey}
                                placeholder="your@email.com"
                                style={{ ...inp, width: "100%", padding: "11px 14px", boxSizing: "border-box" }}
                                onFocus={e => e.target.style.borderColor = G} onBlur={e => e.target.style.borderColor = "#ccc"} />
                        </div>
                        <div style={fieldStyle}>
                            <label style={lbl}>Password <span style={{ color: "#aaa", fontWeight: "400", textTransform: "none" }}>(min 6 chars)</span></label>
                            <PasswordInput value={password} onChange={e => setPassword(e.target.value)} onKeyDown={handleKey} />
                        </div>
                        <div style={fieldStyle}>
                            <label style={lbl}>Confirm Password</label>
                            <PasswordInput value={confirm} onChange={e => setConfirm(e.target.value)} onKeyDown={handleKey} placeholder="Re-enter password" />
                        </div>
                        <ErrBox msg={err} />
                        <button onClick={handleRegister} disabled={load}
                            style={{ ...gbtn, width: "100%", padding: "13px", fontSize: "14px", opacity: load ? 0.6 : 1, boxSizing: "border-box" }}>
                            {load ? "Creating account…" : "Create Account"}
                        </button>
                    </>
                )}

                {/* ── FORGOT PASSWORD ── */}
                {mode === MODES.forgot && (
                    <>
                        <button onClick={() => goMode(MODES.login)} style={backStyle}>← Back to Sign In</button>
                        <p style={{ fontSize: "13px", color: "#666", margin: "0 0 18px", lineHeight: 1.6 }}>
                            Enter your email and we'll send you a link to reset your password.
                        </p>
                        <div style={fieldStyle}>
                            <label style={lbl}>Email</label>
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={handleKey}
                                placeholder="your@email.com"
                                style={{ ...inp, width: "100%", padding: "11px 14px", boxSizing: "border-box" }}
                                onFocus={e => e.target.style.borderColor = G} onBlur={e => e.target.style.borderColor = "#ccc"} />
                        </div>
                        <ErrBox msg={err} />
                        <OkBox msg={successMsg} />
                        <button onClick={handleForgot} disabled={load || !!successMsg}
                            style={{ ...gbtn, width: "100%", padding: "13px", fontSize: "14px", opacity: (load || !!successMsg) ? 0.6 : 1, boxSizing: "border-box" }}>
                            {load ? "Sending…" : "Send Reset Email"}
                        </button>
                    </>
                )}

            </div>
        </div>
    );
}
