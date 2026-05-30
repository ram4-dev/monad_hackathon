'use strict';

const fs = require('node:fs');
const path = require('node:path');

function appendAuditEvent(filePath, event) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.appendFileSync(filePath, `${JSON.stringify(event)}\n`, { encoding: 'utf8', flag: 'a' });
  return event;
}

module.exports = { appendAuditEvent };
