(function() {
    // 1. YOUR GOOGLE SCRIPT URL
    const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbycyu6r5oMc3hAemOHwJ0g3Npc6k7S1XalPatII7B95U5oaWjRtlO9Pv916VgfwT5t0/exec"; 

    async function sync() {
        try {
            const res = await fetch(${SCRIPT_URL}?url=${encodeURIComponent(window.location.hostname)}&cb=${Math.random()});
            const data = await res.json();
            
            const btn = document.getElementById("ai-vton-btn");

            // If REMOVE or NONE, kill the button
            if (data.status === "REMOVE" || data.status === "NONE") {
                if (btn) btn.remove();
                return;
            }

            if (!btn) render(data.canUse, data.status);
            else updateUI(btn, data.canUse, data.status);
        } catch (e) { console.log("AI Labs Sync Error"); }
    }

    function render(canUse, status) {
        const btn = document.createElement("button");
        btn.id = "ai-vton-btn";
        btn.style.cssText = "position:fixed; bottom:30px; right:30px; z-index:2147483647; padding:15px 25px; color:#fff; border-radius:50px; font-weight:bold; border:none; box-shadow:0 10px 30px rgba(0,0,0,0.5); cursor:pointer;";
        
        updateUI(btn, canUse, status);

        btn.onclick = () => {
            if (btn.innerText.includes("🔒")) return alert("Plan expired.");
            
            const input = document.createElement("input");
            input.type = "file"; 
            input.accept = "image/*";
            input.onchange = async (e) => {
                const file = e.target.files[0];
                const prodImg = Array.from(document.getElementsByTagName("img")).find(img => img.width > 200)?.src;
                if (!file || !prodImg) return;

                btn.setAttribute("data-loading", "true");
                btn.style.background = "#333";
                btn.innerHTML = <span class="v-spin"></span> <span id="v-msg">🛡️ Privacy Shield Active...</span>;

                const trustMsgs = ["🔒 Encrypting Photo...", "🛡️ No data stored", "✨ Creating look...", "🗑️ Deleting source file..."];
                let i = 0;
                const timer = setInterval(() => {
                    const el = document.getElementById("v-msg");
                    if (el) el.innerText = trustMsgs[i++ % trustMsgs.length];
                }, 2500);

                const reader = new FileReader();
                reader.onloadend = async () => {
                    const aiRes = await fetch(SCRIPT_URL, {
                        method: "POST",
                        body: JSON.stringify({
                            model_name: "tryon-v1.6",
                            inputs: { model_image: reader.result, garment_image: prodImg, category: "auto" }
                        })
                    });
                    const aiData = await aiRes.json();
                    if (aiData.id) {
                        poll(aiData.id, btn, timer);
                    } else {
                        clearInterval(timer);
                        resetBtn(btn);
                    }
                };
                reader.readAsDataURL(file);
            };
            input.click();
        };

        document.body.appendChild(btn);
    }

    function updateUI(btn, canUse, status) {
        if (btn.getAttribute("data-loading") === "true") return;
        btn.innerText = (status === "EXPIRE" || !canUse) ? "🔒 Paused" : "✨ Try on";
        btn.style.background = (status === "EXPIRE" || !canUse) ? "#666" : "#000";
    }

    async function poll(id, btn, timer) {
        try {
            const res = await fetch("https://api.fashn.ai/v1/status/" + id, {
                headers: { "Authorization": "Bearer fa-psJSioorPgb9-5cT5HZYyoCGokJVywFgFOPWt" } 
            });
            const data = await res.json();
            if (data.status === "completed") {
                clearInterval(timer);
                resetBtn(btn);
                showPopup(data.output[0]);
            } else if (data.status === "failed") {
                clearInterval(timer);
                resetBtn(btn);
                alert("AI Error. Please try again.");
            } else {
                setTimeout(() => poll(id, btn, timer), 3000);
            }
        } catch (e) { console.error("Polling Error"); }
    }

    function resetBtn(btn) {
        btn.setAttribute("data-loading", "false");
        btn.style.background = "#000";
        btn.innerHTML = "✨ Try on";
    }

    function showPopup(url) {
        const div = document.createElement("div");
        div.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);z-index:2147483647;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;";
        div.innerHTML = `
            <img src="${url}" style="max-height:75%; border-radius:10px;">
            <div style="margin-top:10px; color:#aaa; font-size:12px;">🛡️ Privacy: Your photo was processed and deleted.</div>
            <button onclick="this.parentElement.remove()" style="margin-top:20px;padding:10px 30px;cursor:pointer;">CLOSE</button>
        `;
        document.body.appendChild(div);
    }

    const s = document.createElement("style");
    s.innerHTML = .v-spin { width:14px; height:14px; border:2px solid #fff; border-bottom-color:transparent; border-radius:50%; display:inline-block; animation:v-rot 1s linear infinite; margin-right:8px; vertical-align: middle; } @keyframes v-rot { 0% {transform:rotate(0deg)} 100% {transform:rotate(360deg)} };
    document.head.appendChild(s);

    sync();
    setInterval(sync, 10000);
})();
