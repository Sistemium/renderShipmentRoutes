const API = process.env.API || 'http://localhost:9090/api';
const TOKEN = process.env.TOKEN;
const REPORTS = process.env.REPORTS || 'http://localhost:8999/report';

const request = require('request-promise');
const _ = require('lodash');


module.exports.helpers = helpers;


function helpers(pool) {

  return {requestConfig, renderPicture};

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

  function renderPicture(date, id, reportPath, folder) {

    let config = {
      url: REPORTS,
      followRedirect: false,
      resolveWithFullResponse: true,
      qs: {
        path: `${TOKEN}/${pool}/${reportPath}/${id}?saveData`,
        format: 'png',
        filename: `${folder}/${date}/${id}_map.png`
      }
    };

    return request.get(config)
      .then(response => {
        console.log(response);
      })
      .catch(err => {

        if (err.statusCode === 302) {
          return _.get(err, 'response.headers.location');
        }

        throw new Error(err);

      });

  }

}
