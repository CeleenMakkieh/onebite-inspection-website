export const LOGO = "/logo.png";
export const USERS = [
    { username: 'owner', password: 'owner123', role: 'Owner', name: 'Alex Rivera' },
    { username: 'manager', password: 'mgr123', role: 'Manager', name: 'Jordan Kim' }
];
export const STAFF = ['Carlos M.', 'Priya S.', 'DeShawn T.', 'Lily W.', 'Marcus B.'];
export const DEF_INSP_CATS = [
    { id: 1, category: 'Personal Hygiene', required: true, items: ['Staff wearing proper hair restraints', 'Handwashing performed correctly and frequently', 'No bare-hand contact with ready-to-eat foods', 'Gloves used appropriately', 'Staff free of illness symptoms'] },
    { id: 2, category: 'Cross-Contamination Prevention', required: true, items: ['Raw meats stored below ready-to-eat foods', 'Color-coded cutting boards used correctly', 'Separate utensils for raw and cooked foods', 'Proper sanitizing between tasks', 'Allergen protocols followed'] },
    { id: 3, category: 'Facility & Equipment', required: true, items: ['All surfaces clean and sanitized', 'Refrigeration units functioning properly', 'Pest control — no signs of infestation', 'Proper waste disposal and trash removal', 'Ventilation and hood systems clean'] },
    { id: 4, category: 'Food Storage & Labeling', required: true, items: ['All food items dated and labeled', 'FIFO (First In, First Out) being practiced', 'No expired products in storage', 'Food stored 6 inches off the floor', 'Dry storage organized and sealed'] }
];
export const DEF_TEMP = [
    { id: 1, name: 'Hot foods held at proper temp', requiredTemp: '135°F or above', min: 135, max: null },
    { id: 2, name: 'Cold foods held at proper temp', requiredTemp: '41°F or below', min: null, max: 41 },
    { id: 3, name: 'Proper cooling procedures followed', requiredTemp: '70°F within 2hrs', min: null, max: 70 },
    { id: 4, name: 'Cooking temperatures verified', requiredTemp: '165°F for poultry', min: 165, max: null },
    { id: 5, name: 'Thermometers calibrated and available', requiredTemp: '32°F in ice water', min: 30, max: 34 }
];
export const DEF_APPL = [
    { id: 1, name: 'Walk-in Refrigerator', targetTemp: '35–38°F', type: 'Cold', min: 35, max: 38 },
    { id: 2, name: 'Walk-in Freezer', targetTemp: '0°F or below', type: 'Cold', min: null, max: 0 },
    { id: 3, name: 'Prep Cooler', targetTemp: '41°F or below', type: 'Cold', min: null, max: 41 },
    { id: 4, name: 'Steam Table', targetTemp: '135°F or above', type: 'Hot', min: 135, max: null },
    { id: 5, name: 'Oven / Range', targetTemp: 'Per recipe spec', type: 'Hot', min: null, max: null },
    { id: 6, name: 'Dishwasher', targetTemp: '180°F (sanitize cycle)', type: 'Hot', min: 180, max: null }
];
export const DEF_TASKS = [
    { id: 1, task: 'Check and log all refrigeration temperatures', time: 'Opening', category: 'Temperature' },
    { id: 2, task: 'Sanitize all prep surfaces before service', time: 'Opening', category: 'Sanitation' },
    { id: 3, task: 'Verify all FIFO labels are current', time: 'Opening', category: 'Storage' },
    { id: 4, task: 'Check hot holding units are at temp', time: 'Before Service', category: 'Temperature' },
    { id: 5, task: 'Inspect handwashing stations are stocked', time: 'Opening', category: 'Hygiene' },
    { id: 6, task: 'Mid-shift temperature log — all units', time: 'Midday', category: 'Temperature' },
    { id: 7, task: 'Clean and sanitize prep surfaces between uses', time: 'Throughout', category: 'Sanitation' },
    { id: 8, task: 'Check dish machine sanitizer level', time: 'Midday', category: 'Sanitation' },
    { id: 9, task: 'Break down and sanitize all stations', time: 'Closing', category: 'Sanitation' },
    { id: 10, task: 'Final temperature check and log all units', time: 'Closing', category: 'Temperature' },
    { id: 11, task: 'Empty and sanitize all trash receptacles', time: 'Closing', category: 'Sanitation' },
    { id: 12, task: 'Verify all food is properly covered and stored', time: 'Closing', category: 'Storage' }
];
export const SAMPLE_REPORTS = [];
export const G = '#008a5f';
export const PINK = '#f6d1d1';
export const BK = '#111';
export const WH = '#fff';
export const TIMES = ['Opening', 'Before Service', 'Midday', 'Throughout', 'Closing'];
export const CATS = ['Temperature', 'Sanitation', 'Storage', 'Hygiene', 'Other'];
export const CC = { Temperature: '#ea580c', Sanitation: '#16a34a', Storage: '#2563eb', Hygiene: '#9333ea', Other: '#6b7280' };
