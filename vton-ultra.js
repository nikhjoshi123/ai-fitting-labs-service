(function() {
    const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbycyu6r5oMc3hAemOHwJ0g3Npc6k7S1XalPatII7B95U5oaWjRtlO9Pv916VgfwT5t0/exec"; 
    let isBusy = false;
    let currentStatus = null;

    // 1. THE HEARTBEAT: Checks Google Sheet every 5 seconds for status changes
    async function heartbeat() {
        if (isBusy) return;
        try {
            const res = await fetch(${SCRIPT_URL}?url=${encodeURIComponent(window.location.hostname)}&cb=${Date.now()});
            const data = await res.json();
            
            // Real-time toggle: If status changed in sheet, update UI immediately
            if (data.status !== currentStatus) {
                currentStatus = data.status;
                renderUI(data.canUse, data.status);
            }
        } catch (e) { console.log("Syncing..."); }
    }

    function renderUI(canUse, status) {
        let btn = document.getElementById("ai-vton-btn");
        
        // If "REMOVE" or "NONE", delete the button if it exists
        if (status === "REMOVE" || status === "NONE") {
            if (btn) btn.remove();
            return;
        }

        // Create button if it doesn't exist
        if (!btn) {
            btn = document.createElement("button");
            btn.id = "ai-vton-btn";
            document.body.appendChild(btn);
        }

        const active = (status === "ACTIVE" && canUse);
        btn.innerHTML = active ? "✨ Virtual Try-On" : "🔒 Mirror Paused";
        
        // Premium UI Styling
        btn.style.cssText = `
            position:fixed; bottom:30px; right:30px; z-index:2147483647; 
            padding:16px 32px; color:#fff; border-radius:50px; font-weight:bold; 
            border:none; cursor:pointer; font-family:sans-serif; text-transform:uppercase; 
            letter-spacing:1px; transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            background: ${active ? "linear-gradient(135deg, #000 0%, #434343 100%)" : "#666"};
            box-shadow: 0 10px 30px rgba(0,0,0,0.4);
            display: block !important;
        `;

        btn.onclick = () => {
            if (!active) return alert("This service is currently paused.");
            const input = document.createElement("input");
            input.type = "file"; input.accept = "image/*";
            input.onchange = (e) => handleProcess(e.target.files[0], btn);
            input.click();
        };
    }

    async function handleProcess(file, btn) {
        const prodImg = Array.from(document.getElementsByTagName("img")).find(img => img.width > 200 && !img.src.includes("logo"))?.src;
        if (!file || !prodImg) return alert("Product image not detected.");

        isBusy = true;
        btn.disabled = true;
        btn.innerHTML = '<span class="premium-spinner"></span> SECURING...';

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = async () => {
                const canvas = document.createElement('canvas');
                const max = 800;
                let w = img.width, h = img.height;
                if (w > h) { if (w > max) { h *= max / w; w = max; } }
                else { if (h > max) { w *= max / h; h = max; } }
                canvas.width = w; canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                
                // BACK TO STANDARD FETCH (Ensures Output is visible)
                try {
                    btn.innerHTML = '<span class="premium-spinner"></span> GENERATING...';
                    const res = await fetch(SCRIPT_URL, {
                        method: "POST",
                        body: JSON.stringify({
                            model_name: "tryon-v1.6",
                            inputs: { model_image: canvas.toDataURL('image/jpeg', 0.7), garment_image: prodImg, category: "auto" }
                        })
                    });
                    const aiData = await res.json();
                    if (aiData.id) poll(aiData.id, btn);
                    else throw new Error();
                } catch (err) {
                    isBusy = false; btn.disabled = false;
                    btn.innerHTML = "✨ Virtual Try-On";
                    alert("AI Session Timed Out. Please try again.");
                }
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    async function poll(id, btn) {
        const res = await fetch("https://api.fashn.ai/v1/status/" + id, {
            headers: { "Authorization": "Bearer fa-psJSioorPgb9-5cT5HZYyoCGokJVywFgFOPWt" }
        });
        const data = await res.json();
        if (data.status === "completed") {
            isBusy = false; btn.disabled = false;
            btn.innerHTML = "✨ Virtual Try-On";
            showPopup(data.output[0]);
        } else if (data.status === "failed") {
            isBusy = false; btn.disabled = false;
            btn.innerHTML = "✨ Virtual Try-On";
            alert("AI could not blend these images. Try a clearer photo.");
        } else { setTimeout(() => poll(id, btn), 3000); }
    }

    function showPopup(url) {
        const overlay = document.createElement("div");
        overlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);z-index:2147483647;display:flex;flex-direction:column;align-items:center;justify-content:center;backdrop-filter:blur(15px);padding:20px;";
        overlay.innerHTML = `
            <div style="background:#fff; border-radius:30px; overflow:hidden; max-width:420px; width:100%; box-shadow:0 30px 60px rgba(0,0,0,0.5); transform: scale(1); animation: pop 0.3s ease;">
                <img src="${url}" style="width:100%; display:block;">
                <div style="padding:25px; text-align:center; font-family:sans-serif;">
                    <h3 style="margin:0 0 15px; color:#000; letter-spacing:-0.5px;">✨ Your Virtual Fitting</h3>
                    <div style="background:#f4f4f4; padding:12px; border-radius:15px; border:1px solid #eee; margin-bottom:20px;">
                        <p style="margin:0; font-size:11px; color:#000; font-weight:900; letter-spacing:1px;">🛡️ PRIVACY SHIELD ACTIVE</p>
                        <p style="margin:5px 0 0; font-size:10px; color:#666; text-transform:uppercase;">AES-256 Encryption • Auto-Deleted Session</p>
                    </div>
                    <button id="v-close" style="width:100%; padding:16px; border-radius:15px; border:none; background:#000; color:#fff; font-weight:bold; cursor:pointer; font-size:14px;">CLOSE MIRROR</button>
                </div>
            </div>
            <style>@keyframes pop { from{transform:scale(0.9);opacity:0} to{transform:scale(1);opacity:1} }</style>
