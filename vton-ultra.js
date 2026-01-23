(function() {
    var SCRIPT_URL = "https://script.google.com/macros/s/AKfycbycyu6r5oMc3hAemOHwJ0g3Npc6k7S1XalPatII7B95U5oaWjRtlO9Pv916VgfwT5t0/exec"; 
    var API_KEY = "fa-psJSioorPgb9-5cT5HZYyoCGokJVywFgFOPWt";
    var isBusy = false;

    function syncStatus() {
        if (isBusy) return;
        fetch(SCRIPT_URL + "?url=" + encodeURIComponent(window.location.hostname) + "&t=" + Date.now())
            .then(function(res) { return res.json(); })
            .then(function(data) {
                updateButton(data.status, data.canUse);
            }).catch(function() { console.log("Mirror Syncing..."); });
    }

    function updateButton(status, canUse) {
        var btn = document.getElementById("ai-vton-btn");
        if (!btn) {
            btn = document.createElement("button");
            btn.id = "ai-vton-btn";
            btn.style.cssText = "position:fixed; bottom:30px; right:30px; z-index:2147483647; padding:16px 32px; color:#fff; border-radius:50px; font-weight:bold; border:none; cursor:pointer; font-family:sans-serif; box-shadow:0 10px 30px rgba(0,0,0,0.5); display:block !important; transition: transform 0.2s ease;";
            document.body.appendChild(btn);
        }

        var isBlocked = (status === "PAUSE" || status === "EXPIRE" || !canUse);
        btn.innerHTML = isBlocked ? "🔒 Mirror Paused" : "✨ Virtual Try-On";
        btn.style.background = isBlocked ? "#666" : "linear-gradient(135deg, #000, #444)";
        
        btn.onclick = function() {
            if (isBlocked) return alert("Our AI Stylist is resting. Try again later.");
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
            
            if (!file || !prodImg) return alert("Please wait for product image to load.");

            isBusy = true;
            btn.disabled = true;
            btn.innerHTML = '<span class="v-spin"></span> ANALYZING STYLE...';

            var reader = new FileReader();
            reader.onload = function(re) {
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
                    alert("AI Session Busy. Please try again.");
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
                btn.innerHTML = "✨ Virtual Try-On";
                showFancyPop(data.output[0]);
            } else {
                setTimeout(function() { pollAI(id, btn); }, 3000);
            }
        });
    }

    function showFancyPop(url) {
        var d = document.createElement("div");
        d.id = "vton-overlay";
        d.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:2147483647; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(8px); animation: fadeIn 0.4s ease;";
        
        d.innerHTML = `
            <div style="background:#fff; width:90%; max-width:420px; border-radius:30px; overflow:hidden; box-shadow:0 40px 100px rgba(0,0,0,0.6); transform:scale(0.9); animation: slideUp 0.4s forwards ease-out;">
                <div style="position:relative;">
                    <img src="${url}" style="width:100%; display:block; border-bottom:1px solid #eee;">
                    <div style="position:absolute; top:15px; right:15px; background:rgba(255,255,255,0.9); padding:5px 12px; border-radius:20px; font-size:10px; font-weight:bold; color:#000; letter-spacing:1px;">PREVIEW</div>
                </div>
                <div style="padding:30px; text-align:center; font-family:sans-serif;">
                    <h2 style="margin:0 0 10px; font-size:22px; color:#000; letter-spacing:-0.5px;">✨ Your Style is Ready</h2>
                    <p style="margin:0 0 25px; font-size:13px; color:#666; line-height:1.5;">Our AI has blended your look perfectly. You look amazing!</p>
                    
                    <div style="background:#f9f9f9; padding:15px; border-radius:20px; border:1px solid #efefef; margin-bottom:25px;">
                        <p style="margin:0; font-size:11px; color:#000; font-weight:bold; text-transform:uppercase; letter-spacing:1px;">🛡️ Privacy Guaranteed</p>
                        <p style="margin:6px 0 0; font-size:11px; color:#777;">Your image is secure and <b>never stored</b> on our servers. Your privacy is our priority.</p>
                    </div>
                    
                    <button id="close-fancy" style="width:100%; padding:18px; background:#000; color:#fff; border-radius:18px; border:none; font-weight:bold; font-size:15px; cursor:pointer; transition:all 0.3s ease; box-shadow:0 10px 20px rgba(0,0,0,0.2);">DONE</button>
                </div>
            </div>
            <style>
                @keyframes fadeIn { from{opacity:0} to{opacity:1} }
                @keyframes slideUp { from{transform:scale(0.8) translateY(50px);opacity:0} to{transform:scale(1) translateY(0);opacity:1} }
                #close-fancy:hover { background:#333; transform:translateY(-2px); }
            </style>
        `;
        document.body.appendChild(d);
        document.getElementById("close-fancy").onclick = function() { d.remove(); };
    }

    var s = document.createElement("style");
    s.innerHTML = ".v-spin { width:12px; height:12px; border:2px solid #fff; border-top-color:transparent; border-radius:50%; display:inline-block; animation: v-rot 0.8s linear infinite; margin-right:8px; } @keyframes v-rot { to {transform:rotate(360deg)} }";
    document.head.appendChild(s);

    syncStatus();
    setInterval(syncStatus, 10000);
})();
