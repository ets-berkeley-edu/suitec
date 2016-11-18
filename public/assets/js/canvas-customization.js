/**
 * Copyright ©2017. The Regents of the University of California (Regents). All Rights Reserved.
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
 * For the best experience using the SuiteC tools, the customization code below should be added to Canvas.
 * This code allows the tools to adjust the height and scrolling of the parent frame, and to
 * access the parent frame's address bar. This enables:
 *  - A better experience scrolling lengthy lists and viewing large assets;
 *  - Direct links to individual assets and whiteboards;
 *  - Direct links to prepopulated asset and whiteboard searches.
 */

(function(window, document, $) {
  'use strict';

  /**
   * We use window events to interact between the LTI iframe and the parent container.
   * Resizing the iframe based on its content is handled by Instructure's `public/javascripts/tool_inline.js`
   * file, and it determines the message format we use.
   *
   * The following custom events are provided for modifying the URL of the parent container:
   *
   *  - Change the location of the parent container:
   *    ```
   *     {
   *       subject: 'changeParent',
   *       parentLocation: <newLocation>
   *     }
   *    ```
   *
   *  - Change the hash of the parent container:
   *    ```
   *     {
   *       subject: 'setParentHash',
   *       'hash': <newHash>
   *     }
   *    ```
   *
   * The following custom event is provided to retrieve the URL of the parent container:
   *
   *  - Get the location of the parent container:
   *    ```
   *     {
   *       subject: 'getParent'
   *     }
   *    ```
   *
   * The following custom events are provided to support scrolling-related interaction between
   * the LTI iFrame and the parent container:
   *
   *  - Change the height of the LTI iFrame:
   *    ```
   *     {
   *       subject: 'changeParent',
   *       height: <height>
   *     }
   *    ```
   *
   *  - Scroll the parent container to a specified position:
   *    ```
   *     {
   *       subject: 'changeParent',
   *       scrollTo: <scrollPosition>
   *     }
   *    ```
   *
   *  - Scroll the parent container to the top of the screen:
   *    ```
   *     {
   *       subject: 'changeParent',
   *       scrollToTop: true
   *     }
   *    ```
   *
   *  - Get the scroll information of the parent container:
   *    ```
   *     {
   *       subject: 'getScrollInformation'
   *     }
   *    ```
   *
   *    Each of these events will respond with a window event back to the LTI iframe containing the scroll information
   *    for the parent container:
   *    ```
   *     {
   *       iFrameHeight: <currentIframeHeight>,
   *       parentHeight: <currentParentHeight>,
   *       scrollPosition: <currentScrollPosition>,
   *       scrollToBottom: <currentHeightBelowFold>
   *     }
   *    ```
   *
   * @param  {Object}    ev         Event that is sent over from the iframe
   * @param  {String}    ev.data    The message sent with the event. Note that this is expected to be a stringified JSON object
   */
  window.onmessage = function(ev) {
    // Parse the provided event message
    if (ev && ev.data) {
      var message;
      try {
        message = JSON.parse(ev.data);
      } catch (err) {
        // The message is not for us; ignore it
        return;
      }

      var response = null;
      // Event that will modify the URL of the parent container
      if (message.subject === 'changeParent' && message.parentLocation) {
        window.location = message.parentLocation;

      // Event that retrieves the parent container's URL
      } else if (message.subject === 'getParent') {
        response = {
          'location': window.location.href
        };
        ev.source.postMessage(JSON.stringify(response), '*');

      // Event that will modify the hash of the parent container's URL
      } else if (message.subject === 'setParentHash') {
        history.replaceState(undefined, undefined, '#' + message.hash);

      // Events related to scrolling interaction between the LTI iFrame and the parent container
      } else if (message.subject === 'changeParent' || message.subject === 'getScrollInformation') {
        // Scroll to the specified position
        if (message.scrollTo !== undefined) {
          window.scrollTo(0, message.scrollTo);
        // Scroll to the top of the current window
        } else if (message.scrollToTop) {
          window.scrollTo(0, 0);
        } else if (message.height !== undefined) {
          if (!message.height || message.height < 450) {
            message.height = 450;
          }
          $('.tool_content_wrapper').height(message.height).data('height_overridden', true);
        }

        // Respond with a window event back to the LTI iframe containing the scroll information for the parent container
        if (ev.source) {
          var iFrameHeight = $('.tool_content_wrapper').height();
          var parentHeight = $(document).height();
          var scrollPosition = $(document).scrollTop();
          var scrollToBottom = parentHeight - $(window).height() - scrollPosition;
          response = {
            'iFrameHeight': iFrameHeight,
            'parentHeight': parentHeight,
            'scrollPosition': scrollPosition,
            'scrollToBottom': scrollToBottom
          };
          ev.source.postMessage(JSON.stringify(response), '*');
        }
      }
    }
  };

})(window, window.document, window.$);
