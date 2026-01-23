(function() {
    const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyhoksFBtihKuSdgMKmvbv7KTiwr0nonj8pfUT3Qun4_f2Vzq6Jrm86neM1tl_vRes/exec"; 

    async function sync() {
        try {
            // The Math.random() makes sure we get the LATEST status from your sheet
            const res = await fetch(${SCRIPT_URL}?url=${encodeURIComponent(window.location.hostname)}&cb=${Math.random()});
            const data = await res.json();
            
            const btn = document.getElementById("ai-vton-btn");

            if (data.status === "REMOVE") {
                if (btn) btn.remove();
                return;
            }

            if (!btn) render(data.canUse, data.status);
            else updateUI(btn, data.canUse, data.status);
        } catch (e) { console.log("Syncing..."); }
    }

    function render(canUse, status) {
        const btn = document.createElement("button");
        btn.id = "ai-vton-btn";
        btn.style.cssText = "position:fixed; bottom:30px; right:30px; z-index:2147483647; padding:15px 25px; color:#fff; border-radius:50px; font-weight:bold; border:none; box-shadow:0 10px 30px rgba(0,0,0,0.5); cursor:pointer;";
        
        updateUI(btn, canUse, status);

        const input = document.createElement("input");
        input.type = "file"; input.accept = "image/*"; input.style.display = "none";
        
        btn.onclick = () => {
            if (btn.innerText.includes("🔒")) return alert("Plan expired.");
            input.click();
        };

        input.onchange = async (e) => {
            const file = e.target.files[0];
            const prodImg = Array.from(document.getElementsByTagName("img")).find(img => img.width > 200)?.src;
            if (!file || !prodImg) return;

            // PREMIUM LOADER WITH PRIVACY MESSAGES
            btn.innerHTML = <span class="v-spin"></span> <span id="v-msg">🔒 Shielding Privacy...</span>;
            const msgs = ["🛡️ No data stored", "✨ Creating look...", "🗑️ Deleting photo..."];
            let i = 0;
            const timer = setInterval(() => {
                const el = document.getElementById("v-msg");
                if (el) el.innerText = msgs[i++ % msgs.length];
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
                if (aiData.id) poll(aiData.id, btn, timer);
            };
            reader.readAsDataURL(file);
        };

        document.body.appendChild(btn);
        document.body.appendChild(input);
    }

    function updateUI(btn, canUse, status) {
        btn.innerText = (status === "EXPIRE" || !canUse) ? "🔒 Paused" : "✨ Try on";
        btn.style.background = (status === "EXPIRE" || !canUse) ? "#666" : "#000";
    }

    // Keep your existing poll() and showPopup() functions here...
    
    sync();
})();
