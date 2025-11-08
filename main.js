(() => {
  // YOUR PERFECT FIREBASE CONFIG
  const firebaseConfig = {
    apiKey: "AIzaSyC4NhgL-O7qxR5_MNh01_2G1kt0C7CEAhc",
    authDomain: "listora-7548c.firebaseapp.com",
    projectId: "listora-7548c",
    storageBucket: "listora-7548c.firebasestorage.app",
    messagingSenderId: "819578298903",
    appId: "1:819578298903:web:85fb730ba00e332092b252",
    measurementId: "G-RF4KB9QER8"
  };

  firebase.initializeApp(firebaseConfig);
  const db = firebase.firestore();
  const auth = firebase.auth();

  const storage = firebase.storage();
const storageRef = storage.ref();

  // DEFAULTS (FIXED: soundFile is short & safe)
  const defaults = {
    bgMode: "gradient",
    colors: ["#7b2ff7","#0ea5f9","#ff4da6","#ffd1ea"],
    gradSpeed: 12,
    overlayDark: false,
    musicEnabled: false,
    musicFile: null,
    musicVolume: 0.6,
    memesEnabled: false,
    memes: [],
    bgFile: null,
    soundEnabled: true,
    soundFile: "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=" // tiny 0.1s silent beep
  };

  // === USER STATE ===
  let currentUser = null;
  let userDocRef = null;

  // In-memory data (no LocalStorage)
  let lists = [];
  let settings = { ...defaults };

  // === AUTH STATE LISTENER ===
  auth.onAuthStateChanged(user => {
    currentUser = user;
    if (user) {
      userDocRef = db.collection("users").doc(user.uid);
      loadFromFirebase();
      showUI("logged-in");
    } else {
      userDocRef = null;
      // For guests: in-memory only, no persistence
      lists = [];
      settings = { ...defaults };
      reloadApp();
      showUI("logged-out");
    }
  });

  // === LOAD / SAVE FUNCTIONS ===
  function loadFromFirebase() {
    userDocRef.get().then(doc => {
      if (doc.exists) {
  const data = doc.data();
  lists = data.lists || [];
  settings = data.settings || { ...defaults };

  const user = auth.currentUser;
  if (data.photoURL && user) {
    user.updateProfile({ photoURL: data.photoURL }).catch(() => {});
  }
} else {
        // First time: create doc with defaults
        lists = [];   
        settings = { ...defaults };
        saveToFirebase();
      }
      reloadApp();
    });
  }

 function saveToFirebase() {
  if (!currentUser) return;
  const user = auth.currentUser;
  userDocRef.set({
    lists,
    settings,
    displayName: user.displayName,
    photoURL: user.photoURL,
    email: user.email
  }, { merge: true });
}

 function reloadApp() {
  initListoraApp();
  renderLists();        // ← ADDED
  if (window.lists?.length > 0) {
    openList(window.lists[0].id);  // ← ADDED: open first list
  }
}
// === RENDER LISTS TO SCREEN ===
window.renderLists = () => {
  const container = document.getElementById('listsContainer');
  if (!container) return;

  container.innerHTML = window.lists.map(list => `
    <div class="card-glass p-5 rounded-2xl cursor-pointer hover:scale-105 transition" onclick="openList('${list.id}')">
      <h3 class="text-xl font-bold text-white mb-2">${list.title}</h3>
      <p class="text-white/70 text-sm">${list.items.length} tasks</p>
      ${list.aiGenerated ? '<span class="text-cyan-400 text-xs">AI</span>' : ''}
    </div>
  `).join('');

  // Auto-open last AI list
  if (window.justCreatedList) {
    openList(window.justCreatedList);
    window.justCreatedList = null;
  }
};
  // === LOGIN FUNCTIONS ===
  window.googleLogin = () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider);
  };

  window.emailLogin = () => {
    const email = prompt("Email:");
    const pass = prompt("Password:");
    if (email && pass) auth.signInWithEmailAndPassword(email, pass);
  };

  window.signUp = () => {
    const email = prompt("Email:");
    const pass = prompt("Password (6+ chars):");
    if (email && pass) auth.createUserWithEmailAndPassword(email, pass);
  };

  window.logout = () => auth.signOut();

  // === UI TOGGLE ===
  function showUI(state) {
    document.body.dataset.user = state;
  }

  // YOUR EXISTING APP CODE STARTS HERE
  function initListoraApp() {
    let currentList = null;

    const $  = s => document.querySelector(s);
    const $$ = s => Array.from(document.querySelectorAll(s));

    const show = view => {
      ["homeView","appView","settingsView"].forEach(id => $("#"+id).classList.add("hidden"));
      $("#"+view+"View").classList.remove("hidden");
    };

   const applyGradient = () => {
  const g = settings.colors;
  [1,2,3,4].forEach(i => document.documentElement.style.setProperty(`--g${i}`, g[i-1]));
  document.documentElement.style.setProperty("--grad-speed", settings.gradSpeed + "s");

  // FORCE RE-APPLY ANIMATION (this is the key fix!)
  const el = $("#bgGradient");
  el.style.animation = 'none';
  el.offsetHeight; // Trigger reflow
  el.style.animation = `gradientFlow ${settings.gradSpeed}s ease infinite`;
};

  const updateBackground = () => {
    const bgG = $("#bgGradient"), bgImg = $("#bgImage"), bgVid = $("#bgVideo");
    [bgG, bgImg, bgVid].forEach(el => el.classList.add("hidden"));

    $("#titleGradient").style.background = `linear-gradient(90deg,${settings.colors.join(",")})`;
    $("#titleGradient").style.webkitBackgroundClip = "text";
    $("#titleGradient").style.webkitTextFillColor = "transparent";

    if (settings.bgMode === "gradient") {
      bgG.classList.remove("hidden");
      applyGradient();
    } else if (settings.bgMode === "image" && settings.bgFile) {
      bgImg.src = settings.bgFile;
      bgImg.classList.remove("hidden");
    } else if (settings.bgMode === "video" && settings.bgFile) {
      bgVid.src = settings.bgFile;
      bgVid.classList.remove("hidden");
    } else if (settings.bgMode === "youtube" && settings.bgFile) {
      const id = youtubeId(settings.bgFile);
      if (id) {
        bgVid.src = `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}&controls=0&rel=0&modestbranding=1`;
        bgVid.classList.remove("hidden");
      }
    }
  };

  const youtubeId = url => {
    const m = url.match(/[?&]v=([^&#]+)/) || url.match(/youtu\.be\/([^?]+)/) || url.match(/youtube\.com\/embed\/([^?]+)/);
    return m ? m[1] : (url.length === 11 ? url : null);
  };

  const updateBgControls = () => {
    const mode = settings.bgMode;
    $("#gradientControls").classList.toggle("hidden", mode !== "gradient");
    $("#fileControls").classList.toggle("hidden", !["image","video"].includes(mode));
    $("#youtubeControls").classList.toggle("hidden", mode !== "youtube");
    $("#bgFile").accept = mode === "image" ? "image/*" : "video/*";
  };

  const renderLists = () => {
    const cont = $("#listsContainer"); cont.innerHTML = "";
    lists.forEach(l => {
      const div = document.createElement("div");
      div.className = "list-item " + (currentList && currentList.id === l.id ? "bg-white/15" : "");
      div.innerHTML = `
        <span>${l.title || "Untitled"}</span>
        <div class="flex gap-2">
          <button class="rename text-blue-400 text-sm" data-id="${l.id}">Edit</button>
          <button class="delete text-red-400 text-sm" data-id="${l.id}">Del</button>
        </div>`;
      div.onclick = e => { if (!e.target.closest("button")) openList(l.id); };
      cont.appendChild(div);
    });

    $$(".rename").forEach(b => b.onclick = e => {
      e.stopPropagation();
      const list = lists.find(x => x.id === b.dataset.id);
      const name = prompt("Rename list", list.title);
      if (name !== null && name.trim()) {
        list.title = name.trim();
        saveToFirebase();
        renderLists();
        if (currentList?.id === list.id) $("#listTitle").value = name;
      }
    });

 $$(".delete").forEach(b => b.onclick = e => {
  e.stopPropagation();

  const listId = b.dataset.id;
  const modal = $("#deleteListModal");
  const confirmBtn = $("#confirmDeleteBtn");
  const cancelBtn = $("#cancelDeleteBtn");
  const closeBtn = $("#closeDeleteModal");

  // Show modal
  modal.classList.remove("hidden");

  // Confirm delete
  const doDelete = () => {
    lists = lists.filter(x => x.id !== listId);
    saveToFirebase();
    renderLists();
    if (currentList?.id === listId) {
      currentList = lists[0] || null;
      currentList ? openList(currentList.id) : clearList();
    }
    modal.classList.add("hidden");
    overlay(["List deleted!"]);
  };

  // Button actions
  confirmBtn.onclick = doDelete;
  cancelBtn.onclick = closeBtn.onclick = () => modal.classList.add("hidden");

  // Close on backdrop click
  modal.onclick = ev => {
    if (ev.target === modal) modal.classList.add("hidden");
  };
});
  };

  const openList = id => {
    currentList = lists.find(l => l.id === id);
    if (!currentList) return;
    $("#listTitle").value = currentList.title || "";
    renderItems();
    show("app");
    renderLists();
  };

  const clearList = () => {
    $("#listTitle").value = "";
    $("#itemsList").innerHTML = "";
  };

  const renderItems = () => {
  const ul = $("#itemsList");
  ul.innerHTML = "";
  if (!currentList) return;

  currentList.items = currentList.items || [];

  currentList.items.forEach((it, i) => {
    const li = document.createElement("li");
    li.className = "list-item";
    li.innerHTML = `
      <label class="flex items-center gap-3 flex-1 cursor-pointer">
        <input type="checkbox" data-i="${i}" ${it.done ? "checked" : ""}>
        <span class="${it.done ? "line-through opacity-70" : ""}">${it.text}</span>
      </label>
      <div class="flex gap-2">
        <button class="edit-task text-blue-400 text-sm" data-i="${i}">Edit</button>
        <button class="del-task text-red-400 text-sm" data-i="${i}">Del</button>
      </div>`;

    ul.appendChild(li);
  });

  // === EDIT TASK ===
  $$(".edit-task").forEach(b => b.onclick = e => {
    e.stopPropagation();
    const i = +b.dataset.i;
    const txt = prompt("Edit task", currentList.items[i].text);
    if (txt !== null && txt.trim()) {
      currentList.items[i].text = txt.trim();
      saveToFirebase();
      renderItems();
    }
  });

  // === DELETE TASK ===
  $$(".del-task").forEach(b => b.onclick = e => {
    e.stopPropagation();
    if (confirm("Delete this task?")) {
      currentList.items.splice(+b.dataset.i, 1);
      saveToFirebase();
      renderItems();
    }
  });

  // === CHECKBOX: SOUND + MEME + CONFETTI ===
  $$('#itemsList input[type="checkbox"]').forEach(c => c.onchange = () => {
    const i = +c.dataset.i;
    currentList.items[i].done = c.checked;
    saveToFirebase();
    renderItems();

    // Play sound on check
    if (c.checked && settings.soundEnabled) {
      playCheckSound();
    }

    // Show meme on check
    if (c.checked && settings.memesEnabled) {
      showMeme();
    }

    // Celebrate when all done
    if (currentList.items.length && currentList.items.every(x => x.done)) {
      celebrate();
    }
  });
};

  const addItem = () => {
    if (!currentList) return;
    const val = $("#newItem").value.trim();
    if (!val) return;
    currentList.items.push({ text: val, done: false });
    $("#newItem").value = "";
    saveToFirebase();
    renderItems();
  };

 // Example: When user clicks "New List"
function createNewList() {
  const newList = {
    id: db.collection("dummy").doc().id,  // Generate Firestore ID
    title: "Untitled List",
    items: [],
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    // ... other fields
  };

  // Add to UI + memory
  lists.push(newList);
  currentList = newList;
  renderLists();
  openList(newList.id);
}

  const celebrate = () => {
    confetti();
    overlay(["Well done!", "You did it!", "Legend!", "PERFECTION!"]);
  };

  const overlay = msgs => {
    const el = $("#overlayMsg"), txt = $("#overlayText");
    txt.textContent = msgs[Math.floor(Math.random() * msgs.length)];
    el.classList.remove("hidden");
    setTimeout(() => el.classList.add("hidden"), 2000);
  };

  const showMeme = () => {
    if (!settings.memes?.length) return;
    const url = settings.memes[Math.floor(Math.random() * settings.memes.length)];
    $("#memeImage").src = url + "?t=" + Date.now();
    $("#memePopup").classList.remove("hidden");
    setTimeout(() => $("#memePopup").classList.add("hidden"), 1800);
  };

  // Confetti
  const canvas = $("#confettiCanvas"), ctx = canvas.getContext("2d");
  let particles = [];
  const confetti = () => {
    canvas.width = innerWidth;
    canvas.height = innerHeight;
    particles = Array.from({length: 180}, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      r: Math.random() * 6 + 3,
      c: settings.colors[Math.floor(Math.random() * settings.colors.length)],
      vy: Math.random() * 6 + 4,
      vx: Math.random() * 6 - 3
    }));
    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.y += p.vy;
        p.x += p.vx;
        ctx.fillStyle = p.c;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });
      particles = particles.filter(p => p.y < canvas.height + 50);
      if (particles.length) requestAnimationFrame(loop);
    };
    loop();
  };

  // Audio
  const audio = $("#bgAudio");
  const updateAudio = () => {
    if (!settings.musicEnabled || !settings.musicFile) {
      audio.pause();
      return;
    }
    audio.src = settings.musicFile;
    audio.volume = settings.musicVolume;
    audio.play().catch(() => console.log("Audio blocked"));
  };

  // Render Memes in Settings
  const renderMemes = () => {
    const wrap = $("#memeList");
    wrap.innerHTML = "";
    settings.memes.forEach((m, i) => {
      const img = document.createElement("img");
      img.src = m;
      img.className = "w-16 h-16 rounded-md object-cover cursor-pointer border-2 border-white/30 hover:border-white transition";
      img.title = "Click to remove";
      img.onclick = () => {
        settings.memes.splice(i, 1);
        renderMemes();
        saveToFirebase();
      };
      wrap.appendChild(img);
    });
  };

  // === ALL EVENT LISTENERS ===
  $("#heroCreate").onclick = createNewList;
  $("#newListBtn").onclick = createNewList;

  $("#homeBtn").onclick = () => show("home");
  $("#listsBtn").onclick = () => { show("app"); renderLists(); };
  $("#settingsBtn").onclick = () => { show("settings"); updateBgControls(); renderMemes(); };
  $("#heroSettings").onclick = () => { show("settings"); updateBgControls(); renderMemes(); };

  $("#addItemBtn").onclick = addItem;
  $("#newItem").onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); addItem(); } };

  $("#listTitle").oninput = () => {
    if (currentList) {
      currentList.title = $("#listTitle").value;
      saveToFirebase();
      renderLists();
    }
  };

  // Background Controls
  $("#bgMode").onchange = e => {
    settings.bgMode = e.target.value;
    updateBgControls();
    saveToFirebase();
    updateBackground();
  };

 $("#applyGradient").onclick = () => {
  settings.colors = [$("#c1").value, $("#c2").value, $("#c3").value, $("#c4").value];
  settings.gradSpeed = $("#gradSpeed").value;
  saveToFirebase();
  applyGradient();  // This now properly restarts animation
  updateBackground(); // Ensures gradient is visible
  overlay(["Gradient Applied!", "Looking Fresh!"]);
};

  $("#applyFile").onclick = () => {
    const file = $("#bgFile").files[0];
    if (!file) return alert("Select a file first");
    const reader = new FileReader();
    reader.onload = ev => {
      settings.bgFile = ev.target.result;
      saveToFirebase();
      updateBackground();
      overlay(["Background Applied!"]);
    };
    reader.readAsDataURL(file);
  };

  $("#applyYoutube").onclick = () => {
    const url = $("#bgUrl").value.trim();
    if (!url) return alert("Enter YouTube URL");
    settings.bgFile = url;
    saveToFirebase();
    updateBackground();
    overlay(["YouTube Background Set!"]);
  };

  $("#gradSpeed").oninput = e => $("#speedValue").textContent = e.target.value;
  $("#volumeSlider").oninput = e => $("#volValue").textContent = Math.round(e.target.value * 100);

  // Music
  $("#musicToggle").onchange = e => {
    settings.musicEnabled = e.target.checked;
    saveToFirebase();
    updateAudio();
  };

  $("#musicUpload").onchange = e => {
    const f = e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = ev => {
      settings.musicFile = ev.target.result;
      saveToFirebase();
      updateAudio();
    };
    r.readAsDataURL(f);
  };

  $("#volumeSlider").oninput = e => {
    settings.musicVolume = +e.target.value;
    audio.volume = settings.musicVolume;
    saveToFirebase();
  };

  // Memes
  $("#memeToggle").onchange = e => {
    settings.memesEnabled = e.target.checked;
    saveToFirebase();
  };

  $("#addMemeBtn").onclick = () => {
    const url = $("#memeUrl").value.trim();
    if (url) {
      settings.memes.push(url);
      $("#memeUrl").value = "";
      renderMemes();
      saveToFirebase();
    }
  };

  // Overlay
  $("#overlayToggle").onchange = e => {
    settings.overlayDark = e.target.checked;
    document.body.style.backgroundColor = e.target.checked ? "rgba(0,0,0,.5)" : "#000";
    saveToFirebase();
  };

  // Data Management
  $("#exportBtn").onclick = () => {
    const data = { lists, settings };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `listora-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    overlay(["Exported!", "Check Downloads"]);
  };

  $("#importFile").onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.lists && data.settings) {
          if (confirm("Overwrite all data?")) {
            lists = data.lists;
            settings = { ...defaults, ...data.settings };
            saveToFirebase();
            location.reload();
          }
        } else alert("Invalid file");
      } catch { alert("Invalid JSON"); }
    };
    reader.readAsText(file);
  };

  // Actions
  $("#saveSettings").onclick = () => {
    saveToFirebase();
    updateBackground();
    updateAudio();
    overlay(["All Settings Saved!"]);
  };

  $("#resetSettings").onclick = () => {
    if (confirm("Reset EVERYTHING?")) {
      lists = [];
      settings = { ...defaults };
      saveToFirebase();
      location.reload();
    }
  };

  $("#closeSettings").onclick = () => show("home");

  // INIT
  const init = () => {
    applyGradient();
    updateBackground();
    updateAudio();
    renderLists();
    renderMemes();

    $("#bgMode").value = settings.bgMode;
    $("#gradSpeed").value = settings.gradSpeed;
    $("#speedValue").textContent = settings.gradSpeed;
    [1,2,3,4].forEach(i => $(`#c${i}`).value = settings.colors[i-1]);
    $("#musicToggle").checked = settings.musicEnabled;
    $("#volumeSlider").value = settings.musicVolume;
    $("#volValue").textContent = Math.round(settings.musicVolume * 100);
    $("#memeToggle").checked = settings.memesEnabled;
    $("#overlayToggle").checked = settings.overlayDark;
    document.body.style.backgroundColor = settings.overlayDark ? "rgba(0,0,0,.5)" : "#000";

    updateBgControls();
  };

       // === PROFILE DROPDOWN (MOBILE-OPTIMIZED) ===
    const profileBtn = $("#profileBtn");
    const profileDropdown = $("#profileDropdown");
    const profileInitial = $("#profileInitial");

    // Update initial with first letter of email (or "G" for guest)
    if (currentUser?.email) {
      profileInitial.textContent = currentUser.email[0].toUpperCase();
    } else {
      profileInitial.textContent = "G";
    }

    // Reposition dropdown on mobile
    const updateDropdownPosition = () => {
      if (window.innerWidth < 640) {
        profileDropdown.style.left = "50%";
        profileDropdown.style.right = "auto";
        profileDropdown.style.transform = "translateX(-50%)";
      } else {
        profileDropdown.style.left = "auto";
        profileDropdown.style.right = "0";
        profileDropdown.style.transform = "translateX(0)";
      }
    };

    // Toggle dropdown + update position
    profileBtn.onclick = (e) => {
      e.stopPropagation();
      profileDropdown.classList.toggle("hidden");
      updateDropdownPosition();
    };

    // Close when clicking outside
    document.addEventListener("click", () => {
      profileDropdown.classList.add("hidden");
    });

    // Account button – opens settings + shows user info
    $("#accountBtn").onclick = (e) => {
      e.stopPropagation();
      profileDropdown.classList.add("hidden");
      show("settings");
      overlay([`Logged in as ${currentUser?.email || "Guest"}`]);
    };

    // Logout
    $("#logoutBtn").onclick = (e) => {
      e.stopPropagation();
      if (confirm("Logout?")) {
        auth.signOut().then(() => {
          overlay(["Logged out!", "See you soon!"]);
          window.location.href = "login.htm"; // redirect to login
        });
      }
    };

    // Update profile on auth change
    auth.onAuthStateChanged(user => {
      if (user?.email) {
        profileInitial.textContent = user.email[0].toUpperCase();
      } else {
        profileInitial.textContent = "G";
      }
    });

        // === ACCOUNT MODAL ===
    const accountModal = $("#accountModal");
    const closeAccountModal = $("#closeAccountModal");
    const pfpPreview = $("#pfpPreview");
    const pfpUpload = $("#pfpUpload");
    const displayNameInput = $("#displayNameInput");
    const emailInput = $("#emailInput");
    const updateEmailBtn = $("#updateEmailBtn");
    const oldPass = $("#oldPass");
    const newPass = $("#newPass");
    const confirmPass = $("#confirmPass");
    const updatePassBtn = $("#updatePassBtn");
    const currentEmailSpan = $("#currentEmail");

    // Open modal
    $("#accountBtn").onclick = (e) => {
      e.stopPropagation();
      profileDropdown.classList.add("hidden");
      accountModal.classList.remove("hidden");

      // Populate current data
      const user = auth.currentUser;
      if (user) {
        currentEmailSpan.textContent = user.email;
        displayNameInput.value = user.displayName || "";
        pfpPreview.src = user.photoURL || `https://ui-avatars.com/api/?name=${user.email[0]}&background=7b2ff7&color=fff&size=96`;
      }
    };

    // Close modal
    closeAccountModal.onclick = () => accountModal.classList.add("hidden");
    accountModal.onclick = (e) => { if (e.target === accountModal) accountModal.classList.add("hidden"); };

  // === PFP UPLOAD (Firebase Storage) ===
