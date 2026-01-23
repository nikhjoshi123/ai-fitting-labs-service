(function() {
    const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyhoksFBtihKuSdgMKmvbv7KTiwr0nonj8pfUT3Qun4_f2Vzq6Jrm86neM1tl_vRes/exec"; 

    async function init() {
        console.log("AI Fitting Labs: Initializing...");
        try {
            const res = await fetch(SCRIPT_URL + "?url=" + encodeURIComponent(window.location.hostname));
            const data = await res.json();
            console.log("AI Fitting Labs: Status received ->", data.status);

            if (data.status === "REMOVE") return;

            renderButton(data.canUse);
        } catch (e) { 
            console.error("AI Fitting Labs: Connection failed", e); 
        }
    }

    function renderButton(canUse) {
        if (document.getElementById("ai-vton-btn")) return;

        const btn = document.createElement("button");
        btn.id = "ai-vton-btn";
        btn.innerHTML = canUse ? "✨ Try this!" : "🔒 Service Paused";
        
        btn.style.cssText = `
            position: fixed !important;
            bottom: 30px !important;
            right: 30px !important;
            z-index: 2147483647 !important;
            padding: 15px 25px;
            background: ${canUse ? '#000' : '#666'};
            color: #fff;
            border-radius: 50px;
            font-weight: bold;
            border: none;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
            cursor: pointer;
            display: block !important;
            font-family: sans-serif !important;
            -webkit-appearance: none;
        `;

        btn.onclick = () => {
            if (!canUse) return alert("Service Paused. Contact info@aifittinglabs.store");
            
            const consent = confirm("🛡️ PRIVACY PROTECTED\n\nYour photo is processed securely and deleted immediately. We do not store your data.\n\nDo you want to proceed?");
            if (consent) {
                // Trigger file upload logic here
                alert("Opening Camera/Gallery...");
            }
        };

        document.body.appendChild(btn);
    }

    if (document.readyState === 'complete') { init(); } 
    else { window.addEventListener('load', init); }
})();
