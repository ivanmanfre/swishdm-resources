// Before your call: the video slot. To add Jonathan's recording, put its link on the VIDEO line below and push.
// Works with a file in this folder ('video/before-your-call.mp4'), or a YouTube, Loom or Vimeo link. Empty = the page
// shows only the text version. The text version stays on the page under the video either way. Steps: BEFORE-YOUR-CALL-VIDEO.md at the repo root
const VIDEO = '';

function embedFor(link) {
  const v = String(link || '').trim();
  if (!v) return null;
  if (/\.(mp4|webm|mov)(\?.*)?$/i.test(v)) return { kind: 'file', src: v };
  let m = v.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,})/i);
  if (m) return { kind: 'frame', src: 'https://www.youtube-nocookie.com/embed/' + m[1] + '?rel=0' };
  m = v.match(/loom\.com\/(?:share|embed)\/([\w-]{8,})/i);
  if (m) return { kind: 'frame', src: 'https://www.loom.com/embed/' + m[1] + '?hide_owner=true&hide_share=true&hideEmbedTopBar=true' };
  m = v.match(/vimeo\.com\/(?:video\/)?(\d{5,})/i);
  if (m) return { kind: 'frame', src: 'https://player.vimeo.com/video/' + m[1] };
  return null;
}

const e = embedFor(VIDEO);
const slot = document.getElementById('pc-player');
if (e && slot) {
  if (e.kind === 'file') {
    const vid = document.createElement('video');
    vid.src = e.src;
    vid.controls = true;
    vid.playsInline = true;
    vid.preload = 'metadata';
    vid.setAttribute('aria-label', 'Video from Jonathan: before your call');
    slot.appendChild(vid);
  } else {
    const box = document.createElement('div');
    box.className = 'pc-frame';
    const f = document.createElement('iframe');
    f.src = e.src;
    f.title = 'Video from Jonathan: before your call';
    f.allow = 'autoplay; fullscreen; picture-in-picture';
    f.allowFullscreen = true;
    f.loading = 'lazy';
    box.appendChild(f);
    slot.appendChild(box);
  }
  slot.hidden = false;
  document.getElementById('pc-read').hidden = false;
}