pfpUpload.onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  // Optional: limit size (e.g., 2 MB)
  if (file.size > 2 * 1024 * 1024) {
    return alert("Image too large – max 2 MB");
  }

  const user = auth.currentUser;
  if (!user) return alert("Log in first");

  // 1. Upload to Storage → users/{uid}/profile.jpg
  const fileRef = storageRef.child(`users/${user.uid}/profile.jpg`);
  const snap = await fileRef.put(file);

  // 2. Get download URL
  const photoURL = await snap.ref.getDownloadURL();

  // 3. Update Auth profile
  await user.updateProfile({ photoURL });

  // 4. Save to Firestore (optional but nice)
  saveToFirebase();

  // 5. UI
  pfpPreview.src = photoURL;
  overlay(["Profile picture updated!"]);
};

    // Change Display Name
    displayNameInput.onblur = () => {
      const newName = displayNameInput.value.trim();
      if (newName && newName !== auth.currentUser.displayName) {
        auth.currentUser.updateProfile({ displayName: newName })
          .then(() => {
            saveToFirebase();
            overlay(["Name updated!"]);
          })
          .catch(err => alert("Name update failed: " + err.message));
      }
    };

    // Update Email
    updateEmailBtn.onclick = () => {
      const newEmail = emailInput.value.trim();
      if (!newEmail || !newEmail.includes("@")) return alert("Enter valid email");
      if (newEmail === auth.currentUser.email) return;

      const credential = firebase.auth.EmailAuthProvider.credential(
        auth.currentUser.email,
        prompt("Enter your current password to change email:")
      );

      auth.currentUser.reauthenticateWithCredential(credential)
        .then(() => auth.currentUser.updateEmail(newEmail))
        .then(() => {
          saveToFirebase();
          currentEmailSpan.textContent = newEmail;
          overlay(["Email updated!"]);
          emailInput.value = "";
        })
        .catch(err => alert("Email update failed: " + err.message));
    };

    // Update Password
    updatePassBtn.onclick = () => {
      const oldP = oldPass.value;
      const newP = newPass.value;
      const confirmP = confirmPass.value;

      if (!oldP || !newP || !confirmP) return alert("Fill all fields");
      if (newP !== confirmP) return alert("New passwords don't match");
      if (newP.length < 6) return alert("Password must be 6+ chars");

      const credential = firebase.auth.EmailAuthProvider.credential(
        auth.currentUser.email, oldP
      );

      auth.currentUser.reauthenticateWithCredential(credential)
        .then(() => auth.currentUser.updatePassword(newP))
        .then(() => {
          saveToFirebase();
          overlay(["Password changed!"]);
          oldPass.value = newPass.value = confirmPass.value = "";
        })
        .catch(err => alert("Password update failed: " + err.message));
    };

  init();

  // Easter Egg
  let typed = "";
  document.addEventListener("keydown", e => {
    if (["INPUT","TEXTAREA"].includes(e.target.tagName)) return;
    typed += e.key.toLowerCase();
    if (typed.endsWith("legend")) {
      settings.colors = ["#ff9500","#ff2d55","#007aff","#00ff9d"];
      settings.gradSpeed = 3;
      applyGradient();
      overlay(["LEGEND MODE", "UNLOCKED!", "YOU ARE GOD"]);
      typed = "";
    }
  });
  // === SOUND EFFECTS ===


