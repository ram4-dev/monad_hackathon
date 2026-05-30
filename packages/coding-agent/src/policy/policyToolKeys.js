'use strict';

const { keccak256 } = require('./keccak256');

function toolKey(toolName) {
  return keccak256(toolName);
}

module.exports = { toolKey };
