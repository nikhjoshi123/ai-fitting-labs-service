(function() {
    const MY_KEY = "fa-psJSioorPgb9-5cT5HZYyoCGokJVywFgFOPWt";
    const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwjKnxSlvXYb3md65VMNQRKE26hlgwX8Uuq7_145NzgMOaFDiHTCuPIpXni1N6znt8B/exec"; 

    async function monitorSubscription() {
        if (!window.location.href.includes("/product/")) {
            const btn = document.getElementById("ai-vton-btn");
            if (btn) btn.remove();
            return;
        }

        try {
            const check = await fetch(SCRIPT_URL + "?url=" + encodeURIComponent(window.location.hostname));
            const status = await check.json();
            const existingBtn = document.getElementById("ai-vton-btn");

            if (!existingBtn) {
                createButton(status.canUse);
            } else {
                updateButtonStatus(existingBtn, status.canUse);
            }
        } catch (e) {
            console.warn("Syncing...");
        }
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
                // Professional message with your contact info
                alert("Trial Period Expired. To continue using AI Try-On, please contact nikhjoshi1234@gmail.com to activate your plan.");
            } else {
                // POPUP REMOVED: Now opens file input directly
                fileInput.click();
            }
        };

        fileInput.onchange = async (e) => {
            const file = e.target.files[0];
            const images = document.getElementsByTagName("img");
            let prodImg = Array.from(images).find(img => img.width > 300 && !img.src.includes("logo"))?.src;

            if (!file || !prodImg) return;
            btn.innerHTML = "⏳ AI Fitting...";
            
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
                    const data = await res.json();
                    if (data.id) {
                        fetch(SCRIPT_URL + "?action=use&url=" + encodeURIComponent(window.location.hostname), {mode: 'no-cors'});
                        startPolling(data.id);
                    }
                } catch (err) {
                    btn.innerHTML = "✨ AI Try On";
                }
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
            showFullPopup(result.output[0]);
            document.getElementById("ai-vton-btn").innerHTML = "✨ AI Try On";
        } else { setTimeout(() => startPolling(id), 3000); }
    }

    function showFullPopup(imgUrl) {
        const overlay = document.createElement("div");
        overlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.95);z-index:100000;display:flex;flex-direction:column;align-items:center;justify-content:center;color:white;padding:20px;font-family:sans-serif;";
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