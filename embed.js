(function() {
    const MY_KEY = "fa-psJSioorPgb9-5cT5HZYyoCGokJVywFgFOPWt";
    // YOUR NEW GOOGLE SCRIPT URL
    const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwFONKsCMEb6rAYt_xewl52PHWUHsUiCds9pxAGs2noWhCUQCgmzsJ6-e-7zYshwOvV/exec"; 

    // --- SPINNER UI ---
    function toggleLoading(show) {
        let loader = document.getElementById("vton-loader");
        if (show) {
            if (!loader) {
                loader = document.createElement("div");
                loader.id = "vton-loader";
                loader.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:100001;display:flex;flex-direction:column;align-items:center;justify-content:center;color:white;font-family:sans-serif;";
                loader.innerHTML = `
                    <div style="border: 6px solid #f3f3f3; border-top: 6px solid #ffcc00; border-radius: 50%; width: 50px; height: 50px; animation: vton-spin 1s linear infinite;"></div>
                    <p style="margin-top:20px; font-weight:bold; font-size:18px;">AI is styling your outfit... Please wait.</p>
                    <style>@keyframes vton-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
                `;
                document.body.appendChild(loader);
            }
        } else if (loader) { loader.remove(); }
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

            // 1. REMOVE: Vanish if status is 'REMOVE'
            if (data.status === "REMOVE") {
                if (existingBtn) existingBtn.remove();
                return;
            }

            // 2. EXPIRED: Show locked button
            if (!data.canUse) {
                if (!existingBtn) createButton(false);
                else updateButtonStatus(existingBtn, false);
                return;
            }

            // 3. ACTIVE: Show working button
            if (!existingBtn) createButton(true);
            else updateButtonStatus(existingBtn, true);

        } catch (e) { console.warn("Syncing..."); }
    }

    function updateButtonStatus(btn, canUse) {
        if (!canUse) {
            btn.innerHTML = "🔒 Service Paused (Contact Admin)";
            btn.style.background = "#666";
            btn.style.cursor = "not-allowed";
        } else {
            btn.innerHTML = "✨ AI Try On";
            btn.style.background = "#000";
            btn.style.cursor = "pointer";
        }
    }

    function createButton(canUse) {
        const btn = document.createElement("button");
        btn.id = "ai-vton-btn";
        btn.style.cssText = "position:fixed;bottom:30px;right:30px;z-index:9999;padding:18px 30px;color:#fff;border-radius:50px;font-weight:bold;border:none;box-shadow:0 10px 30px rgba(0,0,0,0.5);transition: all 0.3s ease;";
        updateButtonStatus(btn, canUse);

        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = "image/*";
        fileInput.style.display = "none";
        document.body.appendChild(fileInput);

        btn.onclick = () => {
            if (btn.innerHTML.includes("🔒")) {
                alert("Subscription Expired. Contact nikhjoshi1234@gmail.com to renew.");
            } else {
                fileInput.click();
            }
        };

        fileInput.onchange = async (e) => {
            const file = e.target.files[0];
            const images = document.getElementsByTagName("img");
            let prodImg = Array.from(images).find(img => img.width > 300 && !img.src.includes("logo"))?.src;

            if (!file || !prodImg) return;
            toggleLoading(true); // SHOW SPINNER

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
                        // Notify Google Sheet
                        fetch(SCRIPT_URL + "?action=use&url=" + encodeURIComponent(window.location.hostname), {mode: 'no-cors'});
                        startPolling(resData.id);
                    } else { toggleLoading(false); }
                } catch (err) { toggleLoading(false); }
            };
            reader.readAsDataURL(file);
        };
        document.body.appendChild(btn);
    }

    async function startPolling(id) {
        const res = await fetch("https://api.fashn.ai/v1/status/" + id, {
            headers: { "Authorization": "Bearer " + MY_KEY }
        });
        const result = await res.json();
        if (result.status === "completed") {
            toggleLoading(false); // HIDE SPINNER
            showFullPopup(result.output[0]);
        } else if (result.status === "failed") {
            toggleLoading(false);
            alert("AI processing failed. Please try a different photo.");
        } else { setTimeout(() => startPolling(id), 3000); }
    }

    function showFullPopup(imgUrl) {
        const overlay = document.createElement("div");
        overlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.95);z-index:100000;display:flex;flex-direction:column;align-items:center;justify-content:center;color:white;padding:20px;";
        overlay.innerHTML = `
            <h2 style="margin-bottom:20px;">AI Fitting Result</h2>
            <img src="${imgUrl}" style="max-height:75%; border-radius:15px; border:2px solid #fff;">
            <button id="close-vton" style="margin-top:20px;padding:15px 40px;background:#fff;color:#000;border:none;border-radius:5px;cursor:pointer;font-weight:bold;">CLOSE RESULT</button>
        `;
        document.body.appendChild(overlay);
        document.getElementById("close-vton").onclick = () => overlay.remove();
    }

    setInterval(monitorSubscription, 5000);
})();
