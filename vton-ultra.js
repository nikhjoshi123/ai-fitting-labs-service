(function() {
    if (window.VTON_INITIALIZED) return;
    window.VTON_INITIALIZED = true;

    const VERCEL_URL = "https://ai-fitting-labs-service-pigf.vercel.app/api/tryon"; 
    let lastRemaining = 5;

    const isAllowedPage = () => {
        const url = window.location.href.toLowerCase();
        const path = window.location.pathname.toLowerCase();
        const blocked = ['/cart', '/checkout', '/account', '/contact', '/about'];
        if (path === "/" || path === "" || blocked.some(p => path.includes(p))) return false;
        return ['product', 'item', 'category', 'collection'].some(word => url.includes(word));
    };

    const injectStyles = () => {
        if (document.getElementById("vton-styles")) return;
        const s = document.createElement("style");
        s.id = "vton-styles";
        s.innerHTML = `
            .v-spin { width:12px; height:12px; border:2px solid #fff; border-top-color:transparent; border-radius:50%; display:inline-block; animation: v-rot 0.8s linear infinite; margin-right:8px; }
            @keyframes v-rot { to {transform:rotate(360deg)} }
            .vton-container { background: #fff; width: 100%; max-width: 900px; display: flex; border-radius: 24px; overflow: hidden; box-shadow: 0 40px 80px rgba(0,0,0,0.5); font-family: sans-serif; }
            .vton-img-side { flex: 1.2; background: #f0f0f0; }
            .vton-img-side img { width: 100%; height: 100%; object-fit: cover; }
            .vton-text-side { flex: 1; padding: 40px; display: flex; flex-direction: column; justify-content: center; }
            #v-done { width: 100%; padding: 18px; background: #000; color: #fff; border-radius: 10px; border: none; font-weight: bold; cursor: pointer; margin-top: 20px; }
            @media (max-width: 768px) { .vton-container { flex-direction: column; } .vton-img-side { height: 300px; } }
        `;
        document.head.appendChild(s);
    };

    const createButton = () => {
        if (!isAllowedPage()) { 
            const e = document.getElementById("ai-vton-btn");
            if (e) e.remove();
            return; 
        }
        if (document.getElementById("ai-vton-btn")) return;
        const btn = document.createElement("button");
        btn.id = "ai-vton-btn";
        btn.innerHTML = "✨ See It On You"; 
        btn.style.cssText = "position:fixed; bottom:30px; right:30px; z-index:999999; padding:16px 32px; color:#fff; border-radius:50px; font-weight:bold; border:none; cursor:pointer; box-shadow:0 10px 30px rgba(0,0,0,0.4); background: linear-gradient(135deg, #000, #333);";
        btn.onclick = () => trigger(btn);
        document.body.appendChild(btn);
    };

    async function trigger(btn) {
        const input = document.createElement("input");
        input.type = "file"; input.accept = "image/*";
        input.onchange = (e) => {
            const file = e.target.files[0];
            const prod = Array.from(document.getElementsByTagName("img")).find(i => i.width > 250 && !i.src.includes("logo"));
            if (!file || !prod) return alert("Please select a product image first.");
            btn.disabled = true;
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
                    if (ai.id) { lastRemaining = ai.remaining_tries || 4; poll(ai.id, btn); }
                } catch (err) {
                    btn.disabled = false; btn.innerHTML = "✨ See It On You";
                    alert("Error. Please check if requirements.txt is added to GitHub.");
                }
            };
            reader.readAsDataURL(file);
        };
        input.click();
    }

    function poll(id, btn) {
        fetch("https://api.fashn.ai/v1/status/" + id).then(r => r.json()).then(d => {
            if (d.status === "completed") {
                btn.disabled = false; btn.innerHTML = "✨ See It On You";
                showPop(d.output[0]);
            } else { setTimeout(() => poll(id, btn), 3000); }
        });
    }

    function showPop(url) {
        const ov = document.createElement("div");
        ov.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); z-index:1000000; display:flex; align-items:center; justify-content:center; padding:20px; backdrop-filter:blur(10px);";
        ov.innerHTML = `
            <div class="vton-container">
                <div class="vton-img-side"><img src="${url}"></div>
                <div class="vton-text-side">
                    <h2 style="margin:0;">✨ Tailored For You</h2>
                    <p style="color:#666; margin-top:10px;">Our AI has generated this preview based on your photo.</p>
                    <div style="background:#f8f9fa; padding:15px; border-radius:12px; margin-top:20px; text-align:center; border:1px solid #ddd;">
                        <p style="margin:0; font-size:12px; color:#333; font-weight:bold;">
                            🛍️ SHOP CAREFULLY: You have <b>${lastRemaining}</b> trials left today.
                        </p>
                    </div>
                    <button id="v-done">DONE</button>
                </div>
            </div>
        `;
        document.body.appendChild(ov);
        document.getElementById("v-done").onclick = () => ov.remove();
    }

    injectStyles();
    setInterval(createButton, 1500);
})();
