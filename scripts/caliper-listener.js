/**
 * Copyright ©2018. The Regents of the University of California (Regents). All Rights Reserved.
 *
 * Permission to use, copy, modify, and distribute this software and its documentation
 * for educational, research, and not-for-profit purposes, without fee and without a
 * signed licensing agreement, is hereby granted, provided that the above copyright
 * notice, this paragraph and the following two paragraphs appear in all copies,
 * modifications, and distributions.
 *
 * Contact The Office of Technology Licensing, UC Berkeley, 2150 Shattuck Avenue,
 * Suite 510, Berkeley, CA 94720-1620, (510) 643-7201, otl@berkeley.edu,
 * http://ipira.berkeley.edu/industry-info for commercial licensing opportunities.
 *
 * IN NO EVENT SHALL REGENTS BE LIABLE TO ANY PARTY FOR DIRECT, INDIRECT, SPECIAL,
 * INCIDENTAL, OR CONSEQUENTIAL DAMAGES, INCLUDING LOST PROFITS, ARISING OUT OF
 * THE USE OF THIS SOFTWARE AND ITS DOCUMENTATION, EVEN IF REGENTS HAS BEEN ADVISED
 * OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 * REGENTS SPECIFICALLY DISCLAIMS ANY WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE. THE
 * SOFTWARE AND ACCOMPANYING DOCUMENTATION, IF ANY, PROVIDED HEREUNDER IS PROVIDED
 * "AS IS". REGENTS HAS NO OBLIGATION TO PROVIDE MAINTENANCE, SUPPORT, UPDATES,
 * ENHANCEMENTS, OR MODIFICATIONS.
 */

/**
 * This script enables local verification of Caliper instrumentation. To use it, enable Caliper in your
 * local config and set the URL to a localhost address, e.g.:
 *
 * {
 *   "analytics": {
 *     "caliper": {
 *       "enabled": true,
 *       "url": "http://localhost:2525/events"
 *     }
 *   }
 * }
 *
 * Then start this script (`node scripts/caliper-listener.js`) in a separate terminal window. It will
 * pick up the URL from your config and log the body of any POST request received.
 */

var bodyParser = require('body-parser');
var config = require('config');
var express = require('express');
var http = require('http');
var url = require('url');
var util = require('util');

var log = require('col-core/lib/logger')('caliper-listener');

var app = express();
app.httpServer = http.createServer(app);

var caliperUrl = url.parse(config.get('analytics.caliper.url'));
app.httpServer.listen(caliperUrl.port, caliperUrl.hostname);

app.use(bodyParser.json({'extended': false}));

app.post(caliperUrl.pathname, function(req, res) {
  log.info({'requestBody': req.body}, 'Received POST request');
  res.sendStatus(201);
});

log.info(util.format('Listening on %s, will log POST requests', caliperUrl.href));
