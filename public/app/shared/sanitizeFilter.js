/**
 * Copyright (c) 2015 "Fronteer LTD". All rights reserved.
 */

(function(angular) {

    'use strict';

    angular.module('collabosphere').filter('sanitize', function($sce) {
        return function(htmlCode){
          return $sce.trustAsHtml(htmlCode);
        };
    });
})(window.angular);
