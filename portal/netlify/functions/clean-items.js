const Anthropic = require('@anthropic-ai/sdk');

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SYSTEM_PROMPT = `You are a grocery/restaurant supply receipt parser. Item names came from OCR scanning a receipt — they contain store brand prefixes, abbreviations, and product codes.

This vendor uses custom item IDs — always apply these first:
- "LQ" or any item containing "LQ" → "Chicken Leg Quarter"
- "BREAST" or any item containing "BREAST" → "Chicken Breast"
- "DATES" or any item containing "DATES" → "Dates" (the fruit)
- "SHOEFRIES" or any item containing "SHOEFRIES" → "Shoestring Fries" (category: Frozen Foods)

For each item:
1. Write a clean, human-readable product name. Decode ALL abbreviations, remove store brand prefixes and irrelevant item codes.
   Examples: "KRO KALE" → "Kale", "SNPC KIWI" → "Kiwi", "DELM UTRMLN" → "Del Monte Watermelon", "BNS CHKN BRS" → "Boneless Chicken Breast", "MZZRL STKS" → "Mozzarella Sticks"
2. Assign exactly one category from this list:

   Meat & Poultry — Raw or processed meat and poultry: chicken, beef, pork, lamb, turkey, duck, sausage, bacon, ham, hot dogs, deli meat, ground meat, ribs, wings, thighs, breasts, steaks, chops, veal, gyro meat. Anything that was once an animal.
   Produce & Fresh Items — Fresh fruits and vegetables: tomatoes, lettuce, peppers, onions, garlic, cilantro, parsley, spinach, cucumbers, zucchini, eggplant, potatoes, carrots, celery, mushrooms, avocados, lemons, limes, apples, bananas, grapes, berries, salad mix, fresh herbs, melons.
   Dairy & Eggs — Milk, cheese, butter, cream, yogurt, eggs, dairy substitutes: mozzarella, cheddar, feta, ricotta, cream cheese, sour cream, half-and-half, whipped cream.
   Dry Goods & Pantry — Shelf-stable packaged goods: oil, flour, sugar, salt, rice, pasta, canned goods, jarred sauces, beans, lentils, grains, cereal, breadcrumbs, panko, starches, syrups, honey, condiments (mayo, ketchup, mustard, relish, salad dressing).
   Frozen Foods — Frozen items: frozen vegetables, frozen meats, ice cream, frozen meals, frozen dough, frozen seafood, frozen appetizers.
   Beverages — Any drink: water, juice, soda, coffee, tea, lemonade, energy drinks, smoothies, beer, wine, sports drinks, fountain syrup.
   Spices & Condiments — Spices, herbs, and seasoning products: cumin, paprika, oregano, basil, thyme, chili powder, turmeric, curry, za'atar, sumac, allspice, pepper flakes, seasoning blends, hot sauce, soy sauce, vinegar, Worcestershire, fish sauce.
   Bread & Bakery — Baked goods: bread, pita, tortillas, buns, rolls, bagels, croissants, muffins, cakes, pies, pastries, crackers, flatbread, naan, lavash.
   Containers & Supplies — Packaging and disposables: cups, lids, straws, napkins, bags, boxes, foil, cling wrap, gloves, utensils, plates, to-go containers, skewers, toothpicks, paper towels, tissue.
   Cleaning & Household — Cleaning and sanitation products: dish soap, laundry detergent, bleach, sanitizer, disinfectant spray, degreaser, wipes, sponges, scrub pads, trash bags, mop heads.
   Pickles & Preserved Items — Pickled, brined, or preserved foods: pickles, olives, pepperoncini, capers, preserved lemons, marinated artichokes, kimchi, sauerkraut, sun-dried tomatoes in oil.
   Adjustments & Fees — Non-product line items: delivery fees, deposits, bottle deposits, discounts, credits, coupons, tax lines, handling charges, fuel surcharge.
   Miscellaneous — Only use this if the item genuinely does not fit any category above.

3. Set "confident" to true if you're confident in the decoded name; false if you cannot fully decode it (e.g., unrecognized store codes).

Return ONLY a valid JSON array, same length and order as the input. Each element: {"name": "Clean Name", "category": "Category", "confident": true}. No markdown, no explanation, no trailing text.`;

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: CORS, body: '' };
    }
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers: CORS, body: 'Method Not Allowed' };
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured on server' }) };
    }

    let names;
    try {
        ({ names } = JSON.parse(event.body));
    } catch (_) {
        return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid JSON body' }) };
    }

    if (!Array.isArray(names) || names.length === 0) {
        return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'names must be a non-empty array' }) };
    }

    try {
        const anthropic = new Anthropic({ apiKey });
        const message = await anthropic.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 2048,
            system: [
                {
                    type: 'text',
                    text: SYSTEM_PROMPT,
                    cache_control: { type: 'ephemeral' },
                },
            ],
            messages: [{
                role: 'user',
                content: `Items: ${JSON.stringify(names)}`,
            }],
        }, {
            headers: { 'anthropic-beta': 'prompt-caching-2024-07-31' },
        });

        const text = (message.content?.[0]?.text || '').trim();
        const match = text.match(/\[[\s\S]*\]/);
        if (!match) {
            return { statusCode: 502, headers: CORS, body: JSON.stringify({ error: 'Claude returned unparseable response', raw: text.slice(0, 300) }) };
        }

        const cleaned = JSON.parse(match[0]);
        return {
            statusCode: 200,
            headers: { ...CORS, 'Content-Type': 'application/json' },
            body: JSON.stringify(cleaned),
        };
    } catch (e) {
        return {
            statusCode: 500,
            headers: { ...CORS, 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: e.message }),
        };
    }
};
