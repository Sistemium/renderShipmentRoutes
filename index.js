'use strict';

const _ = require('lodash');

module.exports.handler = handler;

function getAlias(context) {

  let name = _.get(context, 'functionName');
  let arn = _.get(context, 'invokedFunctionArn');

  if (name && arn) {
    return _.last(arn.match(new RegExp(name+':(.*)')));
  }

}

function getYesterday() {
  let date = new Date(new Date().setDate(new Date().getDate()-1));
  return date.toISOString().substr(0,10);
}

function handler(event, context, callback) {

  const date = _.isString(event) ? event : (event.date || getYesterday());
  const pool = _.get(event, 'pool') || getAlias(context) || 'dr50';
  const task = _.get(event, 'task') || 'shipmentMonitoring';
  const params = _.get(event, 'params') || {};

  console.log('Handler start with event:', event);
  console.log('Handler start with context:', context);

  const service = require(`./tasks/${task}`);

  return service.run(date, pool, params)
    .then(result => callback(null, result))
    .catch(err => {
      console.error(err);
      callback(err);
    });

}
