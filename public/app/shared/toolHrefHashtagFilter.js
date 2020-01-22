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

(function(angular) {

  'use strict';

  angular.module('collabosphere').filter('toolHrefHashtag', function(utilService) {

    /**
     * Replace each hashtag with a link to the asset library that will search through the asset library
     * for that keyword.
     *
     * @param  {String}     input                Text containing hashtags. Hashtags will be replaced with proper hrefs.
     * @param  {String}     state                Page state (e.g., scroll position) at time of departure
     * @param  {String}     referringTool        SuiteC tool in which user initiated the action
     * @param  {String}     referringId          State of the referring tool, at time of exit
     * @return {String}                          The processed text, in which hashtags were replaced with links
     */
    return function(input, state, referringTool, referringId) {
      return input.replace(/#(\w*[a-zA-Z_\-\.]+\w*)/gim, function(match, hashtag) {
        // Remove trailing punctuation, as it might have been picked up by regex above
        var trimmed = hashtag.replace(/[\.\-]+$/g, '');
        var id = utilService.getAdvancedSearchId({'keywords': trimmed});
        var url = utilService.getToolHref('assetlibrary', id, state, referringTool, referringId);
        return '<a href="' + url + '" target="_parent">#' + hashtag + '</a>';
      });
    };
  });

}(window.angular));
