(function() {
    const GOOGLE_URL = "https://script.google.com/macros/s/AKfycbycyu6r5oMc3hAemOHwJ0g3Npc6k7S1XalPatII7B95U5oaWjRtlO9Pv916VgfwT5t0/exec"; 
    const VERCEL_URL = "https://ai-fitting-labs-service-pigf.vercel.app/api"; 
    let isBusy = false;
    let lastRemaining = 5;

    // 1. PRODUCT PAGE DETECTOR
    const isProductPage = () => {
        // This looks for common product page elements (Add to Cart buttons, Prices, etc.)
        const productSelectors = [
            'button[name="add"]', 
            '.product-form', 
            '.single-product', 
            '[data-testid="add-to-cart"]',
            '.product-single__price'
        ];
        return productSelectors.some(selector => document.querySelector(selector) !== null);
    };

    const injectStyles = () => {
        if (document.getElementById("vton-styles")) return;
        const s = document.createElement("style");
        s.id = "vton-styles";
        s.innerHTML = `
            .v-spin { width:12px; height:12px; border:2px solid #fff; border-top-color:transparent; border-radius:50%; display:inline-block; animation: v-rot 0.8s linear infinite; margin-right:8px; }
            @keyframes v-rot { to {transform:rotate(360deg)} }
            .vton-container { background: #fff; width: 100%; max-width: 950px; display: flex; flex-direction: row; border-radius: 30px; overflow: hidden; box-shadow: 0 50px 100px rgba(0,0,0,0.5); font-family: sans-serif; position: relative; }
            .vton-img-side { flex: 1.4; background: #f4f4f4; line-height:0; position: relative; }
            .vton-img-side img { width: 100%; height: 100%; object-fit: cover; }
            .vton-text-side { flex: 1; padding: 50px; display: flex; flex-direction: column; justify-content: center; background: #fff; }
            #v-done { width: 100%; padding: 20px; background: #000; color: #fff; border-radius: 15px; border: none; font-weight: bold; cursor: pointer; font-size: 16px; margin-top: 30px; }
            @media (max-width: 768px) { .vton-container { flex-direction: column; max-height: 95vh; overflow-y: auto; } .vton-img-side { height: 450px; flex: none; } .vton-text-side { padding: 30px; flex: none; } }
        `;
        document.head.appendChild(s);
    };

    const createButton = () => {
        // ONLY CREATE IF IT'S A PRODUCT PAGE
        if (document.getElementById("ai-vton-btn") || !isProductPage()) return;
        
        const btn = document.createElement("button");
        btn.id = "ai-vton-btn";
        btn.innerHTML = "✨ See It On You"; 
        btn.style.cssText = "position:fixed; bottom:30px; right:30px; z-index:2147483647; padding:18px 36px; color:#fff; border-radius:50px; font-weight:bold; border:none; cursor:pointer; box-shadow:0 15px 35px rgba(0,0,0,0.4); background: linear-gradient(135deg, #000, #444); display:block !important; font-size: 15px;";
        btn.onclick = () => trigger(btn);
        document.body.appendChild(btn);
        sync(btn);
    };

    const startApp = () => {
        if (!document.body) {
            window.requestAnimationFrame(startApp);
            return;
        }
        if (isProductPage()) {
            injectStyles();
            createButton();
            // Watcher only active on product pages
            const observer = new MutationObserver(() => {
                if (!document.getElementById("ai-vton-btn") && !isBusy) createButton();
            });
            observer.observe(document.body, { childList: true });
        }
    };

    // --- (Keep your Trigger, Poll, and Sync functions the same) ---
    // Make sure Trigger uses the VERCEL Handshake you highlighted!

    function showPop(url) {
        const ov = document.createElement("div");
        ov.id = "vton-overlay";
        ov.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.95); z-index:2147483647; display:flex; align-items:center; justify-content:center; padding:20px; backdrop-filter:blur(15px);";
        ov.innerHTML = `
            <div class="vton-container">
                <div class="vton-img-side"><img src="${url}"></div>
                <div class="vton-text-side">
                    <h2 style="margin:0; font-size:28px; font-family:serif;">✨ You Look Incredible</h2>
                    <p style="color:#666; font-size:15px; margin-top:12px; line-height:1.6;">Our AI Stylist has tailored this piece perfectly to your photo.</p>
                    
                    <div style="background:#fff3cd; padding:15px; border-radius:15px; border:1px solid #ffeeba; margin-top:25px; text-align:center;">
                        <p style="margin:0; font-size:12px; color:#856404; font-weight:bold;">
                            🛍️ SHOP HONESTLY: You have <b>${lastRemaining}</b> tries left today.
                        </p>
                    </div>
                    
                    <button id="v-done">DONE</button>
                </div>
            </div>
        `;
        document.body.appendChild(ov);
        document.getElementById("v-done").onclick = () => ov.remove();
    }

    if (document.readyState === 'complete') startApp();
    else window.addEventListener('load', startApp);
})();
