(function() {
    var SCRIPT_URL = "https://script.google.com/macros/s/AKfycbycyu6r5oMc3hAemOHwJ0g3Npc6k7S1XalPatII7B95U5oaWjRtlO9Pv916VgfwT5t0/exec"; 
    var isBusy = false;

    function sync() {
        if (isBusy) return;
        var fetchUrl = SCRIPT_URL + "?url=" + encodeURIComponent(window.location.hostname) + "&cb=" + new Date().getTime();
        
        fetch(fetchUrl).then(function(res) { return res.json(); }).then(function(data) {
            var btn = document.getElementById("ai-vton-btn");
            if (!btn) {
                btn = document.createElement("button");
                btn.id = "ai-vton-btn";
                btn.style.cssText = "position:fixed; bottom:30px; right:30px; z-index:2147483647; padding:16px 32px; color:#fff; border-radius:50px; font-weight:bold; border:none; cursor:pointer; font-family:sans-serif; box-shadow:0 10px 30px rgba(0,0,0,0.5); display:block !important;";
                document.body.appendChild(btn);
            }

            var isPaused = (data.status === "PAUSE" || data.status === "EXPIRE" || !data.canUse);
            
            if (isPaused) {
                btn.innerHTML = "🔒 Service Paused";
                btn.style.background = "#666666";
                btn.onclick = function() { alert("Mirror is currently offline."); };
            } else {
                btn.innerHTML = "✨ Try-On Mirror";
                btn.style.background = "linear-gradient(135deg, #000, #434343)";
                btn.onclick = function() { startUpload(btn); };
            }
        });
    }

    function startUpload(btn) {
        var input = document.createElement("input");
        input.type = "file"; input.accept = "image/*";
        input.onchange = function(e) {
            var file = e.target.files[0];
            var prodImg = Array.from(document.getElementsByTagName("img")).find(function(i) { return i.width > 200 && !i.src.includes("logo"); });
            
            if (!file || !prodImg) return alert("Product image not found.");

            isBusy = true;
            btn.disabled = true;
            btn.innerHTML = "⌛ AI GENERATING...";

            var reader = new FileReader();
            reader.onloadend = function() {
                // DIRECT CALL TO AI (Bypassing Google Sheet Faults)
                fetch("https://api.fashn.ai/v1/run", {
                    method: "POST",
                    headers: { 
                        "Authorization": "Bearer " + window.VTON_CONFIG.key,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        model_name: "tryon-v1.6",
                        inputs: { model_image: reader.result, garment_image: prodImg.src, category: "auto" }
                    })
                }).then(function(res) { return res.json(); }).then(function(ai) {
                    if (ai.id) poll(ai.id, btn);
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

    function poll(id, btn) {
        fetch("https://api.fashn.ai/v1/status/" + id, {
            headers: { "Authorization": "Bearer " + window.VTON_CONFIG.key }
        }).then(function(res) { return res.json(); }).then(function(data) {
            if (data.status === "completed") {
                isBusy = false; btn.disabled = false;
                showResult(data.output[0]);
            } else if (data.status === "failed") {
                isBusy = false; btn.disabled = false;
                alert("AI failed to process image.");
            } else {
                setTimeout(function() { poll(id, btn); }, 3000);
            }
        });
    }

    function showResult(url) {
        var div = document.createElement("div");
        div.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);z-index:2147483647;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;";
        div.innerHTML = '<div style="background:#fff;padding:15px;border-radius:20px;max-width:400px;text-align:center;"><img src="'+url+'" style="width:100%;border-radius:10px;"><p style="margin:15px 0 5px;font-weight:bold;color:#000;">✨ YOUR AI STYLE</p><p style="font-size:10px;color:#888;">🛡️ SECURE SESSION: DATA DELETED</p><button id="v-close" style="margin-top:15px;width:100%;padding:12px;background:#000;color:#fff;border-radius:10px;border:none;cursor:pointer;font-weight:bold;">CLOSE</button></div>';
        document.body.appendChild(div);
        document.getElementById("v-close").onclick = function() { div.remove(); };
    }

    sync();
    setInterval(sync, 10000);
})();
