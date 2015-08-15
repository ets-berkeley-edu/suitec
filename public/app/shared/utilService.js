/*!
 * Copyright 2015 UC Berkeley (UCB) Licensed under the
 * Educational Community License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License. You may
 * obtain a copy of the License at
 *
 *     http://opensource.org/licenses/ECL-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an "AS IS"
 * BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

(function(angular) {

  'use strict';

  angular.module('collabosphere').service('utilService', function($location, $q, $rootScope, $state, $timeout) {

    // Cache the API domain and Course ID that were passed in through
    // the iFrame launch URL. These variables need to be used to construct
    // the base URL for all REST API requests
    var apiDomain = $location.search().api_domain;
    var courseId = $location.search().course_id;
    var toolUrl = $location.search().tool_url;

    /**
     * Get the parameters that were passed in through the iFrame launch URL
     *
     * @return {Object}                       The parameters that were passed in through the iFrame launch URL
     */
    var getLaunchParams = function() {
      var launchParams = {
        'apiDomain': apiDomain,
        'courseId': courseId,
        'toolUrl': toolUrl
      };
      return launchParams;
    };

    /**
     * Construct the full URL for a REST API request. All REST API requests should
     * be of the form `/api/<apiDomain>/<courseId>/<restAPI>`
     *
     * @param  {String}       url             The REST API for which the full REST API URL should be constructed
     * @return {String}                       The full REST API URL of the form `/api/<apiDomain>/<courseId>/<restAPI>`
     */
    var getApiUrl = function(url) {
      return '/api/' + apiDomain + '/' + courseId + url;
    };

    /**
     * Get the external tool URL for the current LTI tool placement
     */
    var getToolUrl = function() {
      return toolUrl;
    };

    /**
     * Adjust the height of the current iFrame to the size of its content.
     * This will only happen when Collabosphere is embedded as an LTI tool in
     * a different application
     */
    var resizeIFrame = function() {
      postIFrameMessage(function() {
        var height = document.body.offsetHeight;
        return {
          'subject': 'changeParent',
          'height': height
        };
      });
    };

    // Continuously check if there have been any changes to the content of the page
    // and resize accordingly
    setInterval(resizeIFrame, 250);

    /**
     * Scroll to the top of the window. When Collabosphere is being run stand-alone,
     * it will scroll the current window to the top. When Collabosphere is being run
     * as a BasicLTI tool, it will scroll the parent window to the top
     */
    var scrollToTop = function() {
      // Always scroll the current window to the top
      window.scrollTo(0, 0);
      // When running Collabosphere as a BasicLTI tool, also scroll
      // the parent window to the top
      postIFrameMessage(function() {
        return {
          'subject': 'changeParent',
          'scrollToTop': true
        };
      });
    };

    /**
     * Scroll the window to a specified position. When Collabosphere is being run stand-alone,
     * it will scroll the current window to the specified position. When Collabosphere is being run
     * as a BasicLTI tool, it will scroll the parent window to the specified position
     *
     * @param  {Number}           position            The vertical scroll position to scroll to
     */
    var scrollTo = function(position) {
      // When running Collabosphere as a BasicLTI tool, scroll the parent window
      if (window.parent) {
        postIFrameMessage(function() {
          return {
            'subject': 'changeParent',
            'scrollTo': position
          };
        });
      // Otherwise, scroll the current window
      } else {
        window.scrollTo(0, position);
      }
    };

    /**
     * Get the current scroll information. When Collabosphere is being run stand-alone,
     * it will return the scroll position of the current window. When Collabosphere is being run
     * as a BasicLTI tool, it will return the scroll information of the parent window
     *
     * @return {Promise<Object>}                      Promise returning the current scroll information
     */
    var getScrollInformation = function() {
      var deferred = $q.defer();
      // When running Collabosphere as a BasicLTI tool, request the scroll position of the parent window
      if (window.parent) {
        postIFrameMessage(function() {
          return {
            'subject': 'getScrollInformation'
          };
        }, function(response) {
          deferred.resolve(response);
        });
      // Otherwise, retrieve the scroll information of the current window
      } else {
        var scrollPosition = (window.pageYOffset || document.documentElement.scrollTop) - (document.documentElement.clientTop || 0);
        var scrollToBottom =  document.body.offsetHeight - scrollPosition - document.documentElement.clientHeight;
        deferred.resolve({
          'scrollPosition': scrollPosition,
          'scrollToBottom': scrollToBottom
        });
      }
      return deferred.promise;
    };

    /**
     * Get the full URL of the parent container
     *
     * @param  {Function}   callback          Standard callback function
     * @param  {String}     callback.url      The URL of the parent container
     */
    var getParentUrl = function(callback) {
      postIFrameMessage(function() {
        return {
          'subject': 'getParent'
        };
      }, function(data) {
        data = data || {};
        return callback(data.location);
      });
    };

    /**
     * Set the parent's container hash
     *
     * @param {String}  hash    The value to set the parent's container hash value to
     */
    var setParentHash = function(hash) {
      postIFrameMessage(function() {
        return {
          'subject': 'setParentHash',
          'hash': hash
        };
      });
    };

    /**
     * Utility function used to send a window event to the parent container. When running
     * Collabosphere as a BasicLTI tool, this is our main way of communicating with the container
     * application
     *
     * @param  {Function}   messageGenerator                          Function that will return the message to send to the parent container
     * @param  {Function}   [messageCallback]                         Function that will be called when a response from the parent container has been received
     * @param  {Number}     [messageCallback.currentIframeHeight]     The height of the LTI iFrame
     * @param  {Number}     [messageCallback.currentParentHeight]     The full height of the parent container
     * @param  {Number}     [messageCallback.currentScrollPosition]   The scroll position within the parent container
     * @param  {Number}     [messageCallback.scrollToBottom]          The distance between the bottom of the browser and the bottom of the page
     * @api private
     */
    var postIFrameMessage = function(messageGenerator, messageCallback) {
      // Only try to send the event when a parent container is present
      if (window.parent) {
        // Wait until Angular has finished rendering items on the screen
        $timeout(function() {
          // Give each message a unique id so we can send multiple messages concurrently
          var messageId = Math.floor(Math.random() * 10000);

          // The parent container will respond with a message into the current window containing
          // the scroll information of the parent window
          if (messageCallback) {
            var callback = function(ev) {
              if (ev && ev.data) {
                var message;
                try {
                  message = JSON.parse(ev.data);
                } catch (err) {
                  // The message is not for us; ignore it
                  return;
                }
                if (message && message.messageId === messageId) {
                  messageCallback(message);
                  window.removeEventListener('message', callback);
                }
              }
            };
            window.addEventListener('message', callback);
          }

          // Retrieve the message to send to the parent container. Note that we can't pass the
          // message directly into this function, as we sometimes need to wait until Angular has
          // finished rendering before we can determine what message to send
          var message = messageGenerator();
          message.messageId = messageId;
          // Send the message to the parent container as a stringified object
          window.parent.postMessage(JSON.stringify(message), '*');
        });
      }
    };

    // If the LTI tools are running in an iFrame we get the parent container's URL. This allows for
    // linking to states such as an asset profile directly
    if (window.parent) {
      getParentUrl(function(url) {
        url = url || '';

        // Check if an asset was linked directly
        var assetMatch = url.match(/col_asset=([0-9]+)/);
        if (assetMatch && assetMatch[1]) {
          var assetId = parseInt(assetMatch[1], 10);
          $state.go('assetlibrarylist.item', {'assetId': assetId});
        }

        // Check if a search was linked directly
        var searchKeywordsMatch = url.match(/col_keywords=(.+?)&/);
        var searchCategoryMatch = url.match(/col_category=([0-9]+)&/);
        var searchUserMatch = url.match(/col_user=([0-9]+)&/);
        var searchTypeMatch = url.match(/col_type=(.+?)&/);
        if (searchKeywordsMatch || searchCategoryMatch || searchUserMatch || searchTypeMatch) {
          var searchOptions = {
            'keywords': (searchKeywordsMatch ? searchKeywordsMatch[1] : ''),
            'category': (searchCategoryMatch ? searchCategoryMatch[1] : ''),
            'user': (searchUserMatch ? searchUserMatch[1] : ''),
            'type': (searchTypeMatch ? searchTypeMatch[1] : '')
          };
          $state.go('assetlibrarylist', searchOptions);
        }
      });
    }

    return {
      'getApiUrl': getApiUrl,
      'getLaunchParams': getLaunchParams,
      'getParentUrl': getParentUrl,
      'getScrollInformation': getScrollInformation,
      'getToolUrl': getToolUrl,
      'resizeIFrame': resizeIFrame,
      'scrollTo': scrollTo,
      'scrollToTop': scrollToTop,
      'setParentHash': setParentHash
    };

  });

}(window.angular));
