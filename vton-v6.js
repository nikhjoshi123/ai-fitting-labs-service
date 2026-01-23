(function() {
    const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwFONKsCMEb6rAYt_xewl52PHWUHsUiCds9pxAGs2noWhCUQCgmzsJ6-e-7zYshwOvV/exec"; 

    // 1. FORCE RENDER (No Sheet Check for 1st test)
    function forceRender() {
        if (document.getElementById("ai-vton-btn")) return;
        
        const btn = document.createElement("button");
        btn.id = "ai-vton-btn";
        btn.innerHTML = "✨ Virtual Try-On";
        btn.style.cssText = "position:fixed; bottom:30px; right:30px; z-index:9999999; padding:15px 28px; color:#fff; border-radius:50px; font-weight:bold; border:none; box-shadow:0 10px 40px rgba(0,0,0,0.4); cursor:pointer; background: linear-gradient(135deg, #000 0%, #333 100%); display:block !important;";
        
        btn.onclick = function() {
            const input = document.createElement("input");
            input.type = "file"; input.accept = "image/*";
            input.onchange = (e) => handleUpload(e.target.files[0], btn);
            input.click();
        };
        document.body.appendChild(btn);
    }

    async function handleUpload(file, btn) {
        const images = Array.from(document.getElementsByTagName("img"));
        const prodImg = images.find(img => img.width > 200)?.src;
        
        if (!file || !prodImg) return alert("Error: Product image not detected.");

        btn.innerHTML = <span class="v-spin"></span> <span id="v-msg">🛡️ Privacy Shield...</span>;
        
        const reader = new FileReader();
        reader.onloadend = async function() {
            const res = await fetch(SCRIPT_URL, {
                method: "POST",
                body: JSON.stringify({
                    model_name: "tryon-v1.6",
                    inputs: { model_image: reader.result, garment_image: prodImg, category: "auto" }
                })
            });
            const aiData = await res.json();
            if (aiData.id) poll(aiData.id, btn);
            else { btn.innerHTML = "✨ Virtual Try-On"; alert("AI Error"); }
        };
        reader.readAsDataURL(file);
    }

    async function poll(id, btn) {
        const res = await fetch("https://api.fashn.ai/v1/status/" + id, {
            headers: { "Authorization": "Bearer fa-psJSioorPgb9-5cT5HZYyoCGokJVywFgFOPWt" } 
        });
        const data = await res.json();
        if (data.status === "completed") {
            btn.innerHTML = "✨ Virtual Try-On";
            showPopup(data.output[0]);
        } else {
            setTimeout(() => poll(id, btn), 3000);
        }
    }

    function showPopup(url) {
        const div = document.createElement("div");
        div.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); z-index:10000001; display:flex; flex-direction:column; align-items:center; justify-content:center;";
        div.innerHTML = <img src="${url}" style="max-height:80%; border-radius:15px;"><button onclick="this.parentElement.remove()" style="margin-top:20px; padding:10px 40px; border-radius:50px; cursor:pointer;">CLOSE</button>;
        document.body.appendChild(div);
    }

    const s = document.createElement("style");
    s.innerHTML = .v-spin { width:14px; height:14px; border:2px solid #fff; border-bottom-color:transparent; border-radius:50%; display:inline-block; animation: v-rot 1s linear infinite; vertical-align:middle; } @keyframes v-rot { 0% {transform:rotate(0deg)} 100% {transform:rotate(360deg)} };
    document.head.appendChild(s);

    // Run immediately
    if (document.readyState === 'complete') forceRender();
    else window.addEventListener('load', forceRender);
})();
