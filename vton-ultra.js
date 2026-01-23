(function() {
    const GOOGLE_URL = "https://script.google.com/macros/s/AKfycbycyu6r5oMc3hAemOHwJ0g3Npc6k7S1XalPatII7B95U5oaWjRtlO9Pv916VgfwT5t0/exec"; 
    const VERCEL_URL = "/api/tryon"; 
    let isBusy = false;
    let lastRemaining = 5;

    // 1. PRECISION FILTER: ONLY PRODUCT/CATEGORY PAGES
    const isAllowedPage = () => {
        const url = window.location.href.toLowerCase();
        const path = window.location.pathname.toLowerCase();
        const blocked = ['/cart', '/checkout', '/account', '/contact', '/about'];
        if (path === "/" || path === "" || blocked.some(p => path.includes(p))) return false;
        const allowedKeywords = ['product', 'item', 'category', 'collection', 'shop'];
        return allowedKeywords.some(word => url.includes(word));
    };

    // 2. LUXURY UI STYLES
    const injectStyles = () => {
        if (document.getElementById("vton-styles")) return;
        const s = document.createElement("style");
        s.id = "vton-styles";
        s.innerHTML = `
            .v-spin { width:12px; height:12px; border:2px solid #fff; border-top-color:transparent; border-radius:50%; display:inline-block; animation: v-rot 0.8s linear infinite; margin-right:8px; }
            @keyframes v-rot { to {transform:rotate(360deg)} }
            .vton-container { background: #fff; width: 100%; max-width: 950px; display: flex; flex-direction: row; border-radius: 30px; overflow: hidden; box-shadow: 0 50px 100px rgba(0,0,0,0.5); font-family: sans-serif; }
            .vton-img-side { flex: 1.4; background: #f4f4f4; line-height:0; }
            .vton-img-side img { width: 100%; height: 100%; object-fit: cover; }
            .vton-text-side { flex: 1; padding: 45px; display: flex; flex-direction: column; justify-content: center; }
            #v-done { width: 100%; padding: 18px; background: #000; color: #fff; border-radius: 12px; border: none; font-weight: bold; cursor: pointer; margin-top: 25px; }
            @media (max-width: 768px) { .vton-container { flex-direction: column; max-height: 90vh; overflow-y: auto; } .vton-img-side { height: 350px; flex: none; } }
        `;
        document.head.appendChild(s);
    };

    // 3. THE PERSISTENT BUTTON
    const createButton = () => {
        const exists = document.getElementById("ai-vton-btn");
        if (!isAllowedPage()) { if (exists) exists.remove(); return; }
        if (exists) return;

        const btn = document.createElement("button");
        btn.id = "ai-vton-btn";
        btn.innerHTML = "✨ See It On You"; 
        btn.style.cssText = "position:fixed; bottom:30px; right:30px; z-index:2147483647; padding:18px 36px; color:#fff; border-radius:50px; font-weight:bold; border:none; cursor:pointer; box-shadow:0 10px 30px rgba(0,0,0,0.4); background: linear-gradient(135deg, #000, #444); display:block !important;";
        btn.onclick = () => trigger(btn);
        document.body.appendChild(btn);
        sync(btn);
    };

    // 4. THE CONNECTION (Uses your new Vercel API Key)
    async function trigger(btn) {
        const input = document.createElement("input");
        input.type = "file"; input.accept = "image/*";
        input.onchange = (e) => {
            const file = e.target.files[0];
            const prod = Array.from(document.getElementsByTagName("img")).find(i => i.width > 200 && !i.src.includes("logo"));
            if (!file || !prod) return alert("Select a product image first.");
            
            isBusy = true; btn.disabled = true;
            btn.innerHTML = '<span class="v-spin"></span> TAILORING...';
            
            const reader = new FileReader();
            reader.onload = async (re) => {
                try {
                    const r = await fetch(VERCEL_URL, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ inputs: { model_image: re.target.result, garment_image: prod.src, category: "auto" } })
                    });
                    
                    const ai = await r.json();
                    if (ai.id) { 
                        lastRemaining = ai.remaining_tries || 4; // Friendly fallback
                        poll(ai.id, btn); 
                    } else {
                        throw new Error("Missing ID");
                    }
                } catch (err) {
                    isBusy = false; btn.disabled = false; btn.innerHTML = "✨ See It On You";
                    alert("Connection fixed, but the AI is busy. Try one more time!");
                }
            };
            reader.readAsDataURL(file);
        };
        input.click();
    }

    // 5. STATUS CHECK & POPUP
    function poll(id, btn) {
        fetch("https://api.fashn.ai/v1/status/" + id).then(r => r.json()).then(d => {
            if (d.status === "completed") {
                isBusy = false; btn.disabled = false; btn.innerHTML = "✨ See It On You";
                showPop(d.output[0]);
            } else if (d.status === "failed") {
                isBusy = false; btn.disabled = false; btn.innerHTML = "✨ See It On You";
                alert("AI could not process this photo. Try a clearer selfie.");
            } else { 
                setTimeout(() => poll(id, btn), 3000); 
            }
        });
    }

    function showPop(url) {
        const ov = document.createElement("div");
        ov.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.95); z-index:2147483647; display:flex; align-items:center; justify-content:center; padding:20px; backdrop-filter:blur(10px);";
        ov.innerHTML = `
            <div class="vton-container">
                <div class="vton-img-side"><img src="${url}"></div>
                <div class="vton-text-side">
                    <h2 style="margin:0; font-size:26px; font-family:serif;">✨ You Look Incredible</h2>
                    <p style="color:#666; font-size:15px; margin-top:10px;">Our AI Stylist has tailored this piece specifically for you.</p>
                    <div style="background:#fff3cd; padding:15px; border-radius:12px; border:1px solid #ffeeba; margin-top:20px; text-align:center;">
                        <p style="margin:0; font-size:12px; color:#856404; font-weight:bold;">
                            🛍️ SHOP HONESTLY: You have <b>${lastRemaining}</b> tries left today.
                        </p>
                    </div>
                    <button id="v-done">DONE</button>
                </div>
            </div>
        `;
        document.body.appendChild(ov);
        document.getElementById("v-done").onclick = () => ov.remove();
    }

    async function sync(btn) {
        try {
            const r = await fetch(GOOGLE_URL + "?url=" + encodeURIComponent(window.location.hostname) + "&cb=" + Date.now());
            const d = await r.json();
            if (d.status !== "ACTIVE") btn.style.display = 'none';
        } catch (e) {}
    }

    injectStyles();
    setInterval(createButton, 1500); 
})();

