(function() {
    const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzI_b0VLClZwGxQlmCgbaj474geeWxJRULaat4ozo-autOxdbniy0_zAe8NwN8G1ytx/exec"; 
    const MY_KEY = "fa-psJSioorPgb9-5cT5HZYyoCGokJVywFgFOPWt";

    async function monitorSubscription() {
        // Only run on product pages
        if (!window.location.href.includes("/product/")) {
            const b = document.getElementById("ai-vton-btn");
            if (b) b.remove();
            return;
        }

        try {
            const response = await fetch(SCRIPT_URL + "?url=" + encodeURIComponent(window.location.hostname));
            const data = await response.json();
            const btn = document.getElementById("ai-vton-btn");

            // --- THE REMOVE FIX ---
            if (data.status === "REMOVE") {
                if (btn) btn.remove();
                return; 
            }

            if (!btn) {
                renderButton(data.canUse);
            } else {
                updateStyle(btn, data.canUse);
            }
        } catch (e) { console.log("Connecting to AI Fitting Labs..."); }
    }

    function updateStyle(btn, canUse) {
        if (btn.getAttribute("data-loading") === "true") return;
        if (!canUse) {
            btn.innerHTML = "🔒 Service Paused";
            btn.style.background = "#666";
        } else {
            btn.innerHTML = "✨ Try this!";
            btn.style.background = "#000";
        }
    }

    function renderButton(canUse) {
        const btn = document.createElement("button");
        btn.id = "ai-vton-btn";
        btn.style.cssText = "position:fixed;bottom:30px;right:30px;z-index:9999;padding:15px 25px;color:#fff;border-radius:50px;font-weight:bold;border:none;box-shadow:0 10px 20px rgba(0,0,0,0.2);cursor:pointer;display:flex;align-items:center;transition:0.3s;";
        updateStyle(btn, canUse);

        const input = document.createElement("input");
        input.type = "file"; input.accept = "image/*"; input.style.display = "none";
        
        btn.onclick = () => {
            if (btn.innerHTML.includes("🔒")) {
                alert("Subscription Expired. Contact info@aifittinglabs.store");
            } else {
                if(confirm("🛡️ Privacy Note: We do not store your photos. They are deleted immediately after the try-on. Proceed?")) {
                    input.click();
                }
            }
        };

        input.onchange = async (e) => {
            const file = e.target.files[0];
            const prodImg = Array.from(document.getElementsByTagName("img")).find(img => img.width > 250 && !img.src.includes("logo"))?.src;
            if (!file || !prodImg) return;

            // --- START SPINNER ---
            btn.setAttribute("data-loading", "true");
            btn.innerHTML = <span class="loader-circle"></span> Wait...;
            
            const reader = new FileReader();
            reader.onloadend = async () => {
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
                    // Log use to sheet
                    fetch(SCRIPT_URL + "?action=use&url=" + encodeURIComponent(window.location.hostname), {mode:'no-cors'});
                    poll(resData.id, btn);
                } else {
                    stopLoader(btn);
                }
            };
            reader.readAsDataURL(file);
        };

        const s = document.createElement("style");
        s.innerHTML = .loader-circle { width:14px; height:14px; border:2px solid #fff; border-bottom-color:transparent; border-radius:50%; display:inline-block; animation:rot 1s linear infinite; margin-right:8px; } @keyframes rot { 0% {transform:rotate(0deg)} 100% {transform:rotate(360deg)} };
        document.head.appendChild(s);
        document.body.appendChild(btn);
        document.body.appendChild(input);
    }

    function stopLoader(btn) {
        btn.setAttribute("data-loading", "false");
        updateStyle(btn, true);
    }

    async function poll(id, btn) {
        const res = await fetch("https://api.fashn.ai/v1/status/" + id, {
            headers: { "Authorization": "Bearer " + MY_KEY }
        });
        const data = await res.json();
        if (data.status === "completed") {
            stopLoader(btn);
            showResult(data.output[0]);
        } else if (data.status === "failed") {
            stopLoader(btn);
            alert("AI Failed. Try a clearer photo.");
        } else {
            setTimeout(() => poll(id, btn), 3000);
        }
    }

    function showResult(url) {
        const div = document.createElement("div");
        div.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);z-index:100000;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;";
        div.innerHTML = <img src="${url}" style="max-height:80%; border-radius:10px;"><button id="v-cls" style="margin-top:20px;padding:10px 30px;cursor:pointer;font-weight:bold;">CLOSE</button>;
        document.body.appendChild(div);
        document.getElementById("v-cls").onclick = () => div.remove();
    }

    setInterval(monitorSubscription, 5000);
})();
