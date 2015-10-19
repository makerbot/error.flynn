'use strict';

const name = 'ERROR_FLYNN_URL'
  , os = require('os')
  , Slack = require('slack-node')
  , isEmpty = require('is-empty')
  ;

module.exports = function flynn(url, opt) {
  url = url || process.env[name];
  if (!url) {
    throw new TypeError(`Error Flynn requires parameter 'url' or env. variable ${name}`);
  }
  if (opt && typeof opt !== 'object') {
    throw new TypeError(`'opt' cannot be a ${typeof opt}`);
  }

  const slack = new Slack();
  slack.setWebhook(url);

  return function middleware(err, req, res, next) {
    err.status = err.status || 500;
    let attachment = Object.assign({}, {
      author_name: req.headers.host,
      color: (err.status < 500) ? 'warning' : 'danger',
      fallback: err.message,
      fields: [{
        title: 'HTTP Status',
        value: err.status,
        short: true
      }, {
        title: 'Path',
        value: req.url,
        short: true
      }, {
        title: 'Environment',
        value: req.app.get('env'),
        short: true
      }, {
        title: `CPU Load (${os.cpus().length} cores)`,
        value: os.loadavg().map(load => rnd(load)).join(' – '),
        short: true
      }],
      mrkdwn_in: ['text'],
      title: err.message,
      text: [
        ['Call Stack', err.stack],
        ['Query String', req.query],
        ['Request Body', req.body]
      ].map(data => codeBlock(data[0], data[1])).join('')
    }, opt);

    slack.webhook({ attachments: [attachment] }, function(error, response) {
      if (error) console.error(error);
    });

    next(err);
  };
}

// nicely formatted string for Slack
function codeBlock(title, code) {
  if (isEmpty(code)) return '';
  code = (typeof code == 'string') ? code.trim() : JSON.stringify(code, null, 2);
  const t = '```';
  return `_${title}_${t}${code}${t}\n`;
}

// round to two decimals
function rnd(val) {
  return Math.round(val * 100) / 100;
}
