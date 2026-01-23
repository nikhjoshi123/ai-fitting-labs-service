(function() {
    // PASTE YOUR NEWEST DEPLOYMENT URL HERE
    const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbycyu6r5oMc3hAemOHwJ0g3Npc6k7S1XalPatII7B95U5oaWjRtlO9Pv916VgfwT5t0/exec"; 

    async function sync() {
        try {
            const res = await fetch(${SCRIPT_URL}?url=${encodeURIComponent(window.location.hostname)}&cb=${Math.random()});
            const data = await res.json();
            
            console.log("AI Labs Sync:", data); // Check your console to see what Google is saying

            if (data.status === "REMOVE" || data.status === "NONE") {
                const oldBtn = document.getElementById("ai-vton-btn");
                if (oldBtn) oldBtn.remove();
                if (data.status === "NONE") console.warn("Domain not found in Google Sheet!");
                return;
            }

            render(data.canUse, data.status);
        } catch (e) { console.error("Sync Error:", e); }
    }

    function render(canUse, status) {
        if (document.getElementById("ai-vton-btn")) {
            updateUI(document.getElementById("ai-vton-btn"), canUse, status);
            return;
        }

        const btn = document.createElement("button");
        btn.id = "ai-vton-btn";
        btn.style.cssText = "position:fixed; bottom:30px; right:30px; z-index:2147483647; padding:15px 25px; color:#fff; border-radius:50px; font-weight:bold; border:none; box-shadow:0 10px 30px rgba(0,0,0,0.5); cursor:pointer; display:block !important;";
        
        updateUI(btn, canUse, status);

        btn.onclick = () => {
            if (btn.innerText.includes("🔒")) return alert("Subscription Paused.");
            
            const input = document.createElement("input");
            input.type = "file"; input.accept = "image/*";
            input.onchange = async (e) => {
                const file = e.target.files[0];
                const prodImg = Array.from(document.getElementsByTagName("img")).find(img => img.width > 200)?.src;
                if (!file || !prodImg) return;

                btn.innerHTML = <span class="v-spin"></span> 🔒 Privacy Shield Active...;
                // ... (rest of your existing upload/reader logic)
            };
            input.click();
        };

        document.body.appendChild(btn);
    }

    function updateUI(btn, canUse, status) {
        btn.innerText = (status === "EXPIRE" || !canUse) ? "🔒 Paused" : "✨ Try on";
        btn.style.background = (status === "EXPIRE" || !canUse) ? "#666" : "#000";
    }

    sync();
    setInterval(sync, 10000); // Check every 10 seconds for REMOVE/EXPIRE
})();
