import { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase';
import { LoginPage } from './components/LoginPage';
import { DashView } from './components/DashView';
import { RepsView } from './components/RepsView';
import { DetailView } from './components/DetailView';
import { NewInspView } from './components/NewInspView';
import { DailyView } from './components/DailyView';
import { SettingsView } from './components/SettingsView';
import { LOGO, PINK, G, BK, WH, DEF_INSP_CATS, DEF_TEMP, DEF_APPL, DEF_TASKS } from './constants';
import { gbtn } from './components/ui';
import { fetchReports, saveReport, fetchDailyTasks, saveDailyTask, deleteDailyTask, fetchCompletions, saveCompletions, fetchSettings, saveSetting, fetchUserProfile } from './db';

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
    const [dailyTasks, setDailyTasks] = useState(DEF_TASKS);
    const [completions, setCompletions] = useState({});

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
                        isUserSetRef.current = true;
                        setUser({ uid: firebaseUser.uid, email: firebaseUser.email, ...profile });
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
                const [r, t, c, s] = await Promise.all([
                    fetchReports(),
                    fetchDailyTasks(),
                    fetchCompletions(todayKey),
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
                }
            } catch (err) {
                console.error("Error loading data from Firebase:", err);
            }
        }
        loadData();
    }, [user]);

    // Called directly by LoginPage after successful sign-in / register
    const handleLogin = (u) => {
        isUserSetRef.current = true;
        setUser(u);
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

    // ── Daily task handlers (persist to Firebase) ──
    const handleAddTask = async (taskData) => {
        const task = { ...taskData, id: Date.now() };
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
        await saveCompletions(todayKey, newComps);
    };

    const nav = [
        { id: "dashboard", label: "Dashboard", icon: "⊞" },
        { id: "new", label: "New Inspection", icon: "＋" },
        { id: "reports", label: "All Reports", icon: "≡" },
        { id: "daily", label: "Daily Tasks", icon: "✓" },
        { id: "settings", label: "Settings", icon: "⚙" }
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
            <div style={{ position: "fixed", left: 0, top: 0, bottom: 0, width: "220px", background: G, display: "flex", flexDirection: "column", zIndex: 100, boxShadow: "4px 0 16px rgba(0,0,0,0.12)" }}>
                <div style={{ padding: "20px 16px 16px", borderBottom: "1px solid rgba(255,255,255,0.15)", display: "flex", alignItems: "center", gap: "12px" }}>
                    <img src={LOGO} alt="One Bite" style={{ width: "44px", height: "44px", borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "2px solid rgba(255,255,255,0.4)" }} />
                    <div>
                        <div style={{ fontSize: "15px", fontWeight: "800", color: WH, lineHeight: 1.1 }}>One Bite</div>
                        <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.7)", letterSpacing: "0.1em", textTransform: "uppercase" }}>Inspection HQ</div>
                    </div>
                </div>
                <nav style={{ padding: "12px 10px", flex: 1 }}>
                    {nav.map(item => (
                        <button key={item.id} onClick={() => item.id === "new" ? startNew() : setView(item.id)} style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%", padding: "11px 14px", background: view === item.id ? "rgba(255,255,255,0.18)" : "transparent", border: "none", borderRadius: "8px", color: WH, fontSize: "14px", cursor: "pointer", textAlign: "left", marginBottom: "3px", fontFamily: "system-ui,sans-serif", fontWeight: view === item.id ? "700" : "400" }}>
                            <span style={{ fontSize: "16px", width: "20px", textAlign: "center" }}>{item.icon}</span>{item.label}
                        </button>
                    ))}
                </nav>
                <div style={{ padding: "14px", borderTop: "1px solid rgba(255,255,255,0.15)" }}>
                    <div style={{ padding: "10px 12px", background: "rgba(255,255,255,0.12)", borderRadius: "8px", marginBottom: "10px" }}>
                        <div style={{ fontSize: "13px", color: WH, fontWeight: "700" }}>{user.name}</div>
                        <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{user.role}</div>
                    </div>
                    <button
                        onClick={() => signOut(auth)}
                        style={{ width: "100%", padding: "9px", background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: "8px", color: "rgba(255,255,255,0.85)", fontSize: "12px", cursor: "pointer", fontFamily: "system-ui,sans-serif", textTransform: "uppercase", letterSpacing: "0.08em" }}
                        onMouseEnter={e => { e.target.style.background = "rgba(220,50,50,0.35)"; e.target.style.color = WH; }}
                        onMouseLeave={e => { e.target.style.background = "rgba(255,255,255,0.12)"; e.target.style.color = "rgba(255,255,255,0.85)"; }}
                    >Sign Out</button>
                </div>
            </div>

            <div style={{ marginLeft: "220px", minHeight: "100vh" }}>
                <div style={{ padding: "18px 32px", background: "rgba(246,209,209,0.92)", borderBottom: `1px solid rgba(0,138,95,0.15)`, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50 }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: "22px", fontWeight: "800", color: G }}>{titles[view] || "—"}</h1>
                        <div style={{ fontSize: "12px", color: BK, marginTop: "2px" }}>{new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</div>
                    </div>
                    {view === "dashboard" && <button onClick={startNew} style={gbtn}>＋ New Inspection</button>}
                </div>

                <div style={{ padding: "24px 32px" }}>
                    {view === "dashboard" && <DashView reports={reports} setView={setView} setSelReport={setSelReport} />}
                    {view === "new" && newInsp && <NewInspView inspection={newInsp} setInspection={setNewInsp} onSubmit={submitInsp} onCancel={() => setView("dashboard")} inspCats={inspCats} tempItems={tempItems} appliances={appliances} tempRequired={tempRequired} appliancesRequired={appliancesRequired} />}
                    {view === "reports" && <RepsView reports={reports} filterStatus={filterStatus} setFilterStatus={setFilterStatus} setSelReport={setSelReport} setView={setView} />}
                    {view === "detail" && selReport && <DetailView report={selReport} onBack={() => setView("reports")} tempItems={tempItems} appliances={appliances} onReview={markReviewed} />}
                    {view === "daily" && <DailyView dailyTasks={dailyTasks} onAdd={handleAddTask} onRemove={handleRemoveTask} onEdit={handleEditTask} completions={completions[todayKey] || {}} setCompletions={updateCompletions} />}
                    {view === "settings" && <SettingsView user={user} inspCats={inspCats} setInspCats={updateInspCats} tempItems={tempItems} setTempItems={updateTempItems} appliances={appliances} setAppliances={updateAppliances} tempRequired={tempRequired} setTempRequired={updateTempRequired} appliancesRequired={appliancesRequired} setAppliancesRequired={updateAppliancesRequired} />}
                </div>
            </div>
        </div>
    );
}
