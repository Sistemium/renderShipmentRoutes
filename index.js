'use strict';

const service = require('./service');
const _ = require('lodash');

module.exports.handler = handler;

function handler(event, context, callback) {

  const date = _.isString(event) ? event : '2016-11-09';

  return service.run(date)
    .then(result => callback(null, result))
    .catch(err => callback);

}
