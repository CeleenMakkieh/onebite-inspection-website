import { useState, useEffect, useRef } from 'react';
import emailjs from '@emailjs/browser';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase';
import { LoginPage } from './components/LoginPage';
import { PortalSelectPage } from './components/PortalSelectPage';
import { DashView } from './components/DashView';
import { RepsView } from './components/RepsView';
import { DetailView } from './components/DetailView';
import { NewInspView } from './components/NewInspView';
import { DailyView } from './components/DailyView';
import { SettingsView } from './components/SettingsView';
import { ReceiptPortal } from './components/receipts/ReceiptPortal';
import { LOGO, PINK, G, BK, WH, DEF_INSP_CATS, DEF_TEMP, DEF_APPL, DEF_TASKS } from './constants';
import { gbtn } from './components/ui';
import { fetchReports, fetchReportsByLocation, saveReport, fetchDailyTasks, fetchDailyTasksByLocation, saveDailyTask, deleteDailyTask, fetchCompletions, saveCompletions, fetchSettings, saveSetting, fetchUserProfile, saveUserProfile } from './db';

function normalizeRole(r) {
    if (!r) return r;
    const t = r.trim();
    return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}

export default function App() {
    const [user, setUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
    const isUserSetRef = useRef(false);

    const [view, setView] = useState("dashboard");
    const [reports, setReports] = useState([]);
    const [selReport, setSelReport] = useState(null);
    const [newInsp, setNewInsp] = useState(null);
    const [filterStatus, setFilterStatus] = useState("All");

    const [inspCats, setInspCats] = useState(DEF_INSP_CATS);
    const [tempItems, setTempItems] = useState(DEF_TEMP);
    const [appliances, setAppliances] = useState(DEF_APPL);
    const [tempRequired, setTempRequired] = useState(true);
    const [appliancesRequired, setAppliancesRequired] = useState(true);
    const [hasletAddress, setHasletAddress] = useState('');
    const [locationCodes, setLocationCodes] = useState({});
    const [dailyTasks, setDailyTasks] = useState(DEF_TASKS);
    const [completions, setCompletions] = useState({});
    const [locationComps, setLocationComps] = useState({});
    const [activePortal, setActivePortal] = useState(null); // null = not chosen yet, 'inspection', 'receipts'
    const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768);
    const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

    const todayKey = new Date().toISOString().split("T")[0];

    // ── Auth listener (handles page refresh / sign-out) ──
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
            if (!firebaseUser) {
                isUserSetRef.current = false;
                setUser(null);
                setView("dashboard");
                setAuthLoading(false);
            } else if (!isUserSetRef.current) {
                // Page was refreshed while logged in — restore session
                try {
                    const profile = await fetchUserProfile(firebaseUser.uid);
                    if (profile) {
                        const fixedRole = normalizeRole(profile.role);
                        console.log('[Auth] Profile loaded — role stored:', profile.role, '→ normalized:', fixedRole, '| location:', profile.location);
                        if (fixedRole !== profile.role) {
                            saveUserProfile(firebaseUser.uid, { ...profile, role: fixedRole }).catch(console.error);
                        }
                        isUserSetRef.current = true;
                        setUser({ uid: firebaseUser.uid, email: firebaseUser.email, ...profile, role: fixedRole });
                    }
                } catch (e) {
                    console.error("Error restoring session:", e);
                }
                setAuthLoading(false);
            } else {
                setAuthLoading(false);
            }
        });
        return unsub;
    }, []);

    // ── Load app data when user logs in ──
    useEffect(() => {
        if (!user) return;

        async function loadData() {
            try {
                const isOwner = user.role === 'Owner';
                const userLocation = user.location || null;

                const reportsPromise = isOwner
                    ? fetchReports()
                    : userLocation ? fetchReportsByLocation(userLocation) : Promise.resolve([]);

                const tasksPromise = isOwner
                    ? fetchDailyTasks()
                    : userLocation ? fetchDailyTasksByLocation(userLocation) : Promise.resolve(null);

                const [r, t, c, s] = await Promise.all([
                    reportsPromise,
                    tasksPromise,
                    fetchCompletions(todayKey, userLocation),
                    fetchSettings()
                ]);

                setReports(r || []);
                if (t && t.length > 0) setDailyTasks(t);
                setCompletions(prev => ({ ...prev, [todayKey]: c || {} }));

                if (s) {
                    if (s.inspCats) setInspCats(s.inspCats);
                    if (s.tempItems) setTempItems(s.tempItems);
                    if (s.appliances) setAppliances(s.appliances);
                    if (s.tempRequired !== undefined) setTempRequired(s.tempRequired);
                    if (s.appliancesRequired !== undefined) setAppliancesRequired(s.appliancesRequired);
                    if (s.hasletAddress !== undefined) setHasletAddress(s.hasletAddress);
                    if (s.locationCodes) setLocationCodes(s.locationCodes);
                }

                // For owner: load each location's completions for the activity report
                if (isOwner) {
                    const LOCS = ['Richardson', 'Fort Worth', 'Haslet'];
                    const lcResults = await Promise.all(LOCS.map(loc => fetchCompletions(todayKey, loc)));
                    const lc = {};
                    LOCS.forEach((loc, i) => { lc[loc] = lcResults[i] || {}; });
                    setLocationComps(lc);
                }
            } catch (err) {
                console.error("Error loading data from Firebase:", err);
            }
        }
        loadData();
    }, [user]);

    // Guard: redirect away from forbidden views (must be before ALL early returns)
    useEffect(() => {
        if (!user) return;
        const canAccess = user.role === 'Owner';
        const canView = user.role === 'Owner' || user.role === 'Manager';
        if (!canAccess && view === "settings") setView("dashboard");
        if (!canView && (view === "reports" || view === "new" || view === "detail")) setView("dashboard");
    }, [user, view]);

    // Responsive sidebar — update isMobile on resize
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    // Called directly by LoginPage after successful sign-in / register
    const handleLogin = (u) => {
        isUserSetRef.current = true;
        setUser({ ...u, role: normalizeRole(u.role) });
        setActivePortal(null); // always show portal select on fresh login
        setAuthLoading(false);
    };

    if (authLoading) {
        return (
            <div style={{ minHeight: "100vh", background: PINK, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui,sans-serif" }}>
                <div style={{ fontSize: "14px", color: G, fontWeight: "700" }}>Loading…</div>
            </div>
        );
    }

    if (!user) return <LoginPage onLogin={handleLogin} />;

    // Staff can only access inspection — skip portal selection
    const canAccessReceipts = user.role === 'Owner' || user.role === 'Manager';
    if (!activePortal) {
        if (!canAccessReceipts) {
            // Staff: auto-route to inspection, no choice
            setActivePortal('inspection');
            return null;
        }
        return <PortalSelectPage user={user} onSelect={setActivePortal} />;
    }

    if (activePortal === 'receipts') {
        if (!canAccessReceipts) { setActivePortal('inspection'); return null; }
        return <ReceiptPortal user={user} onSwitchPortal={() => setActivePortal(null)} />;
    }

    // ── Settings setters (persist to Firebase) ──
    const updateInspCats = async (newCats) => {
        setInspCats(newCats);
        try { await saveSetting('inspCats', newCats); } catch (e) { console.error(e); }
    };
    const updateTempItems = async (newItems) => {
        setTempItems(newItems);
        try { await saveSetting('tempItems', newItems); } catch (e) { console.error(e); }
    };
    const updateAppliances = async (newAppl) => {
        setAppliances(newAppl);
        try { await saveSetting('appliances', newAppl); } catch (e) { console.error(e); }
    };
    const updateTempRequired = async (val) => {
        setTempRequired(val);
        try { await saveSetting('tempRequired', val); } catch (e) { console.error(e); }
    };
    const updateAppliancesRequired = async (val) => {
        setAppliancesRequired(val);
        try { await saveSetting('appliancesRequired', val); } catch (e) { console.error(e); }
    };
    const updateHasletAddress = async (val) => {
        setHasletAddress(val);
        try { await saveSetting('hasletAddress', val); } catch (e) { console.error(e); }
    };

    // ── Daily task handlers (persist to Firebase) ──
    const handleAddTask = async (taskData) => {
        const location = user.role === 'Owner' ? (taskData.location || 'Richardson') : user.location;
        const task = { ...taskData, id: Date.now(), location };
        setDailyTasks(prev => [...prev, task]);
        try { await saveDailyTask(task); } catch (e) { console.error(e); }
    };
    const handleRemoveTask = async (id) => {
        setDailyTasks(prev => prev.filter(t => t.id !== id));
        try { await deleteDailyTask(id); } catch (e) { console.error(e); }
    };
    const handleEditTask = async (id, updates) => {
        let updated;
        setDailyTasks(prev => prev.map(t => {
            if (t.id === id) { updated = { ...t, ...updates }; return updated; }
            return t;
        }));
        try { if (updated) await saveDailyTask(updated); } catch (e) { console.error(e); }
    };

    const startNew = () => {
        setNewInsp({
            id: Date.now(),
            date: todayKey,
            assignedTo: user.name,
            submittedBy: user.name,
            location: "",
            notes: "",
            results: {},
            tempReadings: {},
            applianceReadings: {},
            photos: []
        });
        setView("new");
    };

    const submitInsp = async (insp) => {
        const allItems = inspCats.flatMap(c => c.items.map(item => `${c.id}__${item}`));
        const total = allItems.length + tempItems.length;
        const passed = Object.values(insp.results).filter(v => v === "pass").length;
        const ans = Object.values(insp.results).filter(v => v !== undefined).length;

        const score = ans > 0 ? Math.round((passed / total) * 100) : 0;
        // Strip photo data (base64) before saving to Firestore — images are too large for Firestore docs
        const { photos, ...inspWithoutPhotos } = insp;
        const finalInsp = { ...inspWithoutPhotos, photoCount: photos.length, score, status: score >= 75 ? "Completed" : "Needs Review" };

        try {
            await saveReport(finalInsp);
            setReports(prev => [finalInsp, ...prev]);
            setView("dashboard");
            setNewInsp(null);
            // Send email notification (fire and forget — don't block UI)
            emailjs.send(
                import.meta.env.VITE_EMAILJS_SERVICE_ID,
                import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
                {
                    location: finalInsp.location || "Unknown",
                    score: finalInsp.score,
                    submitted_by: finalInsp.submittedBy,
                    assigned_to: finalInsp.assignedTo,
                    date: finalInsp.date,
                    status: finalInsp.status,
                    to_email: "onebite.texas@gmail.com",
                },
                import.meta.env.VITE_EMAILJS_PUBLIC_KEY
            ).catch(err => console.warn("Email notification failed:", err));
        } catch (e) {
            console.error("Failed to save report:", e);
            alert("Failed to save report: " + (e.message || "Unknown error"));
        }
    };

    const markReviewed = async (report) => {
        const updated = { ...report, status: "Reviewed" };
        try {
            await saveReport(updated);
            setReports(prev => prev.map(r => r.id === report.id ? updated : r));
            setSelReport(updated);
        } catch (e) {
            alert("Failed to update report: " + (e.message || "Unknown error"));
        }
    };

    const updateCompletions = async (newComps) => {
        setCompletions(prev => ({ ...prev, [todayKey]: newComps }));
        await saveCompletions(todayKey, newComps, user.location || null);
    };

    const canManageTasks = user.role === 'Owner' || user.role === 'Manager';
    const canViewReports = user.role === 'Owner' || user.role === 'Manager';
    const canAccessSettings = user.role === 'Owner';
    const needsLocation = user.role !== 'Owner' && !user.location;

    const nav = [
        { id: "dashboard", label: "Dashboard", icon: "⊞" },
        ...(canViewReports ? [{ id: "new", label: "New Inspection", icon: "＋" }] : []),
        ...(canViewReports ? [{ id: "reports", label: "All Reports", icon: "≡" }] : []),
        { id: "daily", label: "Daily Tasks", icon: "✓" },
        ...(canAccessSettings ? [{ id: "settings", label: "Settings", icon: "⚙" }] : []),
    ];

    const titles = {
        dashboard: "Dashboard",
        new: "New Inspection",
        reports: "Inspection Reports",
        detail: "Inspection Detail",
        daily: "Daily Task Sheet",
        settings: "Settings"
    };

    return (
        <div style={{ minHeight: "100vh", background: PINK, fontFamily: "system-ui,sans-serif", color: BK }}>
            <div style={{ position: "fixed", left: 0, top: 0, bottom: 0, width: "220px", background: G, display: "flex", flexDirection: "column", zIndex: 100, boxShadow: "4px 0 16px rgba(0,0,0,0.12)", transform: sidebarOpen ? "translateX(0)" : "translateX(-220px)", transition: "transform 0.25s ease" }}>
                <div style={{ padding: "20px 16px 16px", borderBottom: "1px solid rgba(255,255,255,0.15)", display: "flex", alignItems: "center", gap: "12px" }}>
                    <img src={LOGO} alt="One Bite" style={{ width: "44px", height: "44px", borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "2px solid rgba(255,255,255,0.4)" }} />
                    <div>
                        <div style={{ fontSize: "15px", fontWeight: "800", color: WH, lineHeight: 1.1 }}>One Bite</div>
                        <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.7)", letterSpacing: "0.1em", textTransform: "uppercase" }}>Inspection HQ</div>
                    </div>
                </div>
                <nav style={{ padding: "12px 10px", flex: 1 }}>
                    {nav.map(item => (
                        <button key={item.id} onClick={() => { if (item.id === "new") startNew(); else setView(item.id); if (isMobile) setSidebarOpen(false); }} style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%", padding: "11px 14px", background: view === item.id ? "rgba(255,255,255,0.18)" : "transparent", border: "none", borderRadius: "8px", color: WH, fontSize: "14px", cursor: "pointer", textAlign: "left", marginBottom: "3px", fontFamily: "system-ui,sans-serif", fontWeight: view === item.id ? "700" : "400" }}>
                            <span style={{ fontSize: "16px", width: "20px", textAlign: "center" }}>{item.icon}</span>{item.label}
                        </button>
                    ))}
                </nav>
                <div style={{ padding: "14px", borderTop: "1px solid rgba(255,255,255,0.15)", display: "flex", flexDirection: "column", gap: "8px" }}>
                    {canAccessReceipts && (
                        <button
                            onClick={() => setActivePortal(null)}
                            style={{ width: "100%", padding: "9px", background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: "8px", color: WH, fontSize: "12px", cursor: "pointer", fontFamily: "system-ui,sans-serif", textTransform: "uppercase", letterSpacing: "0.08em" }}
                            onMouseEnter={e => e.target.style.background = "rgba(255,255,255,0.22)"}
                            onMouseLeave={e => e.target.style.background = "rgba(255,255,255,0.12)"}
                        >⇄ Switch Portal</button>
                    )}
                    <div style={{ padding: "10px 12px", background: "rgba(255,255,255,0.12)", borderRadius: "8px" }}>
                        <div style={{ fontSize: "13px", color: WH, fontWeight: "700" }}>{user.name}</div>
                        <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{user.role}</div>
                        {user.location && <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.55)", marginTop: "2px" }}>{user.location}</div>}
                    </div>
                    <button
                        onClick={() => signOut(auth)}
                        style={{ width: "100%", padding: "9px", background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: "8px", color: "rgba(255,255,255,0.85)", fontSize: "12px", cursor: "pointer", fontFamily: "system-ui,sans-serif", textTransform: "uppercase", letterSpacing: "0.08em" }}
                        onMouseEnter={e => { e.target.style.background = "rgba(220,50,50,0.35)"; e.target.style.color = WH; }}
                        onMouseLeave={e => { e.target.style.background = "rgba(255,255,255,0.12)"; e.target.style.color = "rgba(255,255,255,0.85)"; }}
                    >Sign Out</button>
                </div>
            </div>

            {sidebarOpen && isMobile && (
                <div onClick={() => setSidebarOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 99 }} />
            )}

            <div style={{ marginLeft: isMobile ? 0 : (sidebarOpen ? "220px" : "0"), transition: "margin-left 0.25s ease", minHeight: "100vh" }}>
                <div style={{ padding: isMobile ? "12px 14px" : "18px 32px", background: "rgba(246,209,209,0.92)", borderBottom: `1px solid rgba(0,138,95,0.15)`, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                        <button onClick={() => setSidebarOpen(o => !o)} style={{ background: "none", border: "none", cursor: "pointer", padding: "6px 8px", color: G, fontSize: "22px", lineHeight: 1, borderRadius: "6px", flexShrink: 0, fontFamily: "system-ui,sans-serif" }}>
                            {sidebarOpen ? "✕" : "☰"}
                        </button>
                        <div style={{ minWidth: 0 }}>
                            <h1 style={{ margin: 0, fontSize: isMobile ? "17px" : "22px", fontWeight: "800", color: G, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{titles[view] || "—"}</h1>
                            {!isMobile && <div style={{ fontSize: "12px", color: BK, marginTop: "2px" }}>{new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</div>}
                        </div>
                    </div>
                    {view === "dashboard" && canViewReports && <button onClick={startNew} style={gbtn}>＋ New Inspection</button>}
                </div>

                <div style={{ padding: isMobile ? "16px 14px" : "24px 32px" }}>
                    {needsLocation && (
                        <div style={{ marginBottom: "18px", padding: "12px 16px", background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: "8px", fontSize: "13px", color: "#92400e", fontWeight: "600" }}>
                            Your account has no location assigned. Contact the owner.
                        </div>
                    )}
                    {view === "dashboard" && <DashView reports={reports} setView={setView} setSelReport={setSelReport} hasletAddress={hasletAddress} user={user} dailyTasks={dailyTasks} todayCompletions={completions[todayKey] || {}} canViewReports={canViewReports} locationComps={locationComps} />}
                    {view === "new" && newInsp && canViewReports && <NewInspView inspection={newInsp} setInspection={setNewInsp} onSubmit={submitInsp} onCancel={() => setView("dashboard")} inspCats={inspCats} tempItems={tempItems} appliances={appliances} tempRequired={tempRequired} appliancesRequired={appliancesRequired} user={user} isMobile={isMobile} />}
                    {view === "reports" && canViewReports && <RepsView reports={reports} filterStatus={filterStatus} setFilterStatus={setFilterStatus} setSelReport={setSelReport} setView={setView} />}
                    {view === "detail" && selReport && canViewReports && <DetailView report={selReport} onBack={() => setView("reports")} tempItems={tempItems} appliances={appliances} onReview={markReviewed} />}
                    {view === "daily" && <DailyView dailyTasks={dailyTasks} onAdd={handleAddTask} onRemove={handleRemoveTask} onEdit={handleEditTask} completions={completions[todayKey] || {}} setCompletions={updateCompletions} canManageTasks={canManageTasks} isOwner={user.role === 'Owner'} user={user} />}
                    {view === "settings" && canAccessSettings && <SettingsView user={user} inspCats={inspCats} setInspCats={updateInspCats} tempItems={tempItems} setTempItems={updateTempItems} appliances={appliances} setAppliances={updateAppliances} tempRequired={tempRequired} setTempRequired={updateTempRequired} appliancesRequired={appliancesRequired} setAppliancesRequired={updateAppliancesRequired} hasletAddress={hasletAddress} setHasletAddress={updateHasletAddress} locationCodes={locationCodes} setLocationCodes={setLocationCodes} />}
                </div>
            </div>
        </div>
    );
}
