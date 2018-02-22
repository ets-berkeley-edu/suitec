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

(function(angular) {

  'use strict';

  angular.module('collabosphere').service('collaborationMessageService', function(
    me,
    userFactory,
    utilService,
    $alert,
    $modal,
    $rootScope
  ) {

    /**
     * Show a notification after sending a collaboration message
     *
     * @param  {String}      type          Notification type: 'success' or 'error'
     * @param  {String}      content       Notification text
     * @return {void}
     */
    var showNotification = function(type, content) {
      $alert({
        'container': '#notifications-placeholder',
        'content': content,
        'duration': 3,
        'keyboard': true,
        'show': true,
        'templateUrl': 'notifications-template',
        'type': type
      });
    };

    /**
     * Send a collaboration invite message
     *
     * @param  {User}        recipient         The user receiving the message
     * @param  {String}      messageBody       Message body text
     * @return {Promise}                       $http Promise
     */
    var sendCollaborationInvite = function(recipient, messageBody) {
      return userFactory.messageUser(recipient.id, 'Looking to Collaborate', messageBody).then(function() {
        showNotification('success', 'Your message was sent to <strong>' + recipient.canvas_full_name + '</strong>.');
      }).catch(function() {
        showNotification('danger', 'There was an error sending your message.');
      });
    };

    /**
     * Launch the collaboration message modal window
     *
     * @param  {User}        recipient         The user receiving the message
     * @return {void}
     */
    var launchCollaborationModal = function(recipient) {
      // Create a new scope for the modal dialog
      var scope = $rootScope.$new(true);
      scope.me = me;
      scope.recipient = recipient;
      scope.closeModal = function(messageBody) {
        var modal = this;
        var removeModal = function() {
          modal.$hide();
          modal.$destroy();
        };
        if (messageBody) {
          sendCollaborationInvite(recipient, messageBody).then(removeModal);
        } else {
          removeModal();
        }
      };
      $modal({
        'animation': false,
        'backdrop': false,
        'scope': scope,
        'templateUrl': '/app/shared/collaborationMessageModal.html'
      });
      utilService.scrollToTop();
    };

    return {
      'launchCollaborationModal': launchCollaborationModal
    };

  });

}(window.angular));
