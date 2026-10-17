/* Contact: optional channels from config, validated form that opens an Instagram DM with the message prefilled (copied to clipboard). */
(function () {
  "use strict";
  var C = window.TT_CONFIG, $ = function (s) { return document.querySelector(s); };

  if (C.WHATSAPP) {
    var wa = $("#chan-wa"); wa.hidden = false; wa.href = "https://wa.me/" + C.WHATSAPP.replace(/\D/g, ""); wa.target = "_blank"; wa.rel = "noopener";
    $("#wa-txt").textContent = C.WHATSAPP;
  }
  if (C.EMAIL) {
    var m = $("#chan-mail"); m.hidden = false; m.href = "mailto:" + C.EMAIL; $("#mail-txt").textContent = C.EMAIL;
  }

  var form = $("#cform"), sent = $("#sent");
  function bad(id, isBad) { document.getElementById(id).closest(".field").classList.toggle("bad", isBad); return isBad; }
  ["f-name", "f-msg"].forEach(function (id) {
    document.getElementById(id).addEventListener("input", function () { if (this.value.trim()) bad(id, false); });
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var name = $("#f-name").value.trim(), topic = $("#f-topic").value, msg = $("#f-msg").value.trim();
    var b1 = bad("f-name", !name), b2 = bad("f-msg", !msg);
    if (b1 || b2) { (b1 ? $("#f-name") : $("#f-msg")).focus(); return; }
    var text = "Hi Tohfa & Twinkle! I'm " + name + ".\nAbout: " + topic + "\n\n" + msg;
    try { navigator.clipboard && navigator.clipboard.writeText(text); } catch (err) {}
    if (C.WHATSAPP) window.open("https://wa.me/" + C.WHATSAPP.replace(/\D/g, "") + "?text=" + encodeURIComponent(text), "_blank", "noopener");
    else window.open("https://ig.me/m/" + C.INSTAGRAM, "_blank", "noopener");
    form.hidden = true; sent.classList.add("show");
  });
})();
