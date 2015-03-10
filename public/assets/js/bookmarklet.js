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

(function(){

  // The minimum width and height an image on the page should have before
  // being listed as a website asset that can be added to the Asset Library
  var MIN_DIMENSIONS = 150;

  // The Collabosphere configuration object made available on the parent frame.
  // This contains the Collabosphere base API URL, the Bookmarklet token for the
  // user and the user id
  var collabosphere = window.parent.collabosphere;

  ///////////
  // MODAL //
  ///////////

  /**
   * Get the HTML for the Bookmarklet and add it to the current document.
   * As the current document was dynamically created in the parent document,
   * it still needs to be filled with the actual content
   */
  var setUpModal = function() {
    $.ajax({
      'url': collabosphere.base_url + '/bookmarklet.html',
      'success': function(response) {
        $(document.body).append(response);
        renderModal();
      }
    })
  };

  /**
   * Render the Bookmarklet modal and show the overview pane
   */
  var renderModal = function() {
    $('#collabosphere-modal').modal();
    showPane('overview');
  };

  /////////////////////////
  // MODAL STATE CHANGES //
  /////////////////////////

  /**
   * Show the correct step in the add workflow
   *
   * @param  {String}     pane            The id of the pane to show. Accepted values are `overview` and `items`
   */
  var showPane = function(pane) {
    // Hide the currenty active pane
    $('.collabosphere-pane').addClass('hide');
    // Show the requested pane
    $('#collabosphere-' + pane).removeClass('hide');

    // Set the width of the modal dialog depending on
    // the currently active pane
    $('.modal-dialog').removeClass('modal-sm modal-lg');
    if (pane === 'overview') {
      $('.modal-dialog').addClass('modal-sm');
    } else {
      $('.modal-dialog').addClass('modal-lg');
    }
  };

  /**
   * When the Bookmarklet is initiated, the user will be able to choose between
   * adding the entire page to the Asset Library or adding individual items from
   * the page to the Asset Library
   */
  var handleOverviewNext = function() {
    var selected = $('input[name=collabosphere-overview-options]:checked').val();
    // The user wants to add the entire page
    if (selected === 'bookmark') {
      renderPageBookmark();
    // The user wants to add individual items from the page
    } else if (selected === 'items') {
      renderPageItems();
    }
  };

  /////////////////////////
  // ADD ITEMS FROM PAGE //
  /////////////////////////

  /**
   * When the user has chosen to add individual items from the page to the Asset Library,
   * they are presented with a list of all of the images on the page
   */
  var renderPageItems = function() {
    // Ensure that we start with a clean list
    $('#collabosphere-items-list').empty();

    // Keep track of the images that have been listed already to ensure
    // that we don't list the same image multiple times
    var images = [];

    /*!
     * Function called when an image on the page has been found. This can be either an image
     * from an `img` tag or a background-image
     *
     * @param  {String}         img             The URL of the image that was found on the page
     */
    var imageCallback = function(img) {
      // Prefix the image with the protocol in case a protocol-neutral
      // approach was used. This will ensure that we properly whether
      // an image has already been included
      if (img.substring(0, 2) === '//') {
        img = window.parent.location.protocol + img;
      }
      if (!_.contains(images, img)) {
        // Ensure that the same image is not re-added
        images.push(img);
        // Add the image to the list of available assets
        $('#collabosphere-items-list').append(renderTemplate('collabosphere-item-template', {'img': img}));
      }
    };

    // Get all images from `img` tags
    collectImages(imageCallback);
    // Get all background images
    collectBackgroundImages(imageCallback);

    // Show the appropriate modal pane
    showPane('items');
  };

  /**
   * Get all images from `img` tags from the current page. Only images that are larger
   * than the minimum dimensions will be listed.
   *
   * @param  {Function}   callback        Standard callback function called every time an image has been found
   * @param  {String}     callback.img    URL of the image that has been found
   */
  var collectImages = function(callback) {
    var $images = $('img', window.parent.document);
    $images.each(function() {
      // Ensure that the image is larger than the minimum dimensions
      if (this.naturalHeight > MIN_DIMENSIONS && this.naturalWidth > MIN_DIMENSIONS) {
        callback($(this).attr('src'));
      }
    });
  };

  /**
   * Get all background images from the current page. Only images that are larger
   * than the minimum dimensions will be listed.
   *
   * @param  {Function}   callback        Standard callback function called every time a background image has been found
   * @param  {String}     callback.img    URL of the background image that has been found
   */
  var collectBackgroundImages = function(callback) {
    // Extract all elements that have a background image
    var $backgroundImgages = $('*', window.parent.document).filter(function() {
      // Check if the element has a background image. Note that using jQuery
      // to check for a background image is too slow here and therefore a native
      // approach needs to be taken
      if (this.currentStyle) {
        return this.currentStyle['backgroundImage'] !== 'none';
      } else if (window.getComputedStyle) {
        return document.defaultView.getComputedStyle(this,null).getPropertyValue('background-image') !== 'none';
      }
    });
    // Load all captured background images in a hidden image tag to extract their height and width
    $backgroundImgages.each(function() {
      // Get the background image URL from the CSS property
      var url = $(this).css('background-image').replace(/^url\(['"]?/,'').replace(/['"]?\)$/,'');
      var $tmpImg = $('<img />').hide();
      $tmpImg.bind('load', function() {
        if (this.naturalHeight > MIN_DIMENSIONS && this.naturalWidth > MIN_DIMENSIONS) {
          callback(url);
        }
      });
      $('body').append($tmpImg);
      $tmpImg.attr('src', url);
    });
  };

  ///////////////
  // UTILITIES //
  ///////////////

  // Cache the compiled underscore template so they don't have
  // to be recompiled every time they are used
  var templateCache = {};

  /**
   * Render an HTML template using the underscore templating engine
   *
   * @param  {String}     templateId      The id of the script tag that contains the underscore template
   * @param  {Object}     data            The data object that should be passed into the template
   * @param  {Object}     [$target]       The jQuery element representing the container in which the rendered template should be placed
   * @return {String}                     The rendered HTML template
   */
  var renderTemplate = function(templateId, data, $target) {
    // Compile the template if it hasn't been compiled before
    if (!templateCache[templateId]) {
      var $template = $('#' + templateId);
      templateCache[templateId] = _.template($template.text());
    }

    // Render the template
    var renderedTemplate = templateCache[templateId](data);

    // Add the rendered template to the target container
    if ($target) {
      $target.html(renderedTemplate);
    }

    return renderedTemplate;
  };

  /**
   * Add the event binding for the Bookmarklet
   */
  var addBinding = function() {
    $(document).on('click', '#collabosphere-overview-next', handleOverviewNext);
  };

  addBinding();
  setUpModal();

})();