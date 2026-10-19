/**
 * Captură audio YouTube în BROWSER (scapă de blocajul anti-bot YouTube de pe server).
 * Recorder interactiv: „armezi" (cere sunetul filei + pregătește playerul ascuns), alegi de unde
 * începi, dai START (seek+play+record) și STOP când vrei → Blob. Dacă partajarea e oprită din bara
 * Chrome, detectăm și finalizăm cu ce s-a înregistrat (marcat „neterminat").
 *
 * NB: bara Chrome de partajare NU poate fi ascunsă (securitate browser). getDisplayMedia cere un gest.
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

export class YoutubeRecorder {
  constructor(videoId) {
    this.videoId = videoId;
    this.stream = null; this.audioStream = null; this.player = null; this.container = null;
    this.rec = null; this.chunks = []; this.iv = null;
    this.duration = 0; this.recording = false; this.finished = false; this.from = 0;
    this.onProgress = null; this.onEnded = null; // onEnded({ unexpected?:bool, cancelled?:bool })
    this.blobPromise = new Promise((r) => { this._resolveBlob = r; });
  }

  // Cere sunetul filei (gest!) + pregătește playerul ascuns. Întoarce { duration }.
  async arm() {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getDisplayMedia) throw new Error("Browserul nu suportă captura de tab.");
    this.stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true, preferCurrentTab: true, selfBrowserSurface: "include" });
    const at = this.stream.getAudioTracks();
    if (!at.length) { this._stopStream(); throw new Error("Nu s-a partajat sunetul filei — bifează «Partajează sunetul filei»."); }
    this.stream.getVideoTracks().forEach((t) => t.stop());
    this.audioStream = new MediaStream(at);
    // bara Chrome oprită / partajare terminată:
    at[0].addEventListener("ended", () => {
      if (this.finished) return;
      if (this.recording) this._finalize(true);            // s-a oprit în timpul înregistrării → finalizăm (neterminat)
      else { this.onEnded && this.onEnded({ cancelled: true }); this._cleanup(); } // oprit înainte de Start
    });

    const YT = await loadYT(); if (!YT) throw new Error("Nu s-a putut încărca YouTube.");
    this.container = document.createElement("div");
    this.container.style.cssText = "position:fixed;left:-9999px;bottom:0;width:320px;height:180px;overflow:hidden;";
    const el = document.createElement("div"); this.container.appendChild(el); document.body.appendChild(this.container);
    this.player = await new Promise((resolve, reject) => {
      const p = new YT.Player(el, { videoId: this.videoId, playerVars: { autoplay: 0, controls: 0, disablekb: 1 },
        events: { onReady: () => resolve(p), onError: () => reject(new Error("Video indisponibil.")) } });
    });
    this.duration = Math.max(0, this.player.getDuration() || 0);
    return { duration: this.duration };
  }

  // Pornește înregistrarea de la fromSec.
  start(fromSec = 0) {
    if (this.recording || this.finished) return;
    const mimeType = pickMime();
    this.rec = new MediaRecorder(this.audioStream, mimeType ? { mimeType } : undefined);
    this.chunks = [];
    this.rec.ondataavailable = (e) => { if (e.data && e.data.size) this.chunks.push(e.data); };
    this.rec.onstop = () => this._resolveBlob(new Blob(this.chunks, { type: (this.rec && this.rec.mimeType) || "audio/webm" }));
    try { this.player.unMute(); this.player.setVolume(100); } catch {}
    this.from = Math.max(0, Math.min(fromSec, this.duration || fromSec));
    this.player.seekTo(this.from, true); this.player.playVideo(); this.rec.start(500);
    this.recording = true;
    this.iv = setInterval(() => {
      let cur = 0; try { cur = this.player.getCurrentTime() || 0; } catch {}
      let state = -1; try { state = this.player.getPlayerState(); } catch {}
      this.onProgress && this.onProgress({ cur, from: this.from, duration: this.duration, elapsed: Math.max(0, cur - this.from) });
      if (state === 0 || (this.duration > 1 && cur >= this.duration - 0.4)) this._finalize(false); // s-a terminat videoul
    }, 300);
  }

  stop() { this._finalize(false); return this.blobPromise; }   // STOP manual = complet
  cancel() { this.finished = true; this._cleanup(); }           // renunțare înainte de start

  _finalize(unexpected) {
    if (this.finished) return;
    this.finished = true; this.recording = false;
    try { clearInterval(this.iv); } catch {}
    try { this.rec && this.rec.state !== "inactive" && this.rec.stop(); } catch {}
    try { this.player && this.player.stopVideo && this.player.stopVideo(); } catch {}
    this._stopStream();
    setTimeout(() => { try { this.container && this.container.remove(); } catch {} }, 400);
    this.onEnded && this.onEnded({ unexpected });
  }
  _cleanup() {
    try { clearInterval(this.iv); } catch {}
    try { this.player && this.player.stopVideo && this.player.stopVideo(); } catch {}
    this._stopStream();
    setTimeout(() => { try { this.container && this.container.remove(); } catch {} }, 400);
  }
  _stopStream() {
    try { this.audioStream && this.audioStream.getTracks().forEach((t) => t.stop()); } catch {}
    try { this.stream && this.stream.getTracks().forEach((t) => t.stop()); } catch {}
  }
}
