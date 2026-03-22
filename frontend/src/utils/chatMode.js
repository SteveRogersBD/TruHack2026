const YOUTUBE_HOSTS = ['youtube.com', 'youtu.be', 'www.youtube.com', 'm.youtube.com'];

export function normalizeUrl(rawUrl) {
  return (rawUrl || '').trim();
}

export function isYoutubeUrl(rawUrl) {
  const normalizedUrl = normalizeUrl(rawUrl);
  if (!normalizedUrl) return false;
  try {
    const parsed = new URL(normalizedUrl);
    return YOUTUBE_HOSTS.includes(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}

export function inferChatMode({ text = '', attachedUrl = '', currentMode = 'general', currentCode = '' }) {
  const trimmedText = text.trim();
  const normalizedAttachedUrl = normalizeUrl(attachedUrl);

  if (normalizedAttachedUrl) {
    return isYoutubeUrl(normalizedAttachedUrl) ? 'youtube' : 'webpage';
  }

  if (/https?:\/\/\S+/i.test(trimmedText)) {
    const firstUrl = normalizeUrl(trimmedText.match(/https?:\/\/\S+/i)?.[0] ?? '');
    return isYoutubeUrl(firstUrl) ? 'youtube' : 'webpage';
  }

  if (
    currentCode ||
    /```|function |const |let |var |class |def |import |console\.log|syntax error|stack trace|debug|compile|python|javascript|react|code/i.test(trimmedText)
  ) {
    return 'coding';
  }

  if (/solve |equation|integrate|derivative|differentiate|simplify|algebra|calculus|geometry|trigonometry|fraction|=|\^|sqrt|sin\(|cos\(|tan\(|log\(|lim /i.test(trimmedText)) {
    return 'math';
  }

  return currentMode || 'general';
}

export function formatModeLabel(mode) {
  if (!mode) return 'General';
  return mode.charAt(0).toUpperCase() + mode.slice(1);
}
