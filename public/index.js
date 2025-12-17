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

