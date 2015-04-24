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

  // The minimum width and height an image on the page should have before
  // being listed as a website asset that can be added to the Asset Library
  var MIN_DIMENSIONS = 150;

  // The Collabosphere configuration object made available on the parent frame.
  // This contains the Collabosphere base API URL, the Bookmarklet token for the
  // user and the user id
  var collabosphere = window.parent.collabosphere;

  // The cached available categories in the course
  var categories = null;

  /* MODAL */

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
    });
  };

  /**
   * Render the Bookmarklet modal and show the overview pane
   */
  var renderModal = function() {
    // Ensure that the iFrame in which the Bookmarklet is loaded is visible
    $('#collabosphere-iframe', window.parent.document).css('display', 'block');
    // Load the modal dialog
    $('#collabosphere-modal').modal();
    showPane('overview');
  };

  /**
   * Hide the iFrame in which the Bookmarklet is loaded. This iFrame is loaded
   * on top of the current page and will block the page content until it is hidden
   */
  var hideBookmarkletIFrame = function() {
    // Only hide the iFrame if no success notification is on the screen
    if ($('[data-notify]').length === 0) {
      $('#collabosphere-iframe', window.parent.document).css('display', 'none');
    }
  };

  /* SUCCESS NOTIFICATION */

  // Set the default settings for the success notification
  // @see http://bootstrap-growl.remabledesigns.com/
  $.notifyDefaults({
    'delay': 3000,
    'onClosed': hideBookmarkletIFrame,
    'placement': {
      'align': 'center',
      'from': 'top'
    },
    'type': 'success'
  });

  /**
   * Show a success notification when the current page or items from the current
   * page have been successfully added to the Asset Library
   *
   * @param  {String}     message         The content that should be shown in the notification
   */
  var showSuccessNotification = function(message) {
    // Hide the modal dialog
    $('#collabosphere-modal').modal('hide');
    // Show the success notification and link back
    // to the Asset Library
    var notification = {
      'message': message,
      'url': collabosphere.tool_url,
      'target': '_blank'
    };
    $.notify(notification);
  };

  /* MODAL STATE CHANGES */

  /**
   * Show the correct step in the add workflow
   *
   * @param  {String}     pane            The id of the pane to show. Accepted values are `overview` and `items`
   */
  var showPane = function(pane) {
    // Hide the currenty active pane
    $('.collabosphere-pane').addClass('hide');
    $('.collabosphere-title').addClass('hide');
    // Show the requested pane
    $('#collabosphere-' + pane).removeClass('hide');
    $('#collabosphere-title-' + pane).removeClass('hide');

    // Set the width of the modal dialog depending on
    // the currently active pane
    $('.modal-dialog').removeClass('modal-sm modal-md modal-lg');
    if (pane === 'overview') {
      $('.modal-dialog').addClass('modal-sm');
    } else if (pane === 'bookmark') {
      $('.modal-dialog').addClass('modal-md');
    } else {
      $('.modal-dialog').addClass('modal-lg');
    }

    // Scoll back to the top of the modal
    $('#collabosphere-modal').scrollTop(0);
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

  /* CATEGORIES */

  /**
   * Get the available categories in the course and cache them
   */
  var getCategories = function() {
    $.ajax({
      'url': getApiUrl('/categories'),
      'headers': getBookmarkletTokenHeaders(),
      'success': function(data) {
        categories = data;
      }
    });
  };

  /* ADD BOOKMARK */

  /**
   * When he user has chosen to add the entire page as a bookmark to the Asset Library,
   * extract as much metadata as possible from the page and present the metadata options
   */
  var renderPageBookmark = function() {
    // Extract the URL from the parent page
    var url = window.parent.location;
    // Extract the title from the title tag in the parent page
    var title = window.parent.document.title;
    // Extract the description from the description meta tag in the parent page
    var description = $('meta[name=Description]', window.parent.document).attr('content');

    // Insert the extract values in the metadata form
    $('#collabosphere-bookmark-url').val(url);
    $('#collabosphere-bookmark-title').val(title);
    $('#collabosphere-bookmark-description').val(description);

    // Render the list of available categories
    renderTemplate('collabosphere-categories-template', {'categories': categories}, $('#collabosphere-bookmark-category'));

    // Show the appropriate modal pane
    showPane('bookmark');
  };

  /**
   * Add the entire page as a bookmark to the Asset Library
   */
  var addPageBookmark = function() {
    // Extract the title and description from the metadata form
    var asset = {
      'url': window.parent.location.toString(),
      'title': $('#collabosphere-bookmark-title').val(),
      'categories': $('#collabosphere-bookmark-category').val(),
      'description': $('#collabosphere-bookmark-description').val()
    };

    addAsset(asset, function(asset) {
      showSuccessNotification('The URL <strong>' + asset.title + '</strong> has been successfully added to the <strong>Asset Library</strong>');
    });
  };

  /* ADD ITEMS FROM PAGE */

  // Keep track of the images that have been listed already to ensure
  // that we don't list the same image multiple times
  var pageItems = [];

  /**
   * When the user has chosen to add individual items from the page to the Asset Library,
   * they are presented with a list of all of the images on the page
   */
  var renderPageItems = function() {
    // Ensure that we start with a clean list
    $('#collabosphere-items-list').empty();
    pageItems = [];

    // Disable the next button
    enableDisableItemsNext();

    /*!
     * Function called when an image on the page has been found. This can be either an image
     * from an `img` tag or a background-image
     *
     * @param  {Object}         img             The image that was found on the page
     * @param  {String}         img.url         The URL of the image
     * @param  {String}         [img.title]     The title of the image
     */
    var imageCallback = function(img) {
      // Prepend the protocol if the original image was protocol neutral
      if (img.url.substring(0, 2) === '//') {
        img.url = window.parent.location.protocol + img.url;
      }

      // Ensure that the same image is not re-added
      if (_.findWhere(pageItems, {'url': img.url}) === undefined) {
        // If no title for the image could be extracted, default the
        // title to the name of the image
        if (!img.title) {
          img.title = img.url.split('/').pop();
        }

        pageItems.push(img);
        // Add the image to the list of available assets
        $('#collabosphere-items-list').append(renderTemplate('collabosphere-item-template', img));
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
   * Get the selected individual page items
   *
   * @return {Object[]}                   Array containing the selected page items
   */
  var getSelectedPageItems = function() {
    var selected = [];
    $('#collabosphere-items-list input[type=checkbox]:checked').each(function() {
      var item = _.findWhere(pageItems, {'url': $(this).attr('data-collabosphere-url')});
      selected.push(item);
    });
    return selected;
  };

  /**
   * When adding individual assets from the page, enable the next button when at least
   * 1 asset has been checked. Otherwise, the next button is disabled
   */
  var enableDisableItemsNext = function() {
    $('#collabosphere-items-next').prop('disabled', (getSelectedPageItems().length === 0));
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
        var img = {
          'url': $(this).attr('src'),
          // Try to extract a meaningful title
          'title': $(this).attr('alt')
        };

        callback(img);
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
    var $backgroundImages = $('*', window.parent.document).filter(function() {
      // Check if the element has a background image. Note that using jQuery
      // to check for a background image is too slow here and therefore a native
      // approach needs to be taken
      if (this.currentStyle) {
        return this.currentStyle.backgroundImage !== 'none';
      } else if (window.getComputedStyle) {
        return document.defaultView.getComputedStyle(this,null).getPropertyValue('background-image') !== 'none';
      }
    });
    // Load all captured background images in a hidden image tag to extract their height and width
    $backgroundImages.each(function() {
      // Get the background image URL from the CSS property
      var url = $(this).css('background-image').replace(/^url\(['"]?/,'').replace(/['"]?\)$/,'');
      var img = {'url': url};

      var $tmpImg = $('<img />').hide();
      $tmpImg.bind('load', function() {
        if (this.naturalHeight > MIN_DIMENSIONS && this.naturalWidth > MIN_DIMENSIONS) {
          callback(img);
        }
      });
      $('body').append($tmpImg);
      $tmpImg.attr('src', img.url);
    });
  };

  /**
   * When one or more individual items from the page have been selected, render
   * them in a list to allow for metadata to be added to each of the selected items
   */
  var renderPageItemsMetadata = function() {
    // Fetch the selected items
    var selectedItems = getSelectedPageItems();

    // Render the selected items in a list
    renderTemplate('collabosphere-items-metadata-template', {'selectedItems': selectedItems}, $('#collabosphere-items-metadata-container'));

    // Add the categories to each of the rendered items
    renderTemplate('collabosphere-categories-template', {'categories': categories}, $('.collabosphere-item-category'));

    // Show the appropriate modal pane
    showPane('items-metadata');
  };

  /**
   * Add the selected individual items from the page to the asset library.
   */
  var addPageItems = function() {
    // Fetch the selected items
    var selectedItems = getSelectedPageItems();

    // Function called when all items have been added to the asset library
    var finishAddPageItems = _.after(selectedItems.length, function() {
      // Construct the notification message
      var message = null;
      if (selectedItems.length === 1) {
        message = 'The selected item has been successfully added to the <strong>Asset Library</strong>';
      } else {
        message = 'The selected items have been successfully added to the <strong>Asset Library</strong>';
      }
      showSuccessNotification(message);
    });

    // Extract the metadata from the metadata form
    _.each(selectedItems, function(selectedItem, index) {
      var $parent = $('#collabosphere-items-metadata-container li:eq(' + index + ')');
      selectedItem.source = window.parent.location.toString();
      selectedItem.title = $('#collabosphere-item-title', $parent).val();
      selectedItem.categories = $('#collabosphere-item-category', $parent).val();
      selectedItem.description = $('#collabosphere-item-description', $parent).val();

      addAsset(selectedItem, finishAddPageItems);
    });
  };

  /* UTILITIES */

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
   * Construct the full URL for a REST API request. All REST API requests should
   * be of the form `/api/<apiDomain>/<courseId>/<restAPI>`
   *
   * @param  {String}       url             The REST API for which the full REST API URL should be constructed
   * @return {String}                       The full REST API URL of the form `/api/<apiDomain>/<courseId>/<restAPI>`
   */
  var getApiUrl = function(url) {
    return collabosphere.base_url + '/api/' + collabosphere.api_domain + '/' + collabosphere.course_id + url;
  };

  /**
   * Create a new asset in the asset library. The request will be authenticated through
   * the user's bookmarklet token
   *
   * @param  {Object}       asset           The asset that should be added to the asset library
   * @param  {Function}     callback        Standard callback function
   * @param  {Asset}        callback.asset  The created asset
   */
  var addAsset = function(asset, callback) {
    // Indicate that a link is being created
    asset.type = 'link';

    // Create the asset through a bookmarklet token request
    $.ajax({
      'url': getApiUrl('/assets'),
      'type': 'POST',
      'data': asset,
      'headers': getBookmarkletTokenHeaders(),
      'success': callback
    });
  };

  /**
   * Get the headers required to authenticate a request using the user's bookmarklet token
   *
   * @return {Object}                       The request headers that should be used for bookmarklet token authentication
   */
  var getBookmarkletTokenHeaders = function() {
    return {
      'x-collabosphere-user': collabosphere.user_id,
      'x-collabosphere-token': collabosphere.bookmarklet_token
    };
  };

  /**
   *
   */
  var setSelectStyle = function() {
    var $select = $(this);
    $select.attr('data-value', $select.val());
  };

  /**
   * Add the event binding for the Bookmarklet
   */
  var addBinding = function() {
    $(document).on('click', '#collabosphere-overview-next', handleOverviewNext);
    $(document).on('click', '.collabosphere-back', renderModal);
    $(document).on('click', '#collabosphere-bookmark-add', addPageBookmark);
    $(document).on('change', '#collabosphere-items-list input[type=checkbox]', enableDisableItemsNext);
    $(document).on('click', '#collabosphere-items-next', renderPageItemsMetadata);
    $(document).on('click', '#collabosphere-items-metadata-back', renderPageItems);
    $(document).on('click', '#collabosphere-items-add', addPageItems);
    $(document).on('change', 'select', setSelectStyle);
    // Hide the iFrame in which the Bookmarklet is loaded when the modal dialog is closed
    $(document).on('hidden.bs.modal', '#collabosphere-modal', hideBookmarkletIFrame);
    // Retrigger the modal dialog when the Bookmarklet is clicked for the second time
    $(window).on('message', renderModal);
  };

  addBinding();
  setUpModal();
  getCategories();

})();
