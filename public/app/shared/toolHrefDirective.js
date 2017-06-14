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

(function(angular) {

  'use strict';

  /**
   * Constructs URLs for linking from one SuiteC LTI tool to another.
   */
  angular.module('collabosphere').directive('toolHref', function(utilService) {
    return {
      // Directive matches on attribute name.
      // @see https://docs.angularjs.org/guide/directive#template-expanding-directive
      restrict: 'A',

      // @see https://docs.angularjs.org/guide/directive#isolating-the-scope-of-a-directive
      scope: {
        tool: '=',
        id: '=',
        scroll: '=',
        referringTool: '=',
        referringId: '=',
        referringScroll: '='
      },

      'link': function(scope, elem, attrs) {
        scope.$watch('id', function() {
          // 'id' and 'referring-tool' attributes may specify either a variable name (the evaluated value
          // of which appears under 'scope'), or a string literal (which appears under 'attrs').
          var id = scope.id || attrs.id;
          var scroll = scope.scroll || attrs.scroll;
          var referringTool = scope.referringTool || attrs.referringTool;
          var referringScroll = scope.referringScroll || attrs.referringScroll;

          elem.attr('href', utilService.getToolHref(attrs.tool, id, scroll, referringTool, scope.referringId, referringScroll));
          elem.attr('target', '_parent');
        });
      }
    };
  });

}(window.angular));
