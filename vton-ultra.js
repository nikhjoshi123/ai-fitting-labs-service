function showFancyPop(url) {
    var d = document.createElement("div");
    d.id = "vton-overlay";
    // Using a flex-column for mobile that switches to flex-row for desktop
    d.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); z-index:2147483647; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(15px); animation: fadeIn 0.4s ease; padding:20px; box-sizing:border-box;";
    
    d.innerHTML = `
        <div class="popup-container">
            <div class="popup-image-side">
                <img src="${url}" id="vton-result-img">
                <div class="preview-badge">AI PREVIEW</div>
            </div>

            <div class="popup-text-side">
                <div class="text-content">
                    <h2 class="title">✨ Your Signature Look</h2>
                    <p class="subtitle">Our AI Stylist has tailored this piece specifically for your silhouette.</p>
                    
                    <div class="luxury-box">
                        <p class="box-title">🛡️ EXCLUSIVE PRIVACY</p>
                        <p class="box-text">Your image is secure and <b>never stored</b> on our servers. We value your privacy as much as your style.</p>
                    </div>

                    <button id="close-fancy">DONE</button>
                </div>
            </div>
        </div>

        <style>
            @keyframes fadeIn { from{opacity:0} to{opacity:1} }
            @keyframes slideUp { from{transform:translateY(30px);opacity:0} to{transform:translateY(0);opacity:1} }
            
            .popup-container {
                background: #fff;
                width: 100%;
                max-width: 950px; /* Large for Desktop */
                height: auto;
                max-height: 90vh;
                display: flex;
                flex-direction: row; /* Side-by-side */
                border-radius: 40px;
                overflow: hidden;
                box-shadow: 0 50px 100px rgba(0,0,0,0.8);
                animation: slideUp 0.5s ease forwards;
            }

            .popup-image-side {
                flex: 1.4; /* Larger Image */
                position: relative;
                background: #f4f4f4;
                display: flex;
                align-items: center;
                justify-content: center;
                overflow: hidden;
            }

            #vton-result-img {
                width: 100%;
                height: 100%;
                object-fit: contain;
            }

            .preview-badge {
                position: absolute; top: 20px; left: 20px;
                background: rgba(255,255,255,0.8);
                padding: 6px 15px; border-radius: 50px;
                font-size: 10px; font-weight: 800; letter-spacing: 1px; color: #000;
            }

            .popup-text-side {
                flex: 1;
                padding: 50px;
                display: flex;
                flex-direction: column;
                justify-content: center;
                background: #fff;
            }

            .title { margin: 0 0 15px; font-size: 28px; font-family: serif; color: #111; }
            .subtitle { margin: 0 0 40px; font-size: 15px; color: #666; line-height: 1.6; }

            .luxury-box {
                background: #fafafa;
                padding: 25px;
                border-radius: 25px;
                border: 1px solid #eee;
                margin-bottom: 40px;
            }

            .box-title { margin: 0 0 8px; font-size: 11px; font-weight: 900; color: #000; letter-spacing: 1.5px; }
            .box-text { margin: 0; font-size: 12px; color: #888; line-height: 1.5; }

            #close-fancy {
                width: 100%; padding: 20px; background: #000; color: #fff;
                border-radius: 20px; border: none; font-weight: bold; cursor: pointer;
                transition: 0.3s; font-size: 16px;
            }
            #close-fancy:hover { background: #333; transform: scale(1.02); }

            /* MOBILE RESPONSIVE: Stack the layout */
            @media (max-width: 768px) {
                .popup-container { flex-direction: column; max-height: 95vh; overflow-y: auto; }
                .popup-image-side { height: 450px; flex: none; }
                .popup-text-side { padding: 30px; flex: none; }
                .title { font-size: 22px; }
            }
        </style>
    `;
    document.body.appendChild(d);
    document.getElementById("close-fancy").onclick = function() { d.remove(); };
}
