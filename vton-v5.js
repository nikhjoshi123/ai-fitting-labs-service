(function() {
    // 1. YOUR GOOGLE SCRIPT URL
    const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbycyu6r5oMc3hAemOHwJ0g3Npc6k7S1XalPatII7B95U5oaWjRtlO9Pv916VgfwT5t0/exec"; 

    async function checkStatus() {
        try {
            const url = SCRIPT_URL + "?url=" + encodeURIComponent(window.location.hostname) + "&cb=" + Math.random();
            const res = await fetch(url);
            const data = await res.json();
            
            console.log("AI Labs Sync:", data.status);

            if (data.status === "REMOVE" || data.status === "NONE") {
                if (document.getElementById("ai-vton-btn")) {
                    document.getElementById("ai-vton-btn").remove();
                }
                return;
            }
            renderButton(data.canUse, data.status);
        } catch (e) { 
            console.log("Sync failed"); 
        }
    }

    function renderButton(canUse, status) {
        if (document.getElementById("ai-vton-btn")) {
            const btn = document.getElementById("ai-vton-btn");
            btn.innerText = (status === "EXPIRE" || !canUse) ? "🔒 Paused" : "✨ Try on";
            btn.style.background = (status === "EXPIRE" || !canUse) ? "#666" : "#000";
            return;
        }

        const btn = document.createElement("button");
        btn.id = "ai-vton-btn";
        btn.innerText = (status === "EXPIRE" || !canUse) ? "🔒 Paused" : "✨ Try on";
        btn.style.cssText = "position:fixed; bottom:30px; right:30px; z-index:9999999; padding:15px 25px; color:#fff; border-radius:50px; font-weight:bold; border:none; box-shadow:0 10px 30px rgba(0,0,0,0.5); cursor:pointer; background:#000;";
        
        btn.onclick = function() {
            if (btn.innerText.includes("🔒")) {
                alert("Subscription Paused.");
                return;
            }
            const input = document.createElement("input");
            input.type = "file";
            input.accept = "image/*";
            input.onchange = function(e) {
                handleUpload(e.target.files[0], btn);
            };
            input.click();
        };

        document.body.appendChild(btn);
    }

    async function handleUpload(file, btn) {
        const prodImg = Array.from(document.getElementsByTagName("img")).find(img => img.width > 200);
        if (!file || !prodImg) return alert("Product image not found.");

        btn.innerHTML = "<span>⌛</span> Shielding Privacy...";
        
        const reader = new FileReader();
        reader.onloadend = async function() {
            const res = await fetch(SCRIPT_URL, {
                method: "POST",
                body: JSON.stringify({
                    model_name: "tryon-v1.6",
                    inputs: { model_image: reader.result, garment_image: prodImg.src, category: "auto" }
                })
            });
            const aiData = await res.json();
            if (aiData.id) {
                startPolling(aiData.id, btn);
            } else {
                btn.innerText = "✨ Try on";
            }
        };
        reader.readAsDataURL(file);
    }

    async function startPolling(id, btn) {
        const res = await fetch("https://api.fashn.ai/v1/status/" + id, {
            headers: { "Authorization": "Bearer fa-psJSioorPgb9-5cT5HZYyoCGokJVywFgFOPWt" } 
        });
        const data = await res.json();
        if (data.status === "completed") {
            btn.innerText = "✨ Try on";
            showResult(data.output[0]);
        } else if (data.status === "failed") {
            btn.innerText = "✨ Try on";
            alert("AI Error");
        } else {
            setTimeout(function() { startPolling(id, btn); }, 3000);
        }
    }

    function showResult(url) {
        const div = document.createElement("div");
        div.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);z-index:9999999;display:flex;flex-direction:column;align-items:center;justify-content:center;";
        div.innerHTML = "<img src='" + url + "' style='max-height:80%; border-radius:10px;'><button onclick='this.parentElement.remove()' style='margin-top:20px;padding:10px 30px;'>CLOSE</button>";
        document.body.appendChild(div);
    }

    checkStatus();
    setInterval(checkStatus, 10000);
})();
