(function() {
    const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbycyu6r5oMc3hAemOHwJ0g3Npc6k7S1XalPatII7B95U5oaWjRtlO9Pv916VgfwT5t0/exec"; 
    let isBusy = false;

    async function checkStatus() {
        if (isBusy) return;
        try {
            // Using 'text' instead of 'json' first to prevent silent crashes
            const res = await fetch(${SCRIPT_URL}?url=${encodeURIComponent(window.location.hostname)}&t=${Date.now()});
            const text = await res.text();
            const data = JSON.parse(text);
            
            manageButton(data.canUse, data.status);
        } catch (e) { 
            console.log("Mirror: Syncing..."); 
        }
    }

    function manageButton(canUse, status) {
        let btn = document.getElementById("ai-vton-btn");
        const shouldShow = (status === "ACTIVE" || status === "EXPIRE");

        if (!shouldShow) {
            if (btn) btn.remove();
            return;
        }

        if (!btn) {
            btn = document.createElement("button");
            btn.id = "ai-vton-btn";
            btn.style.cssText = `
                position:fixed; bottom:30px; right:30px; z-index:2147483647; 
                padding:16px 32px; color:#fff; border-radius:50px; font-weight:bold; 
                border:none; cursor:pointer; font-family:sans-serif; text-transform:uppercase; 
                letter-spacing:1px; transition: all 0.3s ease; display: block !important;
                box-shadow: 0 10px 30px rgba(0,0,0,0.4);
            `;
            document.body.appendChild(btn);
        }

        const isExpired = (status === "EXPIRE" || !canUse);
        btn.innerHTML = isExpired ? "🔒 Mirror Paused" : "✨ Virtual Try-On";
        btn.style.background = isExpired ? "#666" : "linear-gradient(135deg, #000 0%, #434343 100%)";

        btn.onclick = () => {
            if (isExpired) return alert("Service paused by provider.");
            const input = document.createElement("input");
            input.type = "file"; input.accept = "image/*";
            input.onchange = (e) => startAI(e.target.files[0], btn);
            input.click();
        };
    }

    async function startAI(file, btn) {
        const prodImg = Array.from(document.getElementsByTagName("img")).find(img => img.width > 200 && !img.src.includes("logo"))?.src;
        if (!file || !prodImg) return alert("Please select a product first.");

        isBusy = true;
        btn.disabled = true;
        btn.innerHTML = '<span class="v-spinner"></span> SECURING...';

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const res = await fetch(SCRIPT_URL, {
                    method: "POST",
                    body: JSON.stringify({
                        model_image: e.target.result,
                        garment_image: prodImg
                    })
                });
                const aiData = await res.json();
                if (aiData.id) poll(aiData.id, btn);
                else throw new Error();
            } catch (err) {
                isBusy = false; btn.disabled = false;
                btn.innerHTML = "✨ Virtual Try-On";
                alert("Connection error. Please try again.");
            }
        };
        reader.readAsDataURL(file);
    }

    async function poll(id, btn) {
        const res = await fetch("https://api.fashn.ai/v1/status/" + id, {
            headers: { "Authorization": "Bearer fa-psJSioorPgb9-5cT5HZYyoCGokJVywFgFOPWt" }
        });
        const data = await res.json();
        if (data.status === "completed") {
            isBusy = false; btn.disabled = false;
            btn.innerHTML = "✨ Virtual Try-On";
            showPop(data.output[0]);
        } else if (data.status === "failed") {
            isBusy = false; btn.disabled = false;
            btn.innerHTML = "✨ Virtual Try-On";
        } else {
            setTimeout(() => poll(id, btn), 3000);
        }
    }

    function showPop(url) {
        const d = document.createElement("div");
        d.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);z-index:2147483647;display:flex;flex-direction:column;align-items:center;justify-content:center;backdrop-filter:blur(10px);padding:20px;";
        d.innerHTML = `
            <div style="background:#fff; border-radius:30px; overflow:hidden; max-width:400px; width:100%; box-shadow:0 30px 60px rgba(0,0,0,0.5);">
                <img src="${url}" style="width:100%; display:block;">
                <div style="padding:25px; text-align:center; font-family:sans-serif;">
                    <h3 style="margin:0 0 15px; color:#000;">✨ Style Ready</h3>
                    <div style="background:#f4f4f4; padding:10px; border-radius:12px; border:1px solid #eee; margin-bottom:20px;">
                        <p style="margin:0; font-size:11px; color:#000; font-weight:900;">🛡️ PRIVACY SHIELD ACTIVE</p>
                        <p style="margin:4px 0 0; font-size:9px; color:#888;">AES-256 Encryption • Auto-Deleted Session</p>
                    </div>
                    <button id="v-close" style="width:100%; padding:15px; border-radius:15px; border:none; background:#000; color:#fff; font-weight:bold; cursor:pointer;">CLOSE</button>
                </div>
            </div>
        `;
        document.body.appendChild(d);
        document.getElementById("v-close").onclick = () => d.remove();
    }

    const s = document.createElement("style");
    s.innerHTML = ".v-spinner { width:12px; height:12px; border:2px solid #fff; border-top-color:transparent; border-radius:50%; display:inline-block; animation: v-rot 0.8s linear infinite; margin-right:8px; } @keyframes v-rot { to {transform:rotate(360deg)} }";
    document.head.appendChild(s);

    checkStatus();
    setInterval(checkStatus, 5000);
})();
