// Editorial Markdown is presentation, not a change to approved publishing copy.
function normalizeScriptFormatting(text) {
  return text.replace(/\r\n/g, '\n')
    .replace(/^> ?/gm, '')
    .replace(/^\*\*([^*\n]+):\*\*/gm, '$1:')
    .replace(/^---\s*$/gm, '')
    .replace(/\n{3,}/g, '\n\n').trim();
}
module.exports = { normalizeScriptFormatting };
