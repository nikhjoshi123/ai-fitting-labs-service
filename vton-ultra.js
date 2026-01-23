// ... (Keep your CSS and Sync logic from the previous message) ...

    var lastRemaining = 5; // Default starting number

    function startProcess(btn) {
        var input = document.createElement("input");
        input.type = "file"; input.accept = "image/*";
        input.onchange = function(e) {
            var prod = Array.from(document.getElementsByTagName("img")).find(function(i) { 
                return i.width > 200 && !i.src.includes("logo"); 
            });
            if (!e.target.files[0] || !prod) return alert("Product image not detected.");

            isBusy = true;
            btn.disabled = true;
            btn.innerHTML = '<span class="v-spin"></span> TAILORING...';

            var reader = new FileReader();
            reader.onload = function(re) {
                fetch(VERCEL_GATEKEEPER, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        inputs: { model_image: re.target.result, garment_image: prod.src, category: "auto" }
                    })
                }).then(function(r) { 
                    if (r.status === 403) throw new Error("LIMIT");
                    return r.json(); 
                }).then(function(ai) {
                    if (ai.id) {
                        lastRemaining = ai.remaining_tries; // Store remaining count
                        poll(ai.id, btn);
                    }
                }).catch(function(err) {
                    isBusy = false; btn.disabled = false;
                    btn.innerHTML = "✨ Virtual Try-On";
                    if (err.message === "LIMIT") alert("You've used your 5 daily fits. Come back tomorrow for more style!");
                    else alert("Connection error. Ensure your Vercel URL is correct.");
                });
            };
            reader.readAsDataURL(file);
        };
        input.click();
    }

    function showPop(url) {
        var ov = document.createElement("div");
        ov.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); z-index:2147483647; display:flex; align-items:center; justify-content:center; padding:20px; backdrop-filter:blur(10px);";
        ov.innerHTML = `
            <div class="vton-container">
                <div class="vton-img-side"><img src="${url}"></div>
                <div class="vton-text-side">
                    <h2 style="margin:0; font-size:26px; font-family:serif;">✨ Your Signature Look</h2>
                    <p style="color:#666; font-size:14px; margin-top:10px; line-height:1.5;">Our AI Stylist has tailored this piece for your silhouette.</p>
                    
                    <div style="background:#fff3cd; padding:12px; border-radius:12px; border:1px solid #ffeeba; margin-top:20px; text-align:center;">
                        <p style="margin:0; font-size:12px; color:#856404; font-weight:bold;">
                            🛍️ SHOP CAREFULLY: You have <b>${lastRemaining}</b> tries left today.
                        </p>
                    </div>

                    <div class="vton-privacy">
                        <p style="margin:0; font-size:11px; font-weight:900; letter-spacing:1px; color:#000;">🛡️ PRIVACY GUARANTEED</p>
                        <p style="margin:8px 0 0; font-size:11px; color:#777; line-height:1.4;">Your image is secure and <b>never stored</b> on our servers.</p>
                    </div>
                    <button id="v-done">DONE</button>
                </div>
            </div>
        `;
        document.body.appendChild(ov);
        document.getElementById("v-done").onclick = function() { ov.remove(); };
    }
// ... (rest of the script)
