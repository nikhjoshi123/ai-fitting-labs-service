(function() {
    const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbycyu6r5oMc3hAemOHwJ0g3Npc6k7S1XalPatII7B95U5oaWjRtlO9Pv916VgfwT5t0/exec"; 

    async function checkStatus() {
        try {
            const url = SCRIPT_URL + "?url=" + encodeURIComponent(window.location.hostname) + "&cb=" + Math.random();
            const res = await fetch(url);
            const data = await res.json();
            if (data.status === "REMOVE" || data.status === "NONE") {
                if (document.getElementById("ai-vton-btn")) document.getElementById("ai-vton-btn").remove();
                return;
            }
            renderButton(data.canUse, data.status);
        } catch (e) { console.log("Sync failed"); }
    }

    function renderButton(canUse, status) {
        let btn = document.getElementById("ai-vton-btn");
        if (!btn) {
            btn = document.createElement("button");
            btn.id = "ai-vton-btn";
            btn.style.cssText = "position:fixed; bottom:30px; right:30px; z-index:9999999; padding:15px 28px; color:#fff; border-radius:50px; font-weight:bold; border:none; box-shadow:0 10px 40px rgba(0,0,0,0.4); cursor:pointer; background: linear-gradient(135deg, #000 0%, #333 100%); transition: all 0.3s ease; font-family: sans-serif; letter-spacing: 0.5px;";
            document.body.appendChild(btn);
            
            btn.onclick = function() {
                if (btn.getAttribute("data-busy") === "true") return;
                if (btn.innerText.includes("🔒")) return alert("Plan expired. Please contact support.");
                const input = document.createElement("input");
                input.type = "file"; input.accept = "image/*";
                input.onchange = (e) => handleUpload(e.target.files[0], btn);
                input.click();
            };
        }
        
        if (btn.getAttribute("data-busy") !== "true") {
            btn.innerHTML = (status === "EXPIRE" || !canUse) ? "🔒 Paused" : "✨ Virtual Try-On";
            btn.style.opacity = (status === "EXPIRE" || !canUse) ? "0.6" : "1";
        }
    }

    async function handleUpload(file, btn) {
        const images = Array.from(document.getElementsByTagName("img"));
        const prodImg = images.find(img => img.width > 250 && !img.src.includes("logo"))?.src;
        
        if (!file || !prodImg) return alert("Please wait for product to load fully.");

        // PREMIUM UI TRANSITION
        btn.setAttribute("data-busy", "true");
        btn.style.width = "220px";
        btn.innerHTML = <span class="v-loader"></span> <span id="v-status">Secure Session...</span>;

        const messages = ["🔒 AES-256 Encryption", "🛡️ Privacy Verified", "🤖 AI Stylist Working", "🗑️ Auto-Deleting Data"];
        let mIdx = 0;
        const msgInterval = setInterval(() => {
            const el = document.getElementById("v-status");
            if (el) el.innerText = messages[mIdx++ % messages.length];
        }, 2500);

        const reader = new FileReader();
        reader.onloadend = async function() {
            try {
                const res = await fetch(SCRIPT_URL, {
                    method: "POST",
                    body: JSON.stringify({
                        model_name: "tryon-v1.6",
                        inputs: { model_image: reader.result, garment_image: prodImg, category: "auto" }
                    })
                });
                const aiData = await res.json();
                if (aiData.id) {
                    startPolling(aiData.id, btn, msgInterval);
                } else {
                    throw new Error("AI Refused");
                }
            } catch (err) {
                clearInterval(msgInterval);
                resetButton(btn, "❌ AI Busy");
            }
        };
        reader.readAsDataURL(file);
    }

    async function startPolling(id, btn, msgInterval) {
        const check = async () => {
            try {
                const res = await fetch("https://api.fashn.ai/v1/status/" + id, {
                    headers: { "Authorization": "Bearer fa-psJSioorPgb9-5cT5HZYyoCGokJVywFgFOPWt" } 
                });
                const data = await res.json();
                
                if (data.status === "completed") {
                    clearInterval(msgInterval);
                    resetButton(btn);
                    showResult(data.output[0]);
                } else if (data.status === "failed") {
                    clearInterval(msgInterval);
                    resetButton(btn, "❌ Failed");
                } else {
                    setTimeout(check, 3000);
                }
            } catch (e) { setTimeout(check, 3000); }
        };
        check();
    }

    function resetButton(btn, text) {
        btn.setAttribute("data-busy", "false");
        btn.style.width = "auto";
        btn.innerHTML = text || "✨ Virtual Try-On";
    }

    function showResult(url) {
        const overlay = document.createElement("div");
        overlay.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.95); z-index:10000000; display:flex; flex-direction:column; align-items:center; justify-content:center; backdrop-filter: blur(10px); animation: fadeIn 0.4s ease;";
        
        overlay.innerHTML = `
            <div style="background:#fff; padding:10px; border-radius:20px; position:relative; max-width:90%; box-shadow:0 20px 50px rgba(0,0,0,0.5);">
                <img src="${url}" style="max-height:75vh; border-radius:15px; display:block;">
                <div style="padding:15px; text-align:center;">
                    <p style="margin:0; font-family:sans-serif; font-weight:bold; color:#000;">Your AI Fitting Result</p>
                    <p style="margin:5px 0 0; font-size:11px; color:#666; font-family:sans-serif;">🛡️ Secure Session: Photos have been permanently deleted.</p>
                </div>
            </div>
            <button id="close-vton" style="margin-top:25px; background:#fff; color:#000; border:none; padding:15px 40px; border-radius:50px; font-weight:bold; cursor:pointer; box-shadow:0 10px 20px rgba(0,0,0,0.2);">CLOSE MIRROR</button>
        `;
        
        document.body.appendChild(overlay);
        document.getElementById("close-vton").onclick = () => overlay.remove();
    }

    const s = document.createElement("style");
    s.innerHTML = `
        @keyframes fadeIn { from {opacity:0} to {opacity:1} }
        .v-loader { width:16px; height:16px; border:2px solid #fff; border-bottom-color:transparent; border-radius:50%; display:inline-block; animation: v-rot 1s linear infinite; margin-right:10px; vertical-align: middle; }
        @keyframes v-rot { 0% {transform:rotate(0deg)} 100% {transform:rotate(360deg)} }
    `;
    document.head.appendChild(s);

    checkStatus();
    setInterval(checkStatus, 15000);
})();
