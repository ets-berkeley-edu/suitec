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
var config = require('config');
var ejs = require('ejs');
var EventEmitter = require('events').EventEmitter;
var EmailTemplate = require('email-templates').EmailTemplate;
var fs = require('fs');
var JoiUri = require('joi/lib/string/uri');
var path = require('path');
var moment = require('moment-timezone');

var log = require('col-core/lib/logger')('col-core/email');

// Used to cache the compiled email templates
var cachedEmailTemplates = {};

var sendgrid = null;
var mailHelper = null;
var emailEnabled = config.get('email.enabled');

if (emailEnabled) {
  sendgrid = require('sendgrid')(config.get('email.apiKey'));
  mailHelper = require('sendgrid').mail;
}

// When in debug mode (tests/development), we will emit emails
var emitter = module.exports = new EventEmitter();

var EVENT_NAMES = module.exports.EVENT_NAMES = {
  'EMAIL_SENT': 'emailSent'
};

// Variable that maps the original image paths to their hashed counter parts (if any)
var imageManifest = {};

// Cache the image manifest
var manifestPath = path.resolve(config.get('apache.documentRoot'), 'images-rev-manifest.json');
if (fs.existsSync(manifestPath)) {
  try {
    imageManifest = require(manifestPath);
  } catch (err) {
    log.error({
      'err': err,
      'path': manifestPath
    }, 'Unable to read the image manifest');
  }
} else {
  log.info({
    'documentRoot': config.get('apache.documentRoot')
  }, 'No image manifest found in the document root. Using development assets');
}

/**
 * Send an email to a user.
 *
 * The email will be sent with the following from headers:
 *  - from email address: noreply@<the course' canvas instance api domain>
 *  - from name: The course name or "The Asset Library and Whiteboards" if there's no configured name
 *
 * @param  {String}       subject           The subject of the email
 * @param  {User}         user              The user to send the email to. It's expected that this user object has a correct email value for the `canvas_email` property
 * @param  {Course}       course            The course the user belongs to
 * @param  {Object}       data              The data that is used in the email template
 * @param  {String}       emailTemplate     The folder under ~/email-templates that should be used as the email template
 * @param  {Function}     callback          Standard callback function
 * @param  {Object}       callback.err      An error object, if any
 */
var sendEmail = module.exports.sendEmail = function(subject, user, course, data, emailTemplate, callback) {
  // Get the compiled email template and cache it if we haven't seen it yet
  var templateDir = path.join(__dirname, '..', '..', '..', 'email-templates', emailTemplate);
  var template = cachedEmailTemplates[templateDir];
  if (!template) {
    template = new EmailTemplate(templateDir);
    cachedEmailTemplates[templateDir] = template;
  }

  var baseCollabosphereProtocol = (config.get('app.https') ? 'https' : 'http');
  var baseCollabosphereUrl = baseCollabosphereProtocol + '://' + config.get('app.host');
  var timezone = config.get('timezone');

  // Add a few helper functions / data points that can be used in the email templates
  data = _.extend({
    // Data points that can be used in the email templates
    'user': user,
    'course': course,
    'baseCollabosphereUrl': baseCollabosphereUrl,

    // Helper functions
    '_': _,

    /**
     * Take a UTC date object and format it.
     *
     * @param  {Date}     date    The date object to format
     * @return {String}           The formatted date object. e.g., February 10 at 2:03 PM
     */
    'formatDate': function(date) {
      return moment(date).tz(timezone).format('MMMM D \\a\\t h:mm A');
    },

    /**
     * Resolve the hashed URL for a static asset
     *
     * @param  {String}   assetPath     The path to the asset (including leading /)
     * @return {String}                 The path to the hashed asset if it exists, the original `assetPath` otherwise
     */
    'resolveAsset': function(assetPath) {
      var key = assetPath.substr(1);
      if (imageManifest[key]) {
        return '/static/' + imageManifest[key];
      }

      return assetPath;
    },

    /**
     * Format URIs as proper HTML links
     *
     * @param  {String}   str   The string to replace the URIs in
     * @return {String}         The string with the replaced URIs
     */
    'formatLinks': function(str) {
      // Rely on Joi's URI regex to detect links
      var re = JoiUri.createUriRegex();
      return str
              .split(' ')
              .map(function(s) {
                return s.replace(re, '<a href="$&">$&</a>');
              })
              .join(' ');
    }
  }, data);

  // Render the email template
  template.render(data, function(err, results) {
    if (err) {
      log.error({
        'emailTemplate': emailTemplate,
        'err': err,
        'user': user.id
      }, 'Failed to generate an email body for a user');
      return callback(err);
    }

    // Send the actual email
    return _sendEmail(subject, user, course, results, callback);
  });
};

/**
 * Send an email to a user.
 *
 * @param  {String}       subject           The subject of the email
 * @param  {User}         user              The user to send the email to. It's expected that this user object has a correct email value for the `canvas_email` property
 * @param  {Course}       course            The course the user belongs to
 * @param  {Object}       data              The data that should go in the email
 * @param  {String}       data.html         The HTML body of the email
 * @param  {String}       data.text         The text body of the email
 * @param  {Function}     callback          Standard callback function
 * @param  {Object}       callback.err      An error object, if any
 * @api private
 */
var _sendEmail = function(subject, user, course, data, callback) {
  // If the user has no email address, we can't send them an email
  if (!user.canvas_email) {
    return callback();
  }

  var from = 'noreply@' + course.canvas.canvas_api_domain.split(':')[0];
  var fromName = course.name || 'The Asset Library and Whiteboards';

  var emailData = {
    'to': user.canvas_email,
    'toname': user.canvas_full_name,
    'from': from,
    'fromname': fromName,
    'subject': subject,
    'html': data.html,
    'text': (data.text || ' ')
  };
  log.debug(emailData, 'Sending out an email');

  // If we're not configured to send emails we log them
  if (!emailEnabled) {
    emitter.emit(EVENT_NAMES.EMAIL_SENT, emailData, user, course);
    return callback();

  // Otherwise we send the email through SendGrid's API
  } else {
    var mail = new mailHelper.Mail();
    mail.setFrom(new mailHelper.Email(emailData.from, emailData.fromname));

    var personalization = new mailHelper.Personalization();
    personalization.addTo(new mailHelper.Email(emailData.to, emailData.toname));
    mail.addPersonalization(personalization);

    mail.setSubject(emailData.subject);
    mail.addContent(new mailHelper.Content('text/plain', emailData.text));
    mail.addContent(new mailHelper.Content('text/html', emailData.html));

    var request = sendgrid.emptyRequest({
      'method': 'POST',
      'path': '/v3/mail/send',
      'body': mail.toJSON()
    });

    sendgrid.API(request, function(err, response) {
      if (err) {
        log.error({'err': err, 'user': user.id}, 'Unable to send an email to a user');
        return callback({'code': 500, 'msg': 'Unable to send an email to a user'});
      }

      emitter.emit(EVENT_NAMES.EMAIL_SENT, emailData, user, course);

      return callback();
    });
  }
};
