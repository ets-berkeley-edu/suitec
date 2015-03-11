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

(function() {

  // Create an iFrame that will be overlayed on top of the existing page. This
  // will appear to load the bookmarklet content inside of the page, but
  // in reality it will just be an iFrame on top of the page. This will give
  // us a lot more control over the behavior and styling of the bookmarklet
  // content and removes the potential for clashes with the parent page
  var iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.top = '0px';
  iframe.style.left = '0px';
  iframe.style.bottom = '0px';
  iframe.style.right = '0px';
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.border = 'none';
  iframe.style.margin = 0;
  iframe.style.padding = 0;
  iframe.style.overflow = 'hidden';
  iframe.style.zIndex = 2147483647;

  // Add the iFrame to the page and load the appropriate libraries containing
  // the Bookmarklet's working code
  document.body.appendChild(iframe);
  var baseUrl = window.collabosphere.base_url;
  var html = '<!DOCTYPE html>' +
             '<html lang="en">' +
               '<head>' +
                 '<meta charset="utf-8">' +
                 '<meta http-equiv="X-UA-Compatible" content="IE=edge">' +
                 '<link href="' + baseUrl + '/lib/bootstrap/dist/css/bootstrap.css" rel="stylesheet">' +
                 '<link href="' + baseUrl + '/assets/css/bookmarklet.css" rel="stylesheet">' +
                 '<script src="' + baseUrl + '/lib/jquery/dist/jquery.js"></script>' +
                 '<script src="' + baseUrl + '/lib/lodash/lodash.js"></script>' +
                 '<script src="' + baseUrl + '/lib/bootstrap/dist/js/bootstrap.js"></script>' +
               '</head>' +
               '<body>' +
                 '<script src="' + baseUrl + '/assets/js/bookmarklet.js"></script>' +
               '</body>' +
             '</html>';
  iframe.contentWindow.document.open();
  iframe.contentWindow.document.write(html);
  iframe.contentWindow.document.close();

})();
