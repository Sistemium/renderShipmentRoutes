'use strict';

const _ = require('lodash');
const async = require('async');
const request = require('request-promise');


module.exports.run = run;

/*
 Functions
 */

function run(date, pool) {

  console.log('Start with date:', date, 'pool:', pool);

  if (!pool) {
    return Promise.reject('pool not specified');
  }

  const helpers = require('../helpers').helpers(pool);

  const {requestConfig} = helpers;

  return request.get(requestConfig('VisitReport', {qs: {date: date}}))
    .then(processRoutes);

  function renderPicture(salesmanId) {

    let reportPath = `visitReportMap/${date}`;

    return helpers.renderPicture(date, salesmanId, reportPath, 'VisitRoute');

    // return helpers.renderPicture(date, route.id, 'srrm', 'ShippingRoute');

  }

  function saveRouteData(salesmanId, mapSrc) {

    let getRouteConfig = requestConfig(`VisitMapReport`, {qs: {date, salesmanId}});

    return request.get(getRouteConfig)
      .then(_.first)
      .then(route => {

        let config = requestConfig(`VisitMapReport/${route.id}`, {qs: {mapSrc: mapSrc}});

        return request.patch(config)
          .then(response => {
            console.log(`saveRouteData success ${route.id}`);
            return response;
          });

      });

  }


  function processRoutes(data) {

    let routes = _.map(_.groupBy(data, 'salesmanId'), (visits, salesmanId) => {
      return salesmanId;
    });

    console.log('Routes count:', routes.length, 'of', routes.length);

    if (!routes.length) {
      console.log('No visitsReport data');
      return;
    }

    let series = _.map(routes, (salesmanId, idx) => {
      return (done) => {

        console.log('Start processing route #', idx, 'salesmanId:', salesmanId);

        renderPicture(salesmanId)
          .then(mapSrc => {
            console.log('Done route:', idx, mapSrc);
            return saveRouteData(salesmanId, mapSrc);
          })
          .then(route => done(null, route.mapSrc))
          .catch(error => {
            console.error('Error rendering id:', salesmanId, error.toString());
            done(error);
          });

      }
    });

    return new Promise((resolve, reject) => {

      async.series(series, (err, data) => {

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
