(function() {
    // 1. YOUR GOOGLE SCRIPT URL
    var SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyCg7QKxQ1KkW7BD4feF-v5BGYnwtz3UP4yxAjH2gxyIXi7tZNMbGxemFVzj4gZVxkL/exec"; 
    var isBusy = false;

    function sync() {
        if (isBusy) return;
        var url = SCRIPT_URL + "?url=" + encodeURIComponent(window.location.hostname) + "&cb=" + new Date().getTime();
        
        fetch(url).then(function(res) { 
            return res.json(); 
        }).then(function(data) {
            render(data.canUse, data.status);
        }).catch(function(err) { 
            console.log("Mirror Syncing..."); 
        });
    }

    function render(canUse, status) {
        var btn = document.getElementById("ai-vton-btn");
        var active = (status === "ACTIVE" && canUse);

        if (!btn) {
            btn = document.createElement("button");
            btn.id = "ai-vton-btn";
            btn.style.position = "fixed";
            btn.style.bottom = "30px";
            btn.style.right = "30px";
            btn.style.zIndex = "2147483647";
            btn.style.padding = "16px 32px";
            btn.style.color = "#ffffff";
            btn.style.borderRadius = "50px";
            btn.style.fontWeight = "bold";
            btn.style.border = "none";
            btn.style.cursor = "pointer";
            btn.style.fontFamily = "sans-serif";
            btn.style.boxShadow = "0 10px 30px rgba(0,0,0,0.5)";
            btn.onclick = function() {
                if (!active) return alert("Service Paused.");
                var input = document.createElement("input");
                input.type = "file";
                input.accept = "image/*";
                input.onchange = function(e) { handleUpload(e.target.files[0], btn); };
                input.click();
            };
            document.body.appendChild(btn);
        }

        btn.innerHTML = active ? "✨ Try on" : "🔒 Mirror Paused";
        btn.style.background = active ? "linear-gradient(135deg, #000000, #434343)" : "#666666";
    }

    function handleUpload(file, btn) {
        var imgs = Array.from(document.getElementsByTagName("img"));
        var prodImg = imgs.find(function(i) { return i.width > 200 && !i.src.includes("logo"); });
        
        if (!file || !prodImg) return alert("Product image not detected.");

        isBusy = true;
        btn.disabled = true;
        btn.innerHTML = "SECURE GENERATING...";

        var reader = new FileReader();
        reader.onloadend = function() {
            fetch(SCRIPT_URL, {
                method: "POST",
                body: JSON.stringify({
                    inputs: { model_image: reader.result, garment_image: prodImg.src, category: "auto" }
                })
            }).then(function(res) { 
                return res.json(); 
            }).then(function(data) {
                if (data.id) poll(data.id, btn);
                else { isBusy = false; btn.disabled = false; sync(); }
            }).catch(function() { 
                isBusy = false; btn.disabled = false; sync(); 
            });
        };
        reader.readAsDataURL(file);
    }

    function poll(id, btn) {
        fetch("https://api.fashn.ai/v1/status/" + id, {
            headers: { "Authorization": "Bearer fa-psJSioorPgb9-5cT5HZYyoCGokJVywFgFOPWt" }
        }).then(function(res) { 
            return res.json(); 
        }).then(function(data) {
            if (data.status === "completed") {
                isBusy = false;
                btn.disabled = false;
                sync();
                showResult(data.output[0]);
            } else {
                setTimeout(function() { poll(id, btn); }, 3000);
            }
        }).catch(function() { 
            setTimeout(function() { poll(id, btn); }, 3000); 
        });
    }

    function showResult(url) {
        var overlay = document.createElement("div");
        overlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);z-index:2147483647;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;";
        overlay.innerHTML = '<div style="background:#fff;padding:20px;border-radius:25px;max-width:400px;text-align:center;"><img src="'+url+'" style="width:100%;border-radius:15px;"><p style="color:#000;font-weight:bold;margin-top:15px;">🛡️ PRIVACY VERIFIED</p><button id="close-v" style="margin-top:15px;width:100%;padding:12px;background:#000;color:#fff;border-radius:10px;border:none;cursor:pointer;">CLOSE</button></div>';
        document.body.appendChild(overlay);
        document.getElementById("close-v").onclick = function() { overlay.remove(); };
    }

    sync();
    setInterval(sync, 10000);
})();
