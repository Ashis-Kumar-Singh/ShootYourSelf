'use strict';
function sanitize(s, maxLen) {
  if (typeof s !== 'string') return '';
  return s.replace(/[<>"'&]/g, '').trim().slice(0, maxLen || 200);
}
module.exports = sanitize;
