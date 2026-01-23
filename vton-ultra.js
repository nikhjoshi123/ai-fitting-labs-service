(function() {
    // 1. YOUR VERIFIED GOOGLE URL
    const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwFONKsCMEb6rAYt_xewl52PHWUHsUiCds9pxAGs2noWhCUQCgmzsJ6-e-7zYshwOvV/exec"; 

    async function init() {
        try {
            const res = await fetch(${SCRIPT_URL}?url=${encodeURIComponent(window.location.hostname)}&cb=${Date.now()});
            const data = await res.json();
            
            // Handle REMOVE/NONE statuses
            if (data.status === "REMOVE" || data.status === "NONE") {
                const existing = document.getElementById("ai-vton-btn");
                if (existing) existing.remove();
                return;
            }
            createButton(data.canUse, data.status);
        } catch (e) { console.log("AI Labs: Syncing..."); }
    }

    function createButton(canUse, status) {
        if (document.getElementById("ai-vton-btn")) return;

        const btn = document.createElement("button");
        btn.id = "ai-vton-btn";
        btn.innerHTML = (status === "EXPIRE" || !canUse) ? "🔒 Plan Expired" : "✨ Virtual Try-On";
        
        // PREMIUM UI: Glassmorphism and Gradients
        btn.style.cssText = `
            position: fixed !important; bottom: 30px !important; right: 30px !important;
            z-index: 2147483647 !important; padding: 16px 32px !important;
            background: ${canUse ? 'linear-gradient(135deg, #000 0%, #434343 100%)' : '#666'} !important;
            color: #fff !important; border-radius: 50px !important; font-weight: bold !important;
            border: 1px solid rgba(255,255,255,0.2) !important; box-shadow: 0 15px 35px rgba(0,0,0,0.4) !important;
            cursor: pointer !important; font-family: 'Inter', sans-serif !important; transition: transform 0.2s ease !important;
        `;

        btn.onclick = () => {
            if (btn.innerText.includes("🔒")) return alert("Service Paused. Please contact aifittinglabs.store");
            const input = document.createElement("input");
            input.type = "file"; input.accept = "image/*";
            input.onchange = (e) => handleUpload(e.target.files[0], btn);
            input.click();
        };

        document.body.appendChild(btn);
    }

    async function handleUpload(file, btn) {
        const prodImg = Array.from(document.getElementsByTagName("img")).find(img => img.width > 200)?.src;
        if (!file || !prodImg) return alert("Please select a product first.");

        // PREMIUM LOADING STATE
        btn.disabled = true;
        btn.innerHTML = <span class="v-spin"></span> <span id="v-text">🔒 AES-256 Privacy...</span>;
        
        const messages = ["🛡️ Identity Protected", "✨ AI Stylist Working", "🗑️ Auto-Deleting Data"];
        let i = 0;
        const msgInterval = setInterval(() => {
            const el = document.getElementById("v-text");
            if (el) el.innerText = messages[i++ % messages.length];
        }, 2800);

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
            if (aiData.id) poll(aiData.id, btn, msgInterval);
            else { clearInterval(msgInterval); location.reload(); }
        };
        reader.readAsDataURL(file);
    }

    async function poll(id, btn, interval) {
        const res = await fetch("https://api.fashn.ai/v1/status/" + id, {
            headers: { "Authorization": "Bearer fa-psJSioorPgb9-5cT5HZYyoCGokJVywFgFOPWt" }
        });
        const data = await res.json();
        if (data.status === "completed") {
            clearInterval(interval);
            btn.disabled = false;
            btn.innerHTML = "✨ Virtual Try-On";
            showResult(data.output[0]);
        } else { setTimeout(() => poll(id, btn, interval), 3000); }
    }

    function showResult(url) {
        const overlay = document.createElement("div");
        overlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);z-index:2147483647;display:flex;flex-direction:column;align-items:center;justify-content:center;backdrop-filter:blur(8px);";
        overlay.innerHTML = `
            <img src="${url}" style="max-height:70%; border-radius:15px; box-shadow:0 0 50px rgba(0,0,0,0.5);">
            <div style="color:#fff; margin-top:15px; font-family:sans-serif; text-align:center;">
                <p style="font-weight:bold; margin-bottom:5px;">🛡️ Privacy Shield Active</p>
                <p style="font-size:12px; color:#aaa;">Photos are processed in a secure session and deleted.</p>
            </div>
            <button onclick="this.parentElement.remove()" style="margin-top:20px; padding:12px 40px; border-radius:50px; border:none; background:#fff; font-weight:bold; cursor:pointer;">CLOSE MIRROR</button>
        `;
        document.body.appendChild(overlay);
    }

    const s = document.createElement("style");
    s.innerHTML = .v-spin { width:14px; height:14px; border:2px solid #fff; border-top-color:transparent; border-radius:50%; display:inline-block; animation: v-rot 0.8s linear infinite; margin-right:8px; vertical-align:middle; } @keyframes v-rot { to {transform:rotate(360deg)} };
    document.head.appendChild(s);

    // Initial Trigger
    if (document.readyState === 'complete') init();
    else window.addEventListener('load', init);
    setInterval(init, 15000);
})();
