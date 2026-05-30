'use strict';

const { SAFE_REASON_CODES } = require('./types');

const PRIVATE_KEY_TOOL_NAMES = Object.freeze(new Set([
  'import_private_key',
  'create_encrypted_keystore',
  'unlock_keystore',
  'import_encrypted_private_key',
  'remove_private_key',
]));

const KEY_MATERIAL_PATTERNS = Object.freeze([
  /private[_-]?key/i,
  /keystore/i,
  /unlock/i,
  /export[_-]?key/i,
  /remove[_-]?key/i,
]);

const DANGEROUS_TOOL_PATTERNS = Object.freeze([
  /^write_/i,
  /write[_-]?contract/i,
  /send[_-]?raw/i,
  /raw[_-]?transaction/i,
  /sign(?!_typed_data$)/i,
  /broadcast/i,
  /mint/i,
  /burn/i,
  /nft.*transfer/i,
  /hyperliquid.*(import|order|cancel|transfer)/i,
  /(order|cancel).*hyperliquid/i,
]);

function descriptorText(descriptorOrFixture) {
  const name = descriptorOrFixture && (descriptorOrFixture.name || descriptorOrFixture.tool_name || '');
  const fields = descriptorOrFixture && descriptorOrFixture.inputSchema
    ? Object.keys(descriptorOrFixture.inputSchema.properties || {})
    : [];
  return [name, ...fields].join(' ');
}

function classifyBlockedTool(descriptorOrFixture) {
  const name = descriptorOrFixture && (descriptorOrFixture.name || descriptorOrFixture.tool_name || '');
  const text = descriptorText(descriptorOrFixture);

  if (PRIVATE_KEY_TOOL_NAMES.has(name) || KEY_MATERIAL_PATTERNS.some((pattern) => pattern.test(text))) {
    return SAFE_REASON_CODES.PRIVATE_KEY_MANAGEMENT_BLOCKED;
  }

  if (DANGEROUS_TOOL_PATTERNS.some((pattern) => pattern.test(text))) {
    return SAFE_REASON_CODES.DANGEROUS_TOOL_BLOCKED;
  }

  return undefined;
}

module.exports = {
  PRIVATE_KEY_TOOL_NAMES,
  classifyBlockedTool,
};
