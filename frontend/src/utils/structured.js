export function isStructuredResponse(value) {
  return Boolean(
    value &&
      typeof value === 'object' &&
      Array.isArray(value.canvas_actions) &&
      typeof value.speech === 'string'
  );
}

export function extractStructuredFromMessages(messages = []) {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (message?.role !== 'assistant') continue;
    if (isStructuredResponse(message?.meta)) return message.meta;
  }
  return null;
}
