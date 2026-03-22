import { isYoutubeUrl, normalizeUrl } from './chatMode.js';

function escapeXml(text) {
  return (text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildWebpageCard(url) {
  const safeUrl = escapeXml(url);
  return (
    "<svg xmlns='http://www.w3.org/2000/svg' width='960' height='220' viewBox='0 0 960 220'>"
    + "<defs><linearGradient id='bg' x1='0' y1='0' x2='1' y2='1'>"
    + "<stop offset='0%' stop-color='#0f172a'/>"
    + "<stop offset='100%' stop-color='#0f766e'/>"
    + "</linearGradient></defs>"
    + "<rect width='960' height='220' rx='24' fill='url(#bg)'/>"
    + "<rect x='28' y='28' width='904' height='164' rx='18' fill='rgba(255,255,255,0.06)' stroke='rgba(255,255,255,0.18)'/>"
    + "<text x='56' y='92' fill='white' font-size='28' font-family='Arial, sans-serif' font-weight='700'>Attached Webpage</text>"
    + `<text x='56' y='136' fill='#ccfbf1' font-size='18' font-family='Arial, sans-serif'>${safeUrl}</text>`
    + "</svg>"
  );
}

export function buildResourcePreviewStructured(rawUrl) {
  const url = normalizeUrl(rawUrl);
  if (!url) return null;

  if (isYoutubeUrl(url)) {
    return {
      speech: 'I loaded the attached YouTube video into the canvas.',
      emotion: 'idle',
      canvas_mode: 'whiteboard',
      canvas_actions: [
        {
          type: 'video',
          content: url,
          step: 1,
          narration: 'Attached YouTube video preview',
        },
      ],
      follow_up_suggestions: [],
    };
  }

  return {
    speech: 'I loaded the attached webpage into the canvas.',
    emotion: 'idle',
    canvas_mode: 'whiteboard',
    canvas_actions: [
      {
        type: 'draw',
        content: buildWebpageCard(url),
        step: 1,
        narration: 'Attached webpage preview',
      },
    ],
    follow_up_suggestions: [],
  };
}
