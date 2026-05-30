'use strict';

module.exports = {
  ...require('./evidenceExtractors'),
  ...require('./consentGate'),
  ...require('./actionCoverage'),
};
