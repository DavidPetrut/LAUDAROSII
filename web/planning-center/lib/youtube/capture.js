/**
 * Captură audio YouTube în BROWSER (nu pe server → scapă de blocajul anti-bot YouTube).
 * Redă videoul într-un iframe ascuns în pagina noastră și capturează sunetul FILEI cu
 * getDisplayMedia({audio}) → MediaRecorder → Blob (webm/opus). Rulează în fundal, non-blocant.
 * Sunetul SE AUDE cât se înregistrează (nu există captură silențioasă în browser) + o aprobare unică.
 *
 * getDisplayMedia TREBUIE apelat într-un gest al utilizatorului (de aceea îl apelăm imediat la click).
 */

let ytApiPromise = null;
function loadYT() {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise((resolve) => {
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { prev && prev(); resolve(window.YT); };
    document.head.appendChild(tag);
  });
  return ytApiPromise;
}

function pickMime() {
  const opts = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"];
  for (const m of opts) { try { if (window.MediaRecorder && MediaRecorder.isTypeSupported(m)) return m; } catch {} }
  return "";
}

/**
 * @param {string} videoId
 * @param {{ onProgress?: (pct:number)=>void }} opts
 * @returns {Promise<Blob>}
 */
export async function captureYouTube(videoId, { onProgress } = {}) {
  if (typeof navigator === "undefined" || !navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
    throw new Error("Browserul nu suportă captura de tab.");
  }
  // 1) Captura sunetului filei (gest utilizator). Chrome: alege fila + bifează „Partajează sunetul filei".
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: true, audio: true, preferCurrentTab: true, selfBrowserSurface: "include",
  });
  const audioTracks = stream.getAudioTracks();
  if (!audioTracks.length) {
    stream.getTracks().forEach((t) => t.stop());
    throw new Error("Nu s-a partajat sunetul filei — bifează «Partajează sunetul filei».");
  }
  stream.getVideoTracks().forEach((t) => t.stop()); // ne trebuie doar audio
  const audioStream = new MediaStream(audioTracks);

  let container, player, rec, iv;
  const cleanup = () => {
    try { clearInterval(iv); } catch {}
    try { player && player.stopVideo && player.stopVideo(); } catch {}
    try { audioStream.getTracks().forEach((t) => t.stop()); } catch {}
    try { stream.getTracks().forEach((t) => t.stop()); } catch {}
    setTimeout(() => { try { container && container.remove(); } catch {} }, 400);
  };

  try {
    // 2) Player YouTube ascuns în pagina noastră (audio-ul lui intră în sunetul filei → se capturează)
    const YT = await loadYT();
    if (!YT) throw new Error("Nu s-a putut încărca YouTube.");
    container = document.createElement("div");
    container.style.cssText = "position:fixed;left:-9999px;bottom:0;width:320px;height:180px;overflow:hidden;";
    const el = document.createElement("div");
    container.appendChild(el);
    document.body.appendChild(container);
    player = await new Promise((resolve, reject) => {
      const p = new YT.Player(el, {
        videoId,
        playerVars: { autoplay: 0, controls: 0, disablekb: 1 },
        events: { onReady: () => resolve(p), onError: () => reject(new Error("Video indisponibil.")) },
      });
    });

    // 3) Înregistrare
    const mimeType = pickMime();
    rec = new MediaRecorder(audioStream, mimeType ? { mimeType } : undefined);
    const chunks = [];
    rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
    const done = new Promise((resolve) => { rec.onstop = () => resolve(new Blob(chunks, { type: rec.mimeType || "audio/webm" })); });

    try { player.unMute(); player.setVolume(100); } catch {}
    player.seekTo(0, true); player.playVideo();
    rec.start(500);

    const dur = Math.max(1, player.getDuration() || 0);
    iv = setInterval(() => {
      let cur = 0; try { cur = player.getCurrentTime() || 0; } catch {}
      const state = (() => { try { return player.getPlayerState(); } catch { return -1; } })();
      if (onProgress && dur) onProgress(Math.min(99, Math.round((cur / dur) * 100)));
      // oprește la final (ENDED=0) sau când ajunge la durată
      if (state === 0 || (dur > 1 && cur >= dur - 0.4)) { try { rec.state !== "inactive" && rec.stop(); } catch {} }
    }, 400);

    const blob = await done;
    onProgress && onProgress(100);
    cleanup();
    if (!blob || blob.size < 1000) throw new Error("Înregistrare goală (n-a pornit sunetul?).");
    return blob;
  } catch (e) {
    cleanup();
    throw e;
  }
}
