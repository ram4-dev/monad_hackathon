'use strict';

module.exports = {
  ...require('./sanitizeContext'),
  ...require('./azureClient'),
  ...require('./finalSafetyReview'),
};
