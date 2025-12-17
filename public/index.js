"use strict";
/**
 * @type {HTMLFormElement}
 */
const form = document.getElementById("sj-form");
/**
 * @type {HTMLInputElement}
 */
const address = document.getElementById("sj-address");
/**
 * @type {HTMLInputElement}
 */
const searchEngine = document.getElementById("sj-search-engine");
/**
 * @type {HTMLParagraphElement}
 */
const error = document.getElementById("sj-error");
/**
 * @type {HTMLPreElement}
 */
const errorCode = document.getElementById("sj-error-code");

const { ScramjetController } = $scramjetLoadController();

const scramjet = new ScramjetController({
	files: {
		wasm: '/scram/scramjet.wasm.wasm',
		all: '/scram/scramjet.all.js',
		sync: '/scram/scramjet.sync.js',
	},
});

scramjet.init();

const connection = new BareMux.BareMuxConnection("/baremux/worker.js");

form.addEventListener("submit", async (event) => {
	event.preventDefault();

	try {
		await registerSW();
	} catch (err) {
		error.textContent = "Failed to register service worker.";
		errorCode.textContent = err.toString();
		throw err;
	}

	const url = search(address.value, searchEngine.value);

	let wispUrl =
		(location.protocol === "https:" ? "wss" : "ws") +
		"://" +
		location.host +
		"/wisp/";
	if ((await connection.getTransport()) !== "/epoxy/index.mjs") {
		await connection.setTransport("/epoxy/index.mjs", [{ wisp: wispUrl }]);
	}
  const frame = scramjet.createFrame();
  frame.frame.id = "sj-frame";
	document.body.appendChild(frame.frame);	
	frame.go(url);
});
// Detect Scramjet button: probes common hosts/ports and saves SCRAMJET_BASE_RUNTIME
const detectBtn = document.getElementById('detect-btn');
const setProxyBtn = document.getElementById('set-proxy-btn');
// expose for panel buttons to invoke
window.detectBtn = detectBtn;
window.setProxyBtn = setProxyBtn;

if (detectBtn) {
  detectBtn.addEventListener('click', async () => {
    const hosts = [window.location.hostname, 'localhost', '127.0.0.1'];
    const ports = [8080, 1337, 80];
    const target = 'https://example.com';
    let foundBase = null;

    outer: for (const host of hosts) {
      for (const port of ports) {
        const base = port === 80 ? `http://${host}` : `http://${host}:${port}`;
        const candidates = [`${base}/?url=${encodeURIComponent(target)}`, `${base}/${encodeURIComponent(target)}`];
        for (const c of candidates) {
          try {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), 1500);
            await fetch(c, { method: 'GET', signal: controller.signal });
            clearTimeout(id);
            foundBase = base;
            break outer;
          } catch (e) {
            // try next candidate
          }
        }
      }
    }

    if (foundBase) {
      window.localStorage.setItem('SCRAMJET_BASE_RUNTIME', foundBase);
      alert(`Scramjet detected: ${foundBase}`);
    } else {
      alert('Scramjet not found on common hosts/ports.');
    }
  });
}

if (setProxyBtn) {
  setProxyBtn.addEventListener('click', () => {
    const current = window.localStorage.getItem('SCRAMJET_BASE_RUNTIME') || 'http://129.213.26.17:1337';
    const value = window.prompt('Enter Scramjet base (e.g. http://129.213.26.17:1337)', current);
    if (value) {
      window.localStorage.setItem('SCRAMJET_BASE_RUNTIME', value);
      alert(`Proxy saved: ${value}`);
      window.location.reload();
    }
  });
}

// --- Tabs: accessible tab switching and panel animation ---
(function () {
  const tabs = document.querySelectorAll('.tab');
  const panels = document.querySelectorAll('.tab-panel');

  function activateTabFor(id) {
    tabs.forEach((t) => {
      const controls = t.getAttribute('aria-controls');
      const isActive = controls === id;
      t.classList.toggle('active', isActive);
      t.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
    panels.forEach((p) => {
      const isActive = p.id === id;
      if (isActive) {
        p.removeAttribute('hidden');
        p.classList.add('active', 'animate-in');
        p.setAttribute('aria-hidden', 'false');
      } else {
        p.classList.remove('active', 'animate-in');
        p.setAttribute('hidden', '');
        p.setAttribute('aria-hidden', 'true');
      }
    });
    localStorage.setItem('selectedTab', id);
    // Update proxy display whenever proxy panel is selected
    if (id === 'tab-proxy') updateProxyDisplay();
  }

  tabs.forEach((t) => {
    t.addEventListener('click', () => activateTabFor(t.getAttribute('aria-controls')));
    t.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        const idx = Array.from(tabs).indexOf(t);
        const next = e.key === 'ArrowRight' ? (idx + 1) % tabs.length : (idx - 1 + tabs.length) % tabs.length;
        tabs[next].focus();
      }
    });
  });

  // wire proxy-panel buttons to the existing handlers (if present)
  const detectPanelBtn = document.getElementById('detect-btn-panel');
  const setPanelBtn = document.getElementById('set-proxy-btn-panel');
  if (detectPanelBtn && window.detectBtn) detectPanelBtn.addEventListener('click', () => window.detectBtn.click());
  if (setPanelBtn && window.setProxyBtn) setPanelBtn.addEventListener('click', () => window.setProxyBtn.click());

  function updateProxyDisplay() {
    const el = document.getElementById('current-proxy');
    if (!el) return;
    el.textContent = window.localStorage.getItem('SCRAMJET_BASE_RUNTIME') || 'Not set';
  }

  // load selected tab or default
  const start = localStorage.getItem('selectedTab') || 'tab-browse';
  activateTabFor(start);
})();