'use strict';

const service = require('./service');
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

  console.log('Handler start with event:', event);
  console.log('Handler start with context:', context);

  return service.run(date, pool)
    .then(result => callback(null, result))
    .catch(err => {
      console.error(err);
      callback(err);
    });

}
