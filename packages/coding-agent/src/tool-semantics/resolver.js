'use strict';

const { SAFE_REASON_CODES } = require('./types');
const { getToolSemantics } = require('./walletAgentRegistry');
const { getUnsupportedCapability } = require('./unsupportedCapabilities');
const { classifyBlockedTool } = require('./blockedToolRules');

function toolNameOf(descriptorOrFixture) {
  if (typeof descriptorOrFixture === 'string') {
    return descriptorOrFixture;
  }
  return descriptorOrFixture && (descriptorOrFixture.name || descriptorOrFixture.tool_name);
}

function inputSchemaHashOf(descriptorOrFixture) {
  if (!descriptorOrFixture || typeof descriptorOrFixture === 'string') {
    return undefined;
  }
  return descriptorOrFixture.input_schema_hash || descriptorOrFixture.inputSchemaHash;
}

function blocked(toolName, safeReasonCode, extra = {}) {
  return {
    status: extra.status || 'blocked',
    tool_name: toolName,
    safe_reason_code: safeReasonCode,
    ...extra,
  };
}

function resolveToolDescriptor(descriptorOrFixture) {
  const toolName = toolNameOf(descriptorOrFixture);

  const unsupported = getUnsupportedCapability(toolName);
  if (unsupported) {
    return blocked(toolName, SAFE_REASON_CODES.UNSUPPORTED_TOOL, {
      status: 'unsupported',
      blocker_ids: unsupported.blocker_ids,
      evidence_refs: unsupported.evidence_refs,
    });
  }

  const blockReason = classifyBlockedTool(descriptorOrFixture || { name: toolName });
  if (blockReason) {
    return blocked(toolName, blockReason);
  }

  const semantics = getToolSemantics(toolName);
  if (!semantics) {
    return blocked(toolName, SAFE_REASON_CODES.UNMAPPED_TOOL, { status: 'hidden' });
  }

  const inputSchemaHash = inputSchemaHashOf(descriptorOrFixture);
  if (!inputSchemaHash || inputSchemaHash !== semantics.input_schema_hash) {
    return blocked(toolName, SAFE_REASON_CODES.SCHEMA_DRIFT, {
      status: 'disabled',
      evidence_refs: semantics.evidence_refs,
    });
  }

  return {
    status: 'visible',
    tool_name: toolName,
    semantics,
    matched_input_schema_hash: inputSchemaHash,
  };
}

function resolveCallByName(toolName, inputSchemaHash) {
  return resolveToolDescriptor({ name: toolName, input_schema_hash: inputSchemaHash });
}

function filterVisibleTools(descriptorsOrFixtures) {
  return descriptorsOrFixtures
    .map((descriptor) => resolveToolDescriptor(descriptor))
    .filter((result) => result.status === 'visible');
}

module.exports = {
  resolveToolDescriptor,
  resolveCallByName,
  filterVisibleTools,
};