const playCheckSound = () => {
  if (!settings.soundEnabled || !settings.soundFile) return;

  const audio = new Audio(settings.soundFile);
  audio.volume = 0.8;
  audio.play().catch(err => {
    console.log("Sound blocked (user hasn't interacted yet)");
  });
};

$("#soundToggle").onchange = e => {
  settings.soundEnabled = e.target.checked;
  saveToFirebase();
};

$("#soundUpload").onchange = e => {
  const f = e.target.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = ev => {
    settings.soundFile = ev.target.result;
    saveToFirebase();
    overlay(["Check sound updated!"]);
  };
  r.readAsDataURL(f);
};

$("#testSound").onclick = () => playCheckSound();

// === SHARE LIST AS PUBLIC LINK ===







  }

  // Start the app
  initListoraApp();
// === RENDER LISTS TO SCREEN (MISSING FUNCTION) ===
window.renderLists = () => {
  const container = document.getElementById('listsContainer');
  if (!container) return;

  container.innerHTML = '';
  window.lists.forEach(list => {
    const div = document.createElement('div');
    div.className = 'card-glass p-5 rounded-2xl cursor-pointer hover:scale-105 transition';
    div.innerHTML = `
      <h3 class="text-xl font-bold text-white mb-2">${list.title}</h3>
      <p class="text-white/70 text-sm">${list.items.length} tasks</p>
      ${list.aiGenerated ? '<span class="text-cyan-400 text-xs">AI</span>' : ''}
    `;
    div.onclick = () => window.openList(list.id);
    container.appendChild(div);
  });
};

// Auto-refresh when list is added
window.saveToFirebase = async () => {
  if (!currentUser) return;
  await userDocRef.set({ lists: window.lists }, { merge: true });
  window.renderLists?.();
};
})();