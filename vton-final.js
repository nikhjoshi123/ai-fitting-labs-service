(function() {
    // 1. UPDATE WITH YOUR LATEST GOOGLE EXEC URL
    const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyhoksFBtihKuSdgMKmvbv7KTiwr0nonj8pfUT3Qun4_f2Vzq6Jrm86neM1tl_vRes/exec"; 

    async function checkAndRender() {
        try {
            const res = await fetch(SCRIPT_URL + "?url=" + encodeURIComponent(window.location.hostname));
            const data = await res.json();
            
            // IF REMOVE: Kill the button if it exists and STOP.
            if (data.status === "REMOVE") {
                const oldBtn = document.getElementById("ai-vton-btn");
                if (oldBtn) oldBtn.remove();
                return; 
            }

            // IF ACTIVE/EXPIRED: Create button
            if (data.status === "ACTIVE" || data.status === "EXPIRED") {
                renderButton(data.canUse);
            }
        } catch (e) { console.log("AI Fitting Labs: Syncing..."); }
    }

    function renderButton(canUse) {
        if (document.getElementById("ai-vton-btn")) return; // Don't double create

        const btn = document.createElement("button");
        btn.id = "ai-vton-btn";
        btn.innerHTML = canUse ? "✨ Try this!" : "🔒 Service Paused";
        
        // ULTIMATE MOBILE & DESKTOP CSS
        btn.style.cssText = `
            position: fixed !important;
            bottom: 30px !important;
            right: 30px !important;
            z-index: 9999999 !important;
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
        `;

        btn.onclick = () => {
            if (!canUse) return alert("Service Paused. Contact info@aifittinglabs.store");
            // Your upload logic here...
            alert("Privacy Note: Photos are deleted immediately. Proceeding to camera...");
            // trigger file input...
        };

        document.body.appendChild(btn);
    }

    // THIS IS THE KEY FOR REACT/VITE SITES:
    // It waits for the page to finish loading before checking the sheet
    if (document.readyState === 'complete') {
        checkAndRender();
    } else {
        window.addEventListener('load', checkAndRender);
    }

    // Check again every 5 seconds for the "REMOVE" signal
    setInterval(checkAndRender, 5000);
})();
