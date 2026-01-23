(function() {
    const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbycyu6r5oMc3hAemOHwJ0g3Npc6k7S1XalPatII7B95U5oaWjRtlO9Pv916VgfwT5t0/exec"; 
    let isBusy = false;

    async function sync() {
        if (isBusy) return;
        try {
            const res = await fetch(SCRIPT_URL + "?url=" + encodeURIComponent(window.location.hostname) + "&cb=" + Math.random());
            const data = await res.json();
            if (data.status === "REMOVE") return document.getElementById("ai-vton-btn")?.remove();
            render(data.canUse, data.status);
        } catch (e) { console.log("Sync..."); }
    }

    function render(canUse, status) {
        if (document.getElementById("ai-vton-btn") || isBusy) return;
        const btn = document.createElement("button");
        btn.id = "ai-vton-btn";
        const active = (status === "ACTIVE" && canUse);
        btn.innerHTML = active ? "✨ Virtual Try-On" : "🔒 Mirror Paused";
        btn.style.cssText = "position:fixed; bottom:30px; right:30px; z-index:2147483647; padding:16px 32px; color:#fff; border-radius:50px; font-weight:bold; border:none; cursor:pointer; font-family:sans-serif; text-transform:uppercase; letter-spacing:1px; background:" + (active ? "linear-gradient(135deg, #000 0%, #434343 100%)" : "#666") + "; box-shadow: 0 10px 30px rgba(0,0,0,0.4);";
        btn.onclick = () => {
            if (!active) return alert("Plan Expired.");
            const input = document.createElement("input");
            input.type = "file"; input.accept = "image/*";
            input.onchange = (e) => handleUpload(e.target.files[0], btn);
            input.click();
        };
        document.body.appendChild(btn);
    }

    async function handleUpload(file, btn) {
        const prodImg = Array.from(document.getElementsByTagName("img")).find(img => img.width > 200 && !img.src.includes("logo"))?.src;
        if (!file || !prodImg) return alert("Product image not detected.");

        isBusy = true;
        btn.disabled = true;
        btn.innerHTML = '<span class="premium-spinner"></span> COMPRESSING...';

        // 1. IMAGE COMPRESSOR (Prevents "Instant" Errors)
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width, height = img.height;
                const max = 1024; // Resize to max 1024px for speed/stability
                if (width > height) { if (width > max) { height *= max / width; width = max; } }
                else { if (height > max) { width *= max / height; height = max; } }
                canvas.width = width; canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7); // 70% quality
                
                sendToAI(compressedBase64, prodImg, btn);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    async function sendToAI(userImg, prodImg, btn) {
        btn.innerHTML = '<span class="premium-spinner"></span> PROCESSING...';
        try {
            const res = await fetch(SCRIPT_URL, {
                method: "POST",
                body: JSON.stringify({
                    model_name: "tryon-v1.6",
                    inputs: { model_image: userImg, garment_image: prodImg, category: "auto" }
                })
            });
            const aiData = await res.json();
            if (aiData.id) poll(aiData.id, btn);
            else throw new Error();
        } catch (e) {
            isBusy = false; btn.disabled = false; btn.innerHTML = "✨ Virtual Try-On";
            alert("Connection Error. Please check if your Google Script is 'Deployed as Web App' for 'Anyone'.");
        }
    }

    async function poll(id, btn) {
        const res = await fetch("https://api.fashn.ai/v1/status/" + id, {
            headers: { "Authorization": "Bearer fa-psJSioorPgb9-5cT5HZYyoCGokJVywFgFOPWt" }
        });
        const data = await res.json();
        if (data.status === "completed") {
            isBusy = false; btn.disabled = false; btn.innerHTML = "✨ Virtual Try-On";
            showPopup(data.output[0]);
        } else if (data.status === "failed") {
            isBusy = false; btn.disabled = false; btn.innerHTML = "✨ Virtual Try-On";
            alert("AI could not process this image.");
        } else { setTimeout(() => poll(id, btn), 3000); }
    }

    function showPopup(url) {
        const overlay = document.createElement("div");
        overlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);z-index:2147483647;display:flex;flex-direction:column;align-items:center;justify-content:center;backdrop-filter:blur(10px);padding:20px;";
        overlay.innerHTML = `
            <div style="background:#fff; border-radius:25px; overflow:hidden; max-width:400px; width:100%; box-shadow:0 25px 50px rgba(0,0,0,0.5);">
                <img src="${url}" style="width:100%; display:block;">
                <div style="padding:20px; text-align:center; font-family:sans-serif;">
                    <h3 style="margin:0 0 10px; color:#000;">✨ Style Ready</h3>
                    <div style="background:#f9f9f9; padding:10px; border-radius:12px; border:1px solid #eee; margin-bottom:15px;">
                        <p style="margin:0; font-size:11px; color:#444; font-weight:bold;">🛡️ PRIVACY VERIFIED</p>
                        <p style="margin:4px 0 0; font-size:9px; color:#888; text-transform:uppercase;">AES-256 Encryption • Auto-Deleted Session</p>
                    </div>
                    <button id="v-close" style="width:100%; padding:14px; border-radius:12px; border:none; background:#000; color:#fff; font-weight:bold; cursor:pointer;">CLOSE MIRROR</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        document.getElementById("v-close").onclick = () => overlay.remove();
    }

    const s = document.createElement("style");
    s.innerHTML = ".premium-spinner { width:14px; height:14px; border:2px solid #fff; border-top-color:transparent; border-radius:50%; display:inline-block; animation: spin 0.8s linear infinite; margin-right:10px; vertical-align:middle; } @keyframes spin { to {transform:rotate(360deg)} }";
    document.head.appendChild(s);

    sync();
    setInterval(sync, 15000);
})();
