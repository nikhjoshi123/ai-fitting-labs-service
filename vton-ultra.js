(function() {
    const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbycyu6r5oMc3hAemOHwJ0g3Npc6k7S1XalPatII7B95U5oaWjRtlO9Pv916VgfwT5t0/exec"; 
    
    // 1. THE EMERGENCY LOGGER: If this script runs at all, you will see a message in the console
    console.log("🚀 AI FITTING LABS: ENGINE STARTING...");

    async function initializeMirror() {
        if (document.getElementById("vton-shadow-root")) return;

        try {
            // Added Cache Buster and Origin check
            const res = await fetch(${SCRIPT_URL}?url=${encodeURIComponent(window.location.hostname)}&t=${Date.now()}, {
                mode: 'cors',
                headers: { 'Accept': 'application/json' }
            });
            const data = await res.json();
            
            if (data.status === "REMOVE") return;

            // 2. THE SHADOW DOM: This creates a "Private Room" for our button that React cannot enter
            const host = document.createElement("div");
            host.id = "vton-shadow-root";
            document.documentElement.appendChild(host);
            const shadow = host.attachShadow({mode: 'open'});

            const btn = document.createElement("button");
            btn.innerHTML = (data.status === "EXPIRE") ? "🔒 Mirror Paused" : "✨ Virtual Try-On";
            
            // Premium Styles inside the Shadow
            const styles = document.createElement("style");
            styles.textContent = `
                button {
                    position: fixed !important; bottom: 30px !important; right: 30px !important;
                    z-index: 2147483647 !important; padding: 18px 36px !important;
                    background: ${data.status === 'ACTIVE' ? 'linear-gradient(135deg, #000 0%, #333 100%)' : '#666'} !important;
                    color: #fff !important; border-radius: 60px !important; font-weight: 800 !important;
                    border: 2px solid rgba(255,255,255,0.2) !important; cursor: pointer !important;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.6) !important; font-family: sans-serif !important;
                    text-transform: uppercase !important; letter-spacing: 1px !important;
                    transition: transform 0.2s ease !important;
                }
                button:active { transform: scale(0.95); }
            `;

            btn.onclick = () => {
                if (data.status === "EXPIRE") return alert("Subscription Paused.");
                handleAction(btn);
            };

            shadow.appendChild(styles);
            shadow.appendChild(btn);
            console.log("✅ AI FITTING LABS: BUTTON INJECTED VIA SHADOW DOM");

        } catch (e) {
            console.error("❌ AI FITTING LABS: BLOCKED BY BROWSER OR GOOGLE", e);
        }
    }

    async function handleAction(btn) {
        const input = document.createElement("input");
        input.type = "file"; input.accept = "image/*";
        input.onchange = async (e) => {
            const file = e.target.files[0];
            const prodImg = Array.from(document.querySelectorAll('img')).find(img => img.width > 200)?.src;
            if (!file || !prodImg) return alert("Product not found.");

            btn.innerHTML = "⌛ SECURING...";
            const reader = new FileReader();
            reader.onloadend = async () => {
                const res = await fetch(SCRIPT_URL, {
                    method: "POST",
                    body: JSON.stringify({
                        model_name: "tryon-v1.6",
                        inputs: { model_image: reader.result, garment_image: prodImg, category: "auto" }
                    })
                });
                const aiData = await res.json();
                if (aiData.id) poll(aiData.id, btn);
            };
            reader.readAsDataURL(file);
        };
        input.click();
    }

    async function poll(id, btn) {
        const res = await fetch("https://api.fashn.ai/v1/status/" + id, {
            headers: { "Authorization": "Bearer fa-psJSioorPgb9-5cT5HZYyoCGokJVywFgFOPWt" }
        });
        const data = await res.json();
        if (data.status === "completed") {
            btn.innerHTML = "✨ Virtual Try-On";
            window.open(data.output[0], '_blank'); // Open in new tab for premium feel/bypass popup blockers
        } else { setTimeout(() => poll(id, btn), 3000); }
    }

    // Force run every 2 seconds to beat the framework
    setInterval(initializeMirror, 2000);
    initializeMirror();
})();
