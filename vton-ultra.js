(function() {
    var GOOGLE_URL = "https://script.google.com/macros/s/AKfycbycyu6r5oMc3hAemOHwJ0g3Npc6k7S1XalPatII7B95U5oaWjRtlO9Pv916VgfwT5t0/exec"; 
    var VERCEL_URL = "https://ai-fitting-labs-service-pigf.vercel.app/api"; 
    var isBusy = false;
    var lastRemaining = 5;

    // 1. STYLES (Added immediately to ensure visibility)
    var s = document.createElement("style");
    s.innerHTML = ".v-spin { width:12px; height:12px; border:2px solid #fff; border-top-color:transparent; border-radius:50%; display:inline-block; animation: v-rot 0.8s linear infinite; margin-right:8px; } @keyframes v-rot { to {transform:rotate(360deg)} } .vton-container { background: #fff; width: 100%; max-width: 900px; display: flex; flex-direction: row; border-radius: 30px; overflow: hidden; box-shadow: 0 50px 100px rgba(0,0,0,0.5); animation: v-up 0.4s ease; } .vton-img-side { flex: 1.2; background: #f4f4f4; position: relative; line-height: 0; } .vton-img-side img { width: 100%; height: 100%; object-fit: cover; } .vton-text-side { flex: 1; padding: 40px; display: flex; flex-direction: column; justify-content: center; font-family: sans-serif; } .vton-privacy { background: #f9f9f9; padding: 20px; border-radius: 15px; border: 1px solid #eee; margin: 20px 0; } #v-done { width: 100%; padding: 18px; background: #000; color: #fff; border-radius: 15px; border: none; font-weight: bold; cursor: pointer; } @keyframes v-up { from{transform:translateY(20px);opacity:0} to{transform:translateY(0);opacity:1} } @media (max-width: 768px) { .vton-container { flex-direction: column; max-height: 95vh; overflow-y: auto; } .vton-img-side { height: 400px; } }";
    document.head.appendChild(s);

    function sync() {
        if (isBusy) return;
        fetch(GOOGLE_URL + "?url=" + encodeURIComponent(window.location.hostname) + "&t=" + Date.now())
            .then(function(r) { return r.json(); })
            .then(function(data) {
                render(data.status, data.canUse);
            })
            .catch(function() { 
                console.log("Syncing..."); 
                render("ACTIVE", true); // Safety: Show button even if sync blips
            });
    }

    function render(status, canUse) {
        var btn = document.getElementById("ai-vton-btn");
        if (!btn) {
            btn = document.createElement("button");
            btn.id = "ai-vton-btn";
            btn.style.cssText = "position:fixed; bottom:30px; right:30px; z-index:2147483647; padding:16px 32px; color:#fff; border-radius:50px; font-weight:bold; border:none; cursor:pointer; box-shadow:0 10px 30px rgba(0,0,0,0.4); display:block !important;";
            document.body.appendChild(btn);
        }

        var isOff = (status !== "ACTIVE" || !canUse);
        btn.innerHTML = isOff ? "🔒 Mirror Paused" : "✨ Virtual Try-On";
        btn.style.background = isOff ? "#666" : "linear-gradient(135deg, #000, #444)";
        
        btn.onclick = function() {
            if (isOff) return alert("Service paused.");
            trigger(btn);
        };
    }

    function trigger(btn) {
        var input = document.createElement("input");
        input.type = "file"; input.accept = "image/*";
        input.onchange = function(e) {
            var file = e.target.files[0];
            var prod = Array.from(document.getElementsByTagName("img")).find(function(i) { 
                return i.width > 200 && !i.src.includes("logo"); 
            });
            if (!file || !prod) return alert("Product image not detected.");

            isBusy = true; btn.disabled = true;
            btn.innerHTML = '<span class="v-spin"></span> ANALYZING...';

            var reader = new FileReader();
            reader.onload = function(re) {
                fetch(VERCEL_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        inputs: { model_image: re.target.result, garment_image: prod.src, category: "auto" }
                    })
                })
                .then(function(r) { 
                    if (r.status === 403) throw new Error("LIMIT");
                    return r.json(); 
                })
                .then(function(ai) {
                    if (ai.id) {
                        lastRemaining = ai.remaining_tries || 0;
                        poll(ai.id, btn);
                    }
                })
                .catch(function(err) {
                    isBusy = false; btn.disabled = false;
                    btn.innerHTML = "✨ Virtual Try-On";
                    if (err.message === "LIMIT") alert("Daily limit reached! Shop carefully tomorrow.");
                    else alert("Connection error with Vercel.");
                });
            };
            reader.readAsDataURL(file);
        };
        input.click();
    }

    function poll(id, btn) {
        fetch("https://api.fashn.ai/v1/status/" + id)
            .then(function(r) { return r.json(); })
            .then(function(d) {
                if (d.status === "completed") {
                    isBusy = false; btn.disabled = false;
                    btn.innerHTML = "✨ Virtual Try-On";
                    showPop(d.output[0]);
                } else { setTimeout(function(){ poll(id, btn); }, 3000); }
            });
    }

    function showPop(url) {
        var ov = document.createElement("div");
        ov.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); z-index:2147483647; display:flex; align-items:center; justify-content:center; padding:20px; backdrop-filter:blur(10px);";
        ov.innerHTML = '<div class="vton-container"><div class="vton-img-side"><img src="'+url+'"></div><div class="vton-text-side"><h2 style="margin:0; font-size:26px;">✨ Your Signature Look</h2><p style="color:#666; font-size:14px; margin-top:10px;">Our AI Stylist has tailored this piece for your silhouette.</p><div style="background:#fff3cd; padding:12px; border-radius:12px; border:1px solid #ffeeba; margin-top:20px; text-align:center;"><p style="margin:0; font-size:12px; color:#856404; font-weight:bold;">🛍️ SHOP CAREFULLY: You have <b>'+lastRemaining+'</b> tries left today.</p></div><div class="vton-privacy"><p style="margin:0; font-size:11px; font-weight:900; letter-spacing:1px; color:#000;">🛡️ PRIVACY GUARANTEED</p><p style="margin:8px 0 0; font-size:11px; color:#777;">Your image is secure and <b>never stored</b> on our servers.</p></div><button id="v-done">DONE</button></div></div>';
        document.body.appendChild(ov);
        document.getElementById("v-done").onclick = function() { ov.remove(); };
    }

    sync();
    setInterval(sync, 10000);
})();
