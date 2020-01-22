/**
 * Copyright ©2020. The Regents of the University of California (Regents). All Rights Reserved.
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

var _ = require('lodash');
var bunyan = require('bunyan');
var config = require('config');
var moment = require('moment-timezone');
var path = require('path');
var prettyStream = require('bunyan-prettystream');

// The logger to use when no logger is specified
var SYSTEM_LOGGER_NAME = 'system';

// The default log location
var DEFAULT_LOG_LOCATION = './logs/default.log';

// Variable that keeps track of all initialized loggers
var loggers = {};

// Stream for logging to stdout. We turn off colors because the escape codes are too noisy in too many contexts.
var prettyStdOut = new prettyStream({'useColor': false});
prettyStdOut.pipe(process.stdout);

/**
 * Get a logger for the specified name. If the logger doesn't exist yet, a new one will be created
 * using the configuration settings
 *
 * @param  {String}     name    The name of the logger
 * @return {Object}             The Bunyan logger for the specified name
 */
module.exports = function(name) {
  name = name || SYSTEM_LOGGER_NAME;

  // Create a new logger if a logger for the specified name doesn't exist yet
  if (!loggers[name]) {
    loggers[name] = createLogger(name);
  }

  return loggers[name];
};

/**
 * Create a logger with the provided name
 *
 * @param  {String}     name    The name of the logger to create
 * @api private
 */
var createLogger = function(name) {
  var logConfig = {
    'name': name,
    'serializers': {
      'err': bunyan.stdSerializers.err,
      'req': bunyan.stdSerializers.req,
      'res': bunyan.stdSerializers.res
    },
    'streams': []
  };

  var configuredLogLevel = config.get('log.level');
  var configuredLogStream = config.get('log.stream');

  // Pretty-print the logs to standard out
  if (configuredLogStream === 'stdout') {
    logConfig.streams.push({
      'level': configuredLogLevel,
      'stream': prettyStdOut
    });

  // If the configured log stream is an object we tack on the log level and pass it on as-is. This
  // allows us to use any of bunyan's configuration options
  } else if (_.isObject(configuredLogStream)) {
    configuredLogStream.level = configuredLogLevel;
    logConfig.streams.push(configuredLogStream);

  // If the configured log stream is not an object, it's assumed that it is a path to a file
  // on disk
  } else {
    logConfig.streams.push({
      'level': configuredLogLevel,
      'path': configuredLogStream
    });
  }

  // Create the Bunyan logger
  var logger = bunyan.createLogger(logConfig);

  // Wrap all logger functions with timezone and error handling
  logger.trace = wrapLogger(name, logger.trace);
  logger.debug = wrapLogger(name, logger.debug);
  logger.info = wrapLogger(name, logger.info);
  logger.warn = wrapLogger(name, logger.warn);
  logger.error = wrapLogger(name, logger.error);
  logger.fatal = wrapLogger(name, logger.fatal);

  return logger;
};

/**
 * Wrap logger functions
 *
 * @param  {String}     loggerName          The name of the logger for which the function will be wrapped
 * @param  {Function}   loggerFunction      The logger function to wrap
 * @return {Function}                       The wrapped logger function
 * @api private
 */
var wrapLogger = function(loggerName, loggerFunction) {
  return function() {
    var messageParams = Array.prototype.slice.call(arguments);

    applyTimezone(messageParams);
    handleErrors(messageParams);

    // Pass control back to Bunyan for message logging
    return loggerFunction.apply(this, messageParams);
  };
};

/**
 * Add timezone-aware timestamps to a log message
 *
 * @param  {Array}     messageParams          Log message parameters
 * @api private
 */
var applyTimezone = function(messageParams) {
  var timezone = config.get('timezone');
  var time = moment().tz(timezone).format();

  // If the first argument is an object, add the time property
  if (typeof messageParams[0] === 'object') {
    messageParams[0].time = time;
  // Otherwise prepend the time in a new object argument
  } else {
    messageParams.unshift({'time': time});
  }
};

/**
 * Wrap logger functions to better handle error objects
 *
 * @param  {Array}     messageParams          Log message parameters
 * @api private
 */
var handleErrors = function(messageParams) {
  var messageData = messageParams[0];

  // If the message data includes an 'err' object, rename it to 'error' (a grotesque workaround needed
  // to keep bunyan-prettystream from swallowing it).
  if ((typeof messageData === 'object') && messageData.err) {
    // Prefer the `err.parent` object if present, as in the case of sequelizejs errors
    // that contains more pertinent information about what went wrong
    if (messageData.err.parent) {
      messageData.error = messageData.err.parent;
    } else {
      messageData.error = messageData.err;
    }
    delete messageData.err;
  }
};
