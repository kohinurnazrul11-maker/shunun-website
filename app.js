const textArea = document.getElementById("sourceText");
const charCount = document.getElementById("charCount");
const generateBtn = document.getElementById("generateBtn");
const buttonText = document.getElementById("buttonText");
const statusBox = document.getElementById("status");
const playerCard = document.getElementById("playerCard");
const audioPlayer = document.getElementById("audioPlayer");
const language = document.getElementById("language");
const voice = document.getElementById("voice");
let audioUrl = null;

const bnDigits = n => String(n).replace(/\d/g, d => "০১২৩৪৫৬৭৮৯"[Number(d)]);
textArea.addEventListener("input", () => {
  charCount.textContent = `${bnDigits(textArea.value.length)} / ১২,০০০ অক্ষর`;
});
document.getElementById("clearBtn").addEventListener("click", () => {
  textArea.value = "";
  textArea.dispatchEvent(new Event("input"));
  textArea.focus();
});
document.getElementById("newBtn").addEventListener("click", () => {
  playerCard.classList.add("hidden");
  textArea.focus();
  window.scrollTo({ top: 0, behavior: "smooth" });
});
document.getElementById("downloadBtn").addEventListener("click", () => {
  if (!audioUrl) return;
  const a = document.createElement("a");
  a.href = audioUrl;
  a.download = "shunun-audio.mp3";
  a.click();
});

generateBtn.addEventListener("click", async () => {
  const text = textArea.value.trim();
  statusBox.classList.remove("error");
  if (!text) {
    statusBox.textContent = "আগে যে লেখাটি শুনতে চান সেটি পেস্ট করুন।";
    statusBox.classList.add("error");
    textArea.focus();
    return;
  }
  generateBtn.disabled = true;
  buttonText.textContent = "অডিও তৈরি হচ্ছে...";
  statusBox.textContent = "আপনার লেখার অডিও তৈরি হচ্ছে। একটু অপেক্ষা করুন…";
  playerCard.classList.add("hidden");

  try {
    const response = await fetch("/api/speech", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, language: language.value, voice: voice.value })
    });
    if (!response.ok) {
      let message = "অডিও তৈরি করা যায়নি। আবার চেষ্টা করুন।";
      try { message = (await response.json()).error || message; } catch {}
      throw new Error(message);
    }
    const blob = await response.blob();
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    audioUrl = URL.createObjectURL(blob);
    audioPlayer.src = audioUrl;
    playerCard.classList.remove("hidden");
    statusBox.textContent = "অডিও তৈরি হয়েছে। নিচে Play চাপুন।";
    playerCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
    try { await audioPlayer.play(); } catch {}
  } catch (err) {
    statusBox.textContent = err.message || "সংযোগে সমস্যা হয়েছে।";
    statusBox.classList.add("error");
  } finally {
    generateBtn.disabled = false;
    buttonText.textContent = "আবার পড়ে শোনান";
  }
});