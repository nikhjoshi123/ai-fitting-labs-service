(function() {
    // UPDATE THIS with your latest Google Script URL
    const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzI_b0VLClZwGxQlmCgbaj474geeWxJRULaat4ozo-autOxdbniy0_zAe8NwN8G1ytx/exec"; 
    const MY_KEY = "fa-psJSioorPgb9-5cT5HZYyoCGokJVywFgFOPWt";

    function canUserTry() {
        const today = new Date().toDateString();
        const stats = JSON.parse(localStorage.getItem('vton_stats') || '{}');
        return stats.date !== today || (stats.count || 0) < 3;
    }

    function incrementUserTry() {
        const today = new Date().toDateString();
        let stats = JSON.parse(localStorage.getItem('vton_stats') || '{}');
        if (stats.date !== today) stats = { date: today, count: 1 };
        else stats.count++;
        localStorage.setItem('vton_stats', JSON.stringify(stats));
    }

    async function monitorSubscription() {
        if (!window.location.href.includes("/product/")) {
            const btn = document.getElementById("ai-vton-btn");
            if (btn) btn.remove();
            return;
        }

        try {
            const check = await fetch(SCRIPT_URL + "?url=" + encodeURIComponent(window.location.hostname));
            const data = await check.json();
            const existingBtn = document.getElementById("ai-vton-btn");

            if (data.status === "REMOVE") {
                if (existingBtn) existingBtn.remove();
                return;
            }

            if (!existingBtn) createButton(data.canUse);
            else updateButtonStatus(existingBtn, data.canUse);
        } catch (e) { console.warn("Syncing..."); }
    }

    function updateButtonStatus(btn, canUse) {
        if (btn.getAttribute("data-loading") === "true") return;
        if (!canUse) {
            btn.innerHTML = "🔒 Service Paused";
            btn.style.background = "#666";
            btn.style.cursor = "not-allowed";
        } else {
            btn.innerHTML = "✨ Try this!";
            btn.style.background = "#000";
            btn.style.cursor = "pointer";
        }
    }

    function createButton(canUse) {
        const btn = document.createElement("button");
        btn.id = "ai-vton-btn";
        btn.style.cssText = "position:fixed;bottom:30px;right:30px;z-index:9999;padding:15px 25px;color:#fff;border-radius:50px;font-weight:bold;border:none;box-shadow:0 10px 30px rgba(0,0,0,0.3);transition:0.3s;display:flex;align-items:center;justify-content:center;min-width:150px;";
        updateButtonStatus(btn, canUse);

        const fileInput = document.createElement("input");
        fileInput.type = "file"; fileInput.accept = "image/*"; fileInput.style.display = "none";
        document.body.appendChild(fileInput);

        btn.onclick = () => {
            if (btn.innerHTML.includes("🔒")) {
                alert("Subscription Expired. Contact info@aifittinglabs.store");
            } else if (!canUserTry()) {
                alert("Daily limit reached (3/3). Come back tomorrow!");
            } else {
                const consent = confirm("🛡️ PRIVACY PROTECTED\n\nYour photo is processed securely and deleted immediately after use. We do not store your data.\n\nDo you want to proceed?");
                if (consent) fileInput.click();
            }
        };

        fileInput.onchange = async (e) => {
            const file = e.target.files[0];
            const images = document.getElementsByTagName("img");
            let prodImg = Array.from(images).find(img => img.width > 300 && !img.src.includes("logo"))?.src;

            if (!file || !prodImg) return;
            
            btn.setAttribute("data-loading", "true");
            btn.innerHTML = <span class="vton-spin"></span> Wait...;
            btn.style.opacity = "0.7";

            const reader = new FileReader();
            reader.onloadend = async () => {
                try {
                    const res = await fetch("https://api.fashn.ai/v1/run", {
                        method: "POST",
                        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + MY_KEY },
                        body: JSON.stringify({
                            model_name: "tryon-v1.6",
                            inputs: { model_image: reader.result, garment_image: prodImg, category: "auto" }
                        })
                    });
                    const resData = await res.json();
                    if (resData.id) {
                        fetch(SCRIPT_URL + "?action=use&url=" + encodeURIComponent(window.location.hostname), {mode: 'no-cors'});
                        incrementUserTry();
                        startPolling(resData.id, btn);
                    } else { resetBtn(btn); }
                } catch (err) { resetBtn(btn); }
            };
            reader.readAsDataURL(file);
        };

        const style = document.createElement("style");
        style.innerHTML = .vton-spin { width: 16px; height: 16px; border: 2px solid #FFF; border-bottom-color: transparent; border-radius: 50%; display: inline-block; animation: vton-rot 1s linear infinite; margin-right: 8px; } @keyframes vton-rot { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } };
        document.head.appendChild(style);
        document.body.appendChild(btn);
    }

    function resetBtn(btn) {
        btn.setAttribute("data-loading", "false");
        btn.style.opacity = "1";
        updateButtonStatus(btn, true);
    }

    async function startPolling(id, btn) {
        const res = await fetch("https://api.fashn.ai/v1/status/" + id, {
            headers: { "Authorization": "Bearer " + MY_KEY }
        });
        const result = await res.json();
        if (result.status === "completed") {
            resetBtn(btn);
            showFullPopup(result.output[0]);
        } else if (result.status === "failed") {
            resetBtn(btn);
            alert("Processing failed. Please try a different photo.");
        } else { setTimeout(() => startPolling(id, btn), 3000); }
    }

    function showFullPopup(imgUrl) {
        const overlay = document.createElement("div");
        overlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);z-index:100000;display:flex;flex-direction:column;align-items:center;justify-content:center;color:white;padding:20px;";
        overlay.innerHTML = <img src="${imgUrl}" style="max-height:80%; border-radius:10px; border:2px solid #fff;"><button id="vton-close" style="margin-top:15px;padding:10px 30px;background:#fff;color:#000;border:none;border-radius:5px;cursor:pointer;font-weight:bold;">CLOSE</button>;
        document.body.appendChild(overlay);
        document.getElementById("vton-close").onclick = () => overlay.remove();
    }

    setInterval(monitorSubscription, 5000);
})();
