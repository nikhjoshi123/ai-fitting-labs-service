(function() {
    // 1. PASTE YOUR NEW GOOGLE SCRIPT URL HERE
    const SCRIPT_URL = "PASTE_YOUR_NEW_EXEC_URL_HERE"; 

    async function init() {
        try {
            const res = await fetch(SCRIPT_URL + "?url=" + encodeURIComponent(window.location.hostname));
            const data = await res.json();
            
            // If status is REMOVE or not found, stop everything
            if (data.status === "REMOVE" || data.status === "NONE") return;

            renderButton(data.canUse);
        } catch (e) { console.error("Sync Error"); }
    }

    function renderButton(canUse) {
        const btn = document.createElement("button");
        btn.id = "ai-vton-btn";
        btn.innerHTML = canUse ? "✨ Try this!" : "🔒 Service Paused";
        
        // ULTIMATE VISIBILITY CSS
        btn.style.cssText = `
            position: fixed !important;
            bottom: 20px !important;
            right: 20px !important;
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
            font-family: Arial, sans-serif;
        `;

        if (canUse) {
            btn.onclick = () => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = "image/*";
                input.onchange = async (e) => {
                    const file = e.target.files[0];
                    const prodImg = Array.from(document.getElementsByTagName("img")).find(img => img.width > 200)?.src;
                    if (!file || !prodImg) return alert("Product image not detected.");

                    btn.innerHTML = "◌ Wait...";
                    btn.disabled = true;

                    const reader = new FileReader();
                    reader.onloadend = async () => {
                        const aiRes = await fetch(SCRIPT_URL, {
                            method: "POST",
                            body: JSON.stringify({
                                model_name: "tryon-v1.6",
                                inputs: { model_image: reader.result, garment_image: prodImg, category: "auto" }
                            })
                        });
                        const aiData = await aiRes.json();
                        if (aiData.id) poll(aiData.id, btn);
                        else { alert("Error"); location.reload(); }
                    };
                    reader.readAsDataURL(file);
                };
                input.click();
            };
        }
        document.body.appendChild(btn);
    }

    async function poll(id, btn) {
        // We use a simple direct check here for status since we are in a hurry
        const res = await fetch("https://api.fashn.ai/v1/status/" + id, {
            headers: { "Authorization": "Bearer fa-psJSioorPgb9-5cT5HZYyoCGokJVywFgFOPWt" } 
        });
        const data = await res.json();
        if (data.status === "completed") {
            btn.innerHTML = "✨ Try this!";
            btn.disabled = false;
            showPopup(data.output[0]);
        } else if (data.status === "failed") {
            alert("AI Failed");
            location.reload();
        } else {
            setTimeout(() => poll(id, btn), 3000);
        }
    }

    function showPopup(url) {
        const div = document.createElement("div");
        div.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);z-index:2147483647;display:flex;flex-direction:column;align-items:center;justify-content:center;";
        div.innerHTML = <img src="${url}" style="max-height:80%; border-radius:10px;"><button onclick="this.parentElement.remove()" style="margin-top:20px;padding:10px 30px;cursor:pointer;">CLOSE</button>;
        document.body.appendChild(div);
    }

    init();
})();
