(function() {
    var SCRIPT_URL = "https://script.google.com/macros/s/AKfycbycyu6r5oMc3hAemOHwJ0g3Npc6k7S1XalPatII7B95U5oaWjRtlO9Pv916VgfwT5t0/exec"; 
    var API_KEY = "fa-psJSioorPgb9-5cT5HZYyoCGokJVywFgFOPWt"; // Direct API Key for Stability
    var isBusy = false;

    function syncStatus() {
        if (isBusy) return;
        fetch(SCRIPT_URL + "?url=" + encodeURIComponent(window.location.hostname) + "&t=" + Date.now())
            .then(function(res) { return res.json(); })
            .then(function(data) {
                updateButton(data.status, data.canUse);
            }).catch(function() { console.log("Mirror Sync..."); });
    }

    function updateButton(status, canUse) {
        var btn = document.getElementById("ai-vton-btn");
        if (!btn) {
            btn = document.createElement("button");
            btn.id = "ai-vton-btn";
            btn.style.cssText = "position:fixed; bottom:30px; right:30px; z-index:2147483647; padding:16px 32px; color:#fff; border-radius:50px; font-weight:bold; border:none; cursor:pointer; font-family:sans-serif; box-shadow:0 10px 30px rgba(0,0,0,0.5); display:block !important;";
            document.body.appendChild(btn);
        }

        var isBlocked = (status === "PAUSE" || status === "EXPIRE" || !canUse);
        btn.innerHTML = isBlocked ? "🔒 Mirror Paused" : "✨ Try On Mirror";
        btn.style.background = isBlocked ? "#666" : "linear-gradient(135deg, #000, #444)";
        
        btn.onclick = function() {
            if (isBlocked) return alert("Service is currently unavailable.");
            triggerUpload(btn);
        };
    }

    function triggerUpload(btn) {
        var input = document.createElement("input");
        input.type = "file"; input.accept = "image/*";
        input.onchange = function(e) {
            var file = e.target.files[0];
            var prodImg = Array.from(document.getElementsByTagName("img")).find(function(i) { 
                return i.width > 200 && !i.src.includes("logo"); 
            });
            
            if (!file || !prodImg) return alert("Product image not detected.");

            isBusy = true;
            btn.disabled = true;
            btn.innerHTML = '<span class="v-spin"></span> PROCESSING...';

            var reader = new FileReader();
            reader.onload = function(re) {
                // DIRECT API CALL - Bypasses Google Sheet for the heavy lifting
                fetch("https://api.fashn.ai/v1/run", {
                    method: "POST",
                    headers: { "Authorization": "Bearer " + API_KEY, "Content-Type": "application/json" },
                    body: JSON.stringify({
                        model_name: "tryon-v1.6",
                        inputs: { model_image: re.target.result, garment_image: prodImg.src, category: "auto" }
                    })
                }).then(function(r) { return r.json(); }).then(function(ai) {
                    if (ai.id) pollAI(ai.id, btn);
                    else throw new Error();
                }).catch(function() {
                    isBusy = false; btn.disabled = false;
                    alert("AI is busy. Please try again.");
                });
            };
            reader.readAsDataURL(file);
        };
        input.click();
    }

    function pollAI(id, btn) {
        fetch("https://api.fashn.ai/v1/status/" + id, {
            headers: { "Authorization": "Bearer " + API_KEY }
        }).then(function(res) { return res.json(); }).then(function(data) {
            if (data.status === "completed") {
                isBusy = false; btn.disabled = false;
                btn.innerHTML = "✨ Try On Mirror";
                showResult(data.output[0]);
            } else if (data.status === "failed") {
                isBusy = false; btn.disabled = false;
                alert("Generation failed. Use a clearer photo.");
            } else {
                setTimeout(function() { pollAI(id, btn); }, 3000);
            }
        });
    }

    function showResult(url) {
        var d = document.createElement("div");
        d.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);z-index:2147483647;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;";
        d.innerHTML = '<div style="background:#fff;padding:15px;border-radius:25px;max-width:400px;text-align:center;"><img src="'+url+'" style="width:100%;border-radius:15px;"><p style="margin:15px 0 5px;font-weight:bold;color:#000;">✨ STYLE READY</p><p style="font-size:10px;color:#888;">🛡️ SECURE SESSION: DATA DELETED</p><button id="close-v" style="margin-top:15px;width:100%;padding:12px;background:#000;color:#fff;border-radius:10px;border:none;cursor:pointer;font-weight:bold;">CLOSE</button></div>';
        document.body.appendChild(d);
        document.getElementById("close-v").onclick = function() { d.remove(); };
    }

    var s = document.createElement("style");
    s.innerHTML = ".v-spin { width:12px; height:12px; border:2px solid #fff; border-top-color:transparent; border-radius:50%; display:inline-block; animation: v-rot 0.8s linear infinite; margin-right:8px; } @keyframes v-rot { to {transform:rotate(360deg)} }";
    document.head.appendChild(s);

    syncStatus();
    setInterval(syncStatus, 10000);
})();
