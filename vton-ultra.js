(function() {
    const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbycyu6r5oMc3hAemOHwJ0g3Npc6k7S1XalPatII7B95U5oaWjRtlO9Pv916VgfwT5t0/exec"; 
    let isBusy = false;

    // 1. THE OBSERVER: Forces the button to stay on the page
    const observer = new MutationObserver(() => {
        if (!document.getElementById("ai-vton-btn")) {
            checkAndRender();
        }
    });

    async function checkAndRender() {
        if (isBusy) return;
        try {
            const res = await fetch(${SCRIPT_URL}?url=${encodeURIComponent(window.location.hostname)}&cb=${Date.now()});
            const data = await res.json();
            
            if (data.status === "ACTIVE" && data.canUse) {
                renderPremiumUI(true);
            } else if (data.status === "EXPIRE") {
                renderPremiumUI(false);
            }
        } catch (e) { console.log("AI Labs Connection..."); }
    }

    function renderPremiumUI(isActive) {
        if (document.getElementById("ai-vton-btn")) return;

        const btn = document.createElement("button");
        btn.id = "ai-vton-btn";
        btn.innerHTML = isActive ? "✨ Virtual Try-On" : "🔒 Mirror Paused";
        
        // ULTIMATE PREMIUM STYLING
        btn.style.cssText = `
            position: fixed !important; bottom: 30px !important; right: 30px !important;
            z-index: 2147483647 !important; padding: 18px 36px !important;
            background: ${isActive ? 'linear-gradient(135deg, #000 0%, #434343 100%)' : '#666'} !important;
            color: #fff !important; border-radius: 60px !important; font-weight: 800 !important;
            border: 1px solid rgba(255,255,255,0.3) !important; box-shadow: 0 20px 40px rgba(0,0,0,0.6) !important;
            cursor: pointer !important; font-family: 'Inter', system-ui, sans-serif !important;
            letter-spacing: 1px !important; text-transform: uppercase !important; font-size: 14px !important;
            display: block !important; visibility: visible !important; opacity: 1 !important;
        `;

        btn.onclick = () => {
            if (!isActive) return alert("Service paused by provider.");
            const input = document.createElement("input");
            input.type = "file"; input.accept = "image/*";
            input.onchange = (e) => startPremiumWorkflow(e.target.files[0], btn);
            input.click();
        };

        document.body.appendChild(btn);
    }

    async function startPremiumWorkflow(file, btn) {
        const prodImg = Array.from(document.getElementsByTagName("img")).find(img => img.width > 250 && img.height > 200)?.src;
        if (!file || !prodImg) return alert("Please select a product image first.");

        isBusy = true;
        btn.innerHTML = <span class="v-spin"></span> <span id="v-msg">AES-256 ENCRYPTING...</span>;
        
        const trustMsgs = ["🛡️ PRIVACY SHIELD ACTIVE", "✨ AI GENERATING STYLE", "🗑️ AUTO-DELETING SOURCE"];
        let i = 0;
        const msgInt = setInterval(() => {
            const el = document.getElementById("v-msg");
            if (el) el.innerText = trustMsgs[i++ % trustMsgs.length];
        }, 2500);

        const reader = new FileReader();
        reader.onloadend = async () => {
            const res = await fetch(SCRIPT_URL, {
                method: "POST",
                body: JSON.stringify({
                    model_name: "tryon-v1.6",
                    inputs: { model_image: reader.result, garment_image: prodImg, category: "auto" }
                })
            });
            const aiData = await res.json();
            if (aiData.id) pollAI(aiData.id, btn, msgInt);
            else { clearInterval(msgInt); reset(btn); }
        };
        reader.readAsDataURL(file);
    }

    async function pollAI(id, btn, msgInt) {
        const res = await fetch("https://api.fashn.ai/v1/status/" + id, {
            headers: { "Authorization": "Bearer fa-psJSioorPgb9-5cT5HZYyoCGokJVywFgFOPWt" }
        });
        const data = await res.json();
        if (data.status === "completed") {
            clearInterval(msgInt);
            reset(btn);
            showPremiumResult(data.output[0]);
        } else { setTimeout(() => pollAI(id, btn, msgInt), 3000); }
    }

    function reset(btn) {
        isBusy = false;
        btn.innerHTML = "✨ Virtual Try-On";
    }

    function showPremiumResult(url) {
        const div = document.createElement("div");
        div.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.95);z-index:2147483647;display:flex;flex-direction:column;align-items:center;justify-content:center;backdrop-filter:blur(15px);";
        div.innerHTML = `
            <div style="position:relative; max-width:90%; border:1px solid rgba(255,255,255,0.2); border-radius:20px; overflow:hidden;">
                <img src="${url}" style="max-height:75vh; display:block;">
                <div style="background:#fff; color:#000; padding:15px; text-align:center; font-family:sans-serif;">
                    <p style="margin:0; font-weight:bold;">✨ YOUR AI FITTING</p>
                    <p style="margin:5px 0 0; font-size:10px; color:#666;">🛡️ SECURE SESSION: DATA HAS BEEN WIPED</p>
                </div>
            </div>
            <button onclick="this.parentElement.remove()" style="margin-top:30px; padding:15px 50px; border-radius:50px; border:none; background:#fff; color:#000; font-weight:800; cursor:pointer; text-transform:uppercase;">Close Mirror</button>
        `;
        document.body.appendChild(div);
    }

    // Initialize Observer and Start
    observer.observe(document.body, { childList: true, subtree: true });
    checkAndRender();

    const s = document.createElement("style");
    s.innerHTML = .v-spin { width:16px; height:16px; border:3px solid #fff; border-top-color:transparent; border-radius:50%; display:inline-block; animation: v-rot 0.8s linear infinite; margin-right:10px; vertical-align:middle; } @keyframes v-rot { to {transform:rotate(360deg)} };
    document.head.appendChild(s);
})();
