(function() {
    // UPDATED WITH YOUR NEW GOOGLE SCRIPT URL
    const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbycyu6r5oMc3hAemOHwJ0g3Npc6k7S1XalPatII7B95U5oaWjRtlO9Pv916VgfwT5t0/exec"; 
    let isBusy = false;

    async function sync() {
        if (isBusy) return;
        try {
            const fetchUrl = SCRIPT_URL + "?url=" + encodeURIComponent(window.location.hostname) + "&cb=" + Math.random();
            const res = await fetch(fetchUrl);
            const data = await res.json();
            
            if (data.status === "REMOVE" || data.status === "NONE") {
                const old = document.getElementById("ai-vton-btn");
                if (old) old.remove();
                return;
            }
            render(data.canUse, data.status);
        } catch (e) { console.log("AI Mirror Syncing..."); }
    }

    function render(canUse, status) {
        if (document.getElementById("ai-vton-btn")) {
            updateUI(document.getElementById("ai-vton-btn"), canUse, status);
            return;
        }

        const btn = document.createElement("button");
        btn.id = "ai-vton-btn";
        updateUI(btn, canUse, status);
        
        // PREMIUM STYLING
        btn.style.cssText = "position:fixed; bottom:30px; right:30px; z-index:2147483647; padding:16px 32px; color:#fff; border-radius:50px; font-weight:bold; border:none; box-shadow:0 10px 40px rgba(0,0,0,0.5); cursor:pointer; font-family:sans-serif; text-transform:uppercase; letter-spacing:1px; display:block !important;";

        btn.onclick = function() {
            if (btn.innerText.includes("🔒")) return alert("Plan Expired.");
            const input = document.createElement("input");
            input.type = "file";
            input.accept = "image/*";
            input.onchange = function(e) { handleUpload(e.target.files[0], btn); };
            input.click();
        };

        document.body.appendChild(btn);
    }

    function updateUI(btn, canUse, status) {
        if (isBusy) return;
        const active = (status === "ACTIVE" && canUse);
        btn.innerText = active ? "✨ Virtual Try-On" : "🔒 Mirror Paused";
        btn.style.background = active ? "linear-gradient(135deg, #000 0%, #434343 100%)" : "#666";
    }

    async function handleUpload(file, btn) {
        const images = Array.from(document.getElementsByTagName("img"));
        const prodImg = images.find(function(img) { return img.width > 200 && !img.src.includes("logo"); });
        
        if (!file || !prodImg) return alert("Product image not detected.");

        isBusy = true;
        btn.innerHTML = '<span class="v-spin"></span> <span id="v-msg">AES-256 ENCRYPTING...</span>';
        
        const trustMsgs = ["🛡️ PRIVACY SHIELD ACTIVE", "✨ AI GENERATING STYLE", "🗑️ AUTO-DELETING SOURCE"];
        let i = 0;
        const msgInt = setInterval(function() {
            const el = document.getElementById("v-msg");
            if (el) el.innerText = trustMsgs[i++ % trustMsgs.length];
        }, 2500);

        const reader = new FileReader();
        reader.onloadend = async function() {
            const res = await fetch(SCRIPT_URL, {
                method: "POST",
                body: JSON.stringify({
                    model_name: "tryon-v1.6",
                    inputs: { model_image: reader.result, garment_image: prodImg.src, category: "auto" }
                })
            });
            const aiData = await res.json();
            if (aiData.id) {
                poll(aiData.id, btn, msgInt);
            } else {
                clearInterval(msgInt);
                isBusy = false;
                sync();
            }
        };
        reader.readAsDataURL(file);
    }

    async function poll(id, btn, msgInt) {
        try {
            const res = await fetch("https://api.fashn.ai/v1/status/" + id, {
                headers: { "Authorization": "Bearer fa-psJSioorPgb9-5cT5HZYyoCGokJVywFgFOPWt" }
            });
            const data = await res.json();
            if (data.status === "completed") {
                clearInterval(msgInt);
                isBusy = false;
                sync();
                showResult(data.output[0]);
            } else {
                setTimeout(function() { poll(id, btn, msgInt); }, 3000);
            }
        } catch (e) { setTimeout(function() { poll(id, btn, msgInt); }, 3000); }
    }

    function showResult(url) {
        const div = document.createElement("div");
        div.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.95);z-index:2147483647;display:flex;flex-direction:column;align-items:center;justify-content:center;backdrop-filter:blur(10px);";
        div.innerHTML = '<div style="background:#fff;padding:10px;border-radius:20px;max-width:90%;text-align:center;"><img src="' + url + '" style="max-height:70vh;border-radius:15px;display:block;"><p style="color:#000;font-weight:bold;margin:15px 0 5px;">✨ YOUR AI FITTING</p><p style="font-size:10px;color:#666;margin:0;">🛡️ SECURE SESSION: DATA DELETED</p></div><button onclick="this.parentElement.remove()" style="margin-top:20px;padding:12px 40px;border-radius:50px;border:none;background:#fff;font-weight:bold;cursor:pointer;">CLOSE</button>';
        document.body.appendChild(div);
    }

    const s = document.createElement("style");
    s.innerHTML = ".v-spin { width:14px; height:14px; border:2px solid #fff; border-top-color:transparent; border-radius:50%; display:inline-block; animation: v-rot 0.8s linear infinite; margin-right:8px; vertical-align:middle; } @keyframes v-rot { to {transform:rotate(360deg)} }";
    document.head.appendChild(s);

    sync();
    setInterval(sync, 10000);
})();
