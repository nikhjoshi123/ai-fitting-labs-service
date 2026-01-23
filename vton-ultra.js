(function() {
    // PASTE YOUR NEW GOOGLE SCRIPT URL BELOW
    const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyCg7QKxQ1KkW7BD4feF-v5BGYnwtz3UP4yxAjH2gxyIXi7tZNMbGxemFVzj4gZVxkL/exec"; 
    let isBusy = false;

    async function sync() {
        if (isBusy) return;
        try {
            const res = await fetch(SCRIPT_URL + "?url=" + encodeURIComponent(window.location.hostname) + "&cb=" + Date.now());
            const data = await res.json();
            
            let btn = document.getElementById("ai-vton-btn");
            if (data.status === "ACTIVE") {
                if (!btn) {
                    btn = document.createElement("button");
                    btn.id = "ai-vton-btn";
                    btn.style.cssText = "position:fixed; bottom:30px; right:30px; z-index:2147483647; padding:16px 32px; background:linear-gradient(135deg, #000, #444); color:#fff; border-radius:50px; border:none; font-weight:bold; cursor:pointer; box-shadow:0 10px 30px rgba(0,0,0,0.5); font-family:sans-serif; display:block !important;";
                    btn.onclick = () => openUpload(btn);
                    document.body.appendChild(btn);
                }
                btn.innerHTML = "✨ Virtual Try-On";
            } else if (data.status === "PAUSE" || data.status === "EXPIRE") {
                if (btn) btn.innerHTML = "🔒 Mirror Paused";
            } else {
                if (btn) btn.remove();
            }
        } catch (e) { console.log("Sync Error"); }
    }

    function openUpload(btn) {
        const input = document.createElement("input");
        input.type = "file"; input.accept = "image/*";
        input.onchange = (e) => handleUpload(e.target.files[0], btn);
        input.click();
    }

    async function handleUpload(file, btn) {
        const prodImg = Array.from(document.querySelectorAll("img")).find(i => i.width > 200 && !i.src.includes("logo"))?.src;
        if (!file || !prodImg) return alert("Select a product first.");

        isBusy = true;
        btn.disabled = true;
        btn.innerHTML = '<span class="v-spin"></span> SECURING...';

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const res = await fetch(SCRIPT_URL, {
                    method: "POST",
                    body: JSON.stringify({
                        inputs: { model_image: e.target.result, garment_image: prodImg, category: "auto" }
                    })
                });
                const aiData = await res.json();
                if (aiData.id) poll(aiData.id, btn);
                else throw new Error();
            } catch (err) {
                isBusy = false; btn.disabled = false; btn.innerHTML = "✨ Virtual Try-On";
                alert("Connection lost. Try again.");
            }
        };
        reader.readAsDataURL(file);
    }

    async function poll(id, btn) {
        const res = await fetch("https://api.fashn.ai/v1/status/" + id, {
            headers: { "Authorization": "Bearer fa-psJSioorPgb9-5cT5HZYyoCGokJVywFgFOPWt" }
        });
        const data = await res.json();
        if (data.status === "completed") {
            isBusy = false; btn.disabled = false; btn.innerHTML = "✨ Virtual Try-On";
            showResult(data.output[0]);
        } else { setTimeout(() => poll(id, btn), 3000); }
    }

    function showResult(url) {
        const d = document.createElement("div");
        d.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);z-index:2147483647;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;";
        d.innerHTML = <img src="${url}" style="max-height:70%; border-radius:20px; box-shadow:0 0 50px #000;"><p style="color:#fff; margin-top:20px; font-family:sans-serif;">🛡️ PRIVACY VERIFIED • DATA DELETED</p><button onclick="this.parentElement.remove()" style="margin-top:20px; padding:10px 40px; border-radius:50px; cursor:pointer; font-weight:bold;">CLOSE</button>;
        document.body.appendChild(d);
    }

    const s = document.createElement("style");
    s.innerHTML = ".v-spin { width:12px; height:12px; border:2px solid #fff; border-top-color:transparent; border-radius:50%; display:inline-block; animation: v-rot 0.8s linear infinite; margin-right:8px; } @keyframes v-rot { to {transform:rotate(360deg)} }";
    document.head.appendChild(s);

    sync();
    setInterval(sync, 5000); // Heartbeat every 5 seconds
})();
