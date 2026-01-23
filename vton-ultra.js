(function() {
    const GOOGLE_URL = "https://script.google.com/macros/s/AKfycbycyu6r5oMc3hAemOHwJ0g3Npc6k7S1XalPatII7B95U5oaWjRtlO9Pv916VgfwT5t0/exec"; 
    const VERCEL_URL = "https://ai-fitting-labs-service-pigf.vercel.app/api"; 
    let isBusy = false;
    let lastRemaining = 5;

    // 1. IMPROVED PRODUCT PAGE DETECTOR
    const isProductPage = () => {
        const urlMatch = window.location.href.includes('/product');
        const images = Array.from(document.getElementsByTagName("img"));
        const productImg = images.find(i => i.width > 300 && !i.src.includes("logo"));
        const buttons = Array.from(document.querySelectorAll("button"));
        const hasCartBtn = buttons.some(b => {
            const t = b.innerText.toLowerCase();
            return t.includes('add') || t.includes('buy') || t.includes('cart');
        });
        return urlMatch || productImg || hasCartBtn; 
    };

    // 2. LUXURY UI STYLES
    const injectStyles = () => {
        if (document.getElementById("vton-styles")) return;
        const s = document.createElement("style");
        s.id = "vton-styles";
        s.innerHTML = `
            .v-spin { width:12px; height:12px; border:2px solid #fff; border-top-color:transparent; border-radius:50%; display:inline-block; animation: v-rot 0.8s linear infinite; margin-right:8px; }
            @keyframes v-rot { to {transform:rotate(360deg)} }
            .vton-container { background: #fff; width: 100%; max-width: 950px; display: flex; flex-direction: row; border-radius: 30px; overflow: hidden; box-shadow: 0 50px 100px rgba(0,0,0,0.5); font-family: sans-serif; position: relative; }
            .vton-img-side { flex: 1.4; background: #f4f4f4; line-height:0; }
            .vton-img-side img { width: 100%; height: 100%; object-fit: cover; }
            .vton-text-side { flex: 1; padding: 50px; display: flex; flex-direction: column; justify-content: center; background: #fff; }
            #v-done { width: 100%; padding: 20px; background: #000; color: #fff; border-radius: 15px; border: none; font-weight: bold; cursor: pointer; font-size: 16px; margin-top: 30px; }
            @media (max-width: 768px) { .vton-container { flex-direction: column; max-height: 95vh; overflow-y: auto; } .vton-img-side { height: 400px; flex: none; } .vton-text-side { padding: 30px; flex: none; } }
        `;
        document.head.appendChild(s);
    };

    const createButton = () => {
        if (document.getElementById("ai-vton-btn") || !isProductPage()) return;
        const btn = document.createElement("button");
        btn.id = "ai-vton-btn";
        btn.innerHTML = "✨ See It On You"; 
        btn.style.cssText = "position:fixed; bottom:30px; right:30px; z-index:2147483647; padding:18px 36px; color:#fff; border-radius:50px; font-weight:bold; border:none; cursor:pointer; box-shadow:0 15px 35px rgba(0,0,0,0.4); background: linear-gradient(135deg, #000, #444); display:block !important; font-size: 15px;";
        btn.onclick = () => trigger(btn);
        document.body.appendChild(btn);
        sync(btn);
    };

    const startApp = () => {
        if (!document.body) { window.requestAnimationFrame(startApp); return; }
        if (isProductPage()) { injectStyles(); createButton(); }
        const obs = new MutationObserver(() => { if (!document.getElementById("ai-vton-btn") && !isBusy) createButton(); });
        obs.observe(document.body, { childList: true });
    };

    async function sync(btn) {
        try {
            const r = await fetch(GOOGLE_URL + "?url=" + encodeURIComponent(window.location.hostname) + "&cb=" + Date.now());
            const d = await r.json();
            const off = (d.status !== "ACTIVE" || !d.canUse);
            btn.innerHTML = off ? "🔒 Service Paused" : "✨ See It On You";
            btn.style.background = off ? "#666" : "linear-gradient(135deg, #000, #444)";
            btn.onclick = off ? () => alert("Back soon!") : () => trigger(btn);
        } catch (e) { }
    }

    function trigger(btn) {
        const input = document.createElement("input");
        input.type = "file"; input.accept = "image/*";
        input.onchange = (e) => {
            const file = e.target.files[0];
            const prod = Array.from(document.getElementsByTagName("img")).find(i => i.width > 200 && !i.src.includes("logo"));
            if (!file || !prod) return alert("Please select a product image.");
            isBusy = true; btn.disabled = true;
            btn.innerHTML = '<span class="v-spin"></span> TAILORING YOUR LOOK...';
            const reader = new FileReader();
            reader.onload = async (re) => {
                try {
                    const r = await fetch(VERCEL_URL, {
                        method: "POST",
                        headers: { "Content-Type": "application/json", "Accept": "application/json" },
                        body: JSON.stringify({ inputs: { model_image: re.target.result, garment_image: prod.src, category: "auto" } })
                    });
                    if (!r.ok) { 
                        if (r.status === 403) throw new Error("LIMIT");
                        throw new Error("Server error");
                    }
                    const ai = await r.json();
                    if (ai.id) { lastRemaining = ai.remaining_tries || 0; poll(ai.id, btn); }
                } catch (err) {
                    isBusy = false; btn.disabled = false; btn.innerHTML = "✨ See It On You";
                    if (err.message === "LIMIT") alert("Daily limit reached! Shop honestly and come back tomorrow.");
                    else alert("Connection error. Ensure Vercel is active.");
                }
            };
            reader.readAsDataURL(file);
        };
        input.click();
    }

    function poll(id, btn) {
        fetch("https://api.fashn.ai/v1/status/" + id)
            .then(r => r.json())
            .then(d => {
                if (d.status === "completed") {
                    isBusy = false; btn.disabled = false; btn.innerHTML = "✨ See It On You";
                    showPop(d.output[0]);
                } else { setTimeout(() => poll(id, btn), 3000); }
            });
    }

    function showPop(url) {
        const ov = document.createElement("div");
        ov.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.95); z-index:2147483647; display:flex; align-items:center; justify-content:center; padding:20px; backdrop-filter:blur(15px);";
        ov.innerHTML = `
            <div class="vton-container">
                <div class="vton-img-side"><img src="${url}"></div>
                <div class="vton-text-side">
                    <h2 style="margin:0; font-size:28px; font-family:serif;">✨ You Look Incredible</h2>
                    <p style="color:#666; font-size:15px; margin-top:12px; line-height:1.6;">Our AI Stylist has tailored this piece perfectly to your photo.</p>
                    <div style="background:#fff3cd; padding:15px; border-radius:15px; border:1px solid #ffeeba; margin-top:25px; text-align:center;">
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

    if (document.readyState === 'complete') startApp();
    else window.addEventListener('load', startApp);
})();
