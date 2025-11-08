// ai-chatbot.js – FINAL: TYPING WORKS + LISTS SHOW
(() => {
  const API_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=AIzaSyD-3YX-v57ZWeWqQ-i-vO9P4Sz60cV5w9Y`;

  // REMOVE OLD POPUP
  document.querySelectorAll('#aiPopup, #openAI').forEach(el => el.remove());

  // INSERT NEW POPUP + BUTTON
  document.body.insertAdjacentHTML('beforeend', `
    <div id="aiPopup" class="fixed bottom-6 right-6 z-50 hidden">
      <div class="bg-gradient-to-br from-purple-700 to-cyan-600 rounded-3xl shadow-2xl p-6 w-80 border border-white/20 backdrop-blur-xl">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-xl font-bold text-white">Gemini AI</h3>
          <button id="closeAI" class="text-white text-3xl hover:scale-110">×</button>
        </div>
        <input id="aiInput" type="text" placeholder="e.g. mug cake" 
               class="w-full px-5 py-4 bg-white/10 border border-white/30 rounded-2xl text-white placeholder-white/60 focus:outline-none focus:border-cyan-400"
               autocomplete="off">
        <button id="aiBtn" class="mt-4 w-full py-4 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-2xl font-bold text-white hover:scale-105 shadow-lg">
          Create List
        </button>
        <div id="aiStatus" class="mt-3 text-center text-white/80 text-sm h-6"></div>
      </div>
    </div>

    <button id="openAI" class="fixed bottom-6 right-6 z-40 w-16 h-16 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition text-3xl text-white font-bold">
      AI
    </button>
  `);

  const $ = s => document.querySelector(s);

  // OPEN POPUP + FOCUS
  $('#openAI').onclick = () => {
    $('#aiPopup').classList.remove('hidden');
    setTimeout(() => $('#aiInput').focus(), 100);
  };

  $('#closeAI').onclick = () => $('#aiPopup').classList.add('hidden');

  // PREVENT CLICK OUTSIDE CLOSE
  $('#aiPopup').onclick = e => e.stopPropagation();

  // CREATE LIST
  $('#aiBtn').onclick = async () => {
    const topic = $('#aiInput').value.trim();
    if (!topic) return $('#aiStatus').textContent = "Type something!";

    $('#aiStatus').textContent = "Gemini is thinking...";
    $('#aiBtn').disabled = true;

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: `${topic} make a list of materials required to make this thing/ give steps to complete this in 2 or 3 words.` }] }],
          generationConfig: { temperature: 0.7 }
        })
      });

      if (!res.ok) throw new Error("API failed");

      const data = await res.json();
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "1. Done";

      const items = reply.split('\n')
        .map(l => l.replace(/^\d+[\.\)]\s*/, "").trim())
        .filter(Boolean);

      const newList = {
        id: "ai_" + Date.now(),
        title: topic,
        items: items.map(t => ({ text: t, done: false })),
        aiGenerated: true
      };

      // ADD TO LISTS
      if (!window.lists) window.lists = [];
      window.lists.unshift(newList);
      window.currentList = newList;

      // SAVE + REFRESH
      if (window.saveToFirebase) await window.saveToFirebase();
      if (window.renderLists) window.renderLists();
      if (window.openList) window.openList(newList.id);

      // GO TO LISTS TAB
      if (document.getElementById('listsBtn')) {
        document.getElementById('listsBtn').click();
      }

      $('#aiStatus').textContent = `List "${topic}" created!`;
      $('#aiInput').value = "";
      setTimeout(() => {
        $('#aiPopup').classList.add('hidden');
        $('#aiStatus').textContent = "";
      }, 2000);

    } catch (e) {
      $('#aiStatus').textContent = "Try again!";
      console.error(e);
    } finally {
      $('#aiBtn').disabled = false;
    }
  };

  // ENTER = CREATE
  $('#aiInput').onkeydown = e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      $('#aiBtn').click();
    }
  };

  // AUTO-FOCUS WHEN TYPING
  document.addEventListener('keydown', () => {
    if (!$('#aiPopup').classList.contains('hidden')) {
      $('#aiInput').focus();
    }
  });
})();