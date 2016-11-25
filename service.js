'use strict';

const _ = require('lodash');
const async = require('async');
const request = require('request-promise');

const API = process.env.API || 'http://localhost:9090/api';
const TOKEN = process.env.TOKEN;
const REPORTS = process.env.REPORTS || 'http://localhost:8999/report';

module.exports.run = run;

/*
 Functions
 */

function run(date, pool) {

  console.log('Start with date:', date, 'pool:', pool);

  if (!pool) {
    return Promise.reject('pool not specified');
  }

  return request.get(requestConfig('ShipmentRoute', {qs: {date: date}}))
    .then(processRoutes)
    .then(saveReportData);


  function saveReportData(data) {
    let config = requestConfig('ShipmentMonitoringReport', {qs: {date: date}});
    return request.get(config)
      .then(existing => {
        if (!existing) {
          existing = [{date: date}];
        }
        let body = _.assign(_.first(existing), data);
        return request.patch(_.assign(config, {body: body}));
      });
  }

  function requestConfig(resource, config) {
    return _.assign({
      url: `${API}/${pool}/${resource}`,
      json: true,
      headers: {
        authorization: TOKEN,
        'x-page-size': 1000
      }
    }, config);
  }

  function renderPicture(route) {

    let config = {
      url: REPORTS,
      followRedirect: false,
      resolveWithFullResponse: true,
      qs: {
        path: `${TOKEN}/${pool}/srrm/${route.id}?saveData`,
        format: 'png',
        filename: `ShippingRoute/${route.date}/${route.id}_map.png`
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

    let config = requestConfig(`ShipmentRoute/${route.id}`, {qs: {mapSrc: mapSrc}});

    return request.patch(config)
      .then(function (response) {
        console.log('saveRouteData success');
        return response;
      });

  }


  function processRoutes(data) {

    let routes = _.filter(data, 'routePointsAgg.reachedCnt');

    console.log('Routes count:', routes.length, 'of', data.length);

    if (!routes.length) {
      console.log(data);
      return;
    }

    let series = _.map(routes, function (route, idx) {
      return function (done) {

        console.log('Start processing route #', idx, 'id:', route.id);

        renderPicture(route)
          .then(function (mapSrc) {
            console.log('Done:', mapSrc);
            return saveRouteData(route, mapSrc);
          })
          .catch(error => console.error('Error rendering id:', route.id, error))
          .then(() => done(null, route.mapSrc));
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
          cnt: data.length
        });

      });
    });

  }


}
