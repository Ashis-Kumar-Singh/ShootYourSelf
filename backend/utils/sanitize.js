'use strict';
function sanitize(s, maxLen) {
  if (typeof s !== 'string') return '';
  return s
    .replace(/\0/g, '')
    .replace(/[<>"'&`]/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/[\u2000-\u200F\u2028-\u202F\uFEFF]/g, '')
    .trim()
    .slice(0, maxLen || 200);
}
module.exports = sanitize;
