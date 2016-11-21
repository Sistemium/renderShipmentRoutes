'use strict';

const _ = require('lodash');
const async = require('async');
const request = require('request-promise');

const API = process.env.API || 'http://localhost:9090/api/dr50/';
const TOKEN = process.env.TOKEN;
const REPORTS = process.env.REPORTS || 'http://localhost:8999/report';

const shipmentRouteConfig = {
  url: API + 'ShipmentRoute',
  json: true,
  headers: {
    authorization: TOKEN
  }
};

module.exports = {
  run: run
};

/*
 Functions
 */

function run (event, context, callback) {

  const date = _.isString(event) ? event : '2016-11-09';

  console.log('Start with date:', date);

  return request.get(_.assign({
    qs: {
      date: date
    }
  }, shipmentRouteConfig))
    .then(processRoutes)
    .then(result => {
      if (_.isFunction(callback)) {
        callback(null, result);
      }
    })
    .catch(err => {
      if (_.isFunction(callback)) {
        callback(err);
      }
    });

}

function processRoutes(data) {

  let routes = _.filter(data, 'routePointsAgg.reachedCnt');

  console.log('Routes count:', routes.length, 'of', data.length);

  if (!routes.length) {
    return;
  }

  let series = _.map(routes, function (route) {
    return function (done) {

      console.log('Start processing route:', route.id);

      renderPicture(route)
        .then(function (mapSrc) {
          console.log('Done:', mapSrc);
          return saveRouteData(route, mapSrc);
        })
        .then(function(){
          done(null, route.mapSrc);
        })
        .catch(done);
    }
  });

  return new Promise((resolve, reject) => {
    async.series(series, function (err, data) {

      if (err) {
        reject(err);
        return console.error(err);
      }

      console.log('Success:', data.length);

      resolve({
        routes: data.length
      });

    });
  });

}

function renderPicture(route) {

  let config = {
    url: REPORTS,
    followRedirect: false,
    resolveWithFullResponse: true,
    qs: {
      path: `${TOKEN}/srrm/${route.id}?saveData`,
      format: 'png'
    }
  };

  return request.get(config)
    .then(function (response) {
      console.log(response);
    })
    .catch(function (err) {
      if (err.statusCode == 302) {
        return _.get(err, 'response.headers.location');
      }
      throw new Error(err);
    });

}

function saveRouteData(route, mapSrc) {

  let config = _.defaults({
    url: `${shipmentRouteConfig.url}/${route.id}`,
    qs: {
      mapSrc: mapSrc
    },
  }, shipmentRouteConfig);

  return request.patch(config)
    .then(function (response) {
      console.log('saveRouteData success');
      return response;
    });

}
