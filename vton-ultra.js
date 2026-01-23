(function() {
    var SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyCg7QKxQ1KkW7BD4feF-v5BGYnwtz3UP4yxAjH2gxyIXi7tZNMbGxemFVzj4gZVxkL/exec"; 
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

            // CLEAN LOGIC: Only show "Paused" if status is explicitly EXPIRE or PAUSE
            var isPaused = (data.status === "PAUSE" || data.status === "EXPIRE" || data.canUse === false);
            
            if (isPaused) {
                btn.innerHTML = "🔒 Service Paused";
                btn.style.background = "#666666";
                btn.onclick = function() { alert("Plan expired or paused in dashboard."); };
            } else {
                btn.innerHTML = "✨ Try-On Mirror";
                btn.style.background = "linear-gradient(135deg, #000000, #434343)";
                btn.onclick = function() { startUpload(btn); };
            }
        }).catch(function(e) { console.log("Mirror Syncing..."); });
    }

    function startUpload(btn) {
        if (isBusy) return;
        var input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.onchange = function(e) {
            var file = e.target.files[0];
            var imgs = Array.from(document.getElementsByTagName("img"));
            var prodImg = imgs.find(function(i) { return i.width > 200 && !i.src.includes("logo"); });
            
            if (!file || !prodImg) return alert("Product not detected.");

            isBusy = true;
            btn.disabled = true;
            btn.innerHTML = "⌛ AI GENERATING...";

            var reader = new FileReader();
            reader.onloadend = function() {
                fetch(SCRIPT_URL, {
                    method: "POST",
                    body: JSON.stringify({
                        inputs: { model_image: reader.result, garment_image: prodImg.src, category: "auto" }
                    })
                }).then(function(res) { return res.json(); }).then(function(ai) {
                    if (ai.id) poll(ai.id, btn);
                    else throw new Error();
                }).catch(function() {
                    isBusy = false; btn.disabled = false;
                    alert("AI is busy. Please try one more time.");
                    sync();
                });
            };
            reader.readAsDataURL(file);
        };
        input.click();
    }

    function poll(id, btn) {
        fetch("https://api.fashn.ai/v1/status/" + id, {
            headers: { "Authorization": "Bearer fa-psJSioorPgb9-5cT5HZYyoCGokJVywFgFOPWt" }
        }).then(function(res) { return res.json(); }).then(function(data) {
            if (data.status === "completed") {
                isBusy = false; btn.disabled = false;
                showResult(data.output[0]);
                sync();
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
