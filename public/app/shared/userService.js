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

  angular.module('collabosphere').service('userService', function(userFactory, $q) {

    // Variable that caches the profile information for the current user
    var me = null;

    /**
     * Retrieve the profile information for the current user. This will only be retrieved once
     *
     * @return {Promise<Me>}                      Promise returning the profile information for the current user
     */
    var getMe = function() {
      var deferred = $q.defer();
      if (!me) {
        userFactory.getMe().success(function(retrievedMe) {
          me = retrievedMe;
          deferred.resolve(me);
        });
      } else {
        deferred.resolve(me);
      }
      return deferred.promise;
    };

    return {
      getMe: getMe
    };

  });

}(window.angular));
