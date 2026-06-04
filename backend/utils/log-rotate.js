'use strict';
const fs = require('fs');
const path = require('path');

function rotateLogFile(logPath, maxSize) {
  maxSize = maxSize || 10 * 1024 * 1024;
  try {
    if (fs.existsSync(logPath) && fs.statSync(logPath).size > maxSize) {
      const rotated = logPath + '.1';
      if (fs.existsSync(rotated)) fs.unlinkSync(rotated);
      fs.renameSync(logPath, rotated);
      return true;
    }
  } catch (e) { /* skip */ }
  return false;
}

function createLogStream(name, logDir, maxSize) {
  logDir = logDir || path.join(__dirname, '..', 'data', 'logs');
  const logPath = path.join(logDir, name);
  rotateLogFile(logPath, maxSize);
  return fs.createWriteStream(logPath, { flags: 'a' });
}

module.exports = { rotateLogFile, createLogStream };
