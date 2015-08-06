/**
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

  angular.module('collabosphere').controller('WhiteboardsBoardController', function(Fabric, FabricConstants, userFactory, utilService, whiteboardsFactory, $alert, $cookies, $filter, $modal, $rootScope, $scope, $stateParams) {

    // Variable that will keep track of the current whiteboard id
    var whiteboardId = $stateParams.whiteboardId;

    // Variable that will keep track of the current whiteboard
    $scope.whiteboard = null;

    // Element that will keep track of the whiteboard viewport
    var viewport = document.getElementById('whiteboards-board-viewport');

    // Variable that will keep track of the whiteboard Fabric.js instance
    var canvas = null;

    // The base width of the canvas
    var CANVAS_BASE_WIDTH = 1000;

    // The padding that will be enforced on the canvas when it can be scrolled
    var CANVAS_PADDING = 40;

    // Open a websocket connection for real-time communication with the server (chat + whiteboard changes).
    // The course ID and API domain are passed in as handshake query parameters
    var launchParams = utilService.getLaunchParams();
    var socket = io(window.location.origin, {
      'query': 'api_domain=' + launchParams.apiDomain + '&course_id=' + launchParams.courseId + '&whiteboard_id=' + whiteboardId
    });

    // Variable that will keep track of the available colors in the color picker
    $scope.colors = [
      {
        'name': 'Black',
        'color': 'rgb(0, 0, 0)'
      },
      {
        'name': 'Dark Blue',
        'color': 'rgb(90, 108, 122)'
      },
      {
        'name': 'Light Blue',
        'color': 'rgb(2, 149, 222)'
      },
      {
        'name': 'Green',
        'color': 'rgb(10, 139, 0)'
      },
      {
        'name': 'Grey',
        'color': 'rgb(230, 230, 230)'
      },
      {
        'name': 'Purple',
        'color': 'rgb(188, 58, 167)'
      },
      {
        'name': 'Red',
        'color': 'rgb(175, 56, 55)'
      },
      {
        'name': 'Yellow',
        'color': 'rgb(189, 129, 0)'
      }
    ];

    // Variable that will keep track of the placeholder images to use for assets without a preview image
    var ASSET_PLACEHOLDERS = {
      'file': '/assets/img/whiteboard_asset_placeholder_file.png',
      'link': '/assets/img/whiteboard_asset_placeholder_link.png'
    };

    /* WHITEBOARD */

    /**
     * Get the current whiteboard. This will include the number of online people, as well
     * as the content of the whiteboard
     */
    var getWhiteboard = function() {
      whiteboardsFactory.getWhiteboard(whiteboardId).success(function(whiteboard) {
        $scope.whiteboard = whiteboard;

        // Set the title of the window to the title of the whiteboard
        $rootScope.header = whiteboard.title;

        // Set the size of the whiteboard canvas
        setCanvasDimensions();

        // Set the layer index of the whiteboard elements once all elements
        // have finished loading
        var restoreLayers = _.after(whiteboard.whiteboard_elements.length, function() {
          canvas.forEachObject(function(element) {
            element.moveTo(element.get('index'));
          });
          canvas.renderAll();
          // Set the size of the whiteboard canvas
          setCanvasDimensions();
        });

        // Restore the layout of the whiteboard canvas
        _.each(whiteboard.whiteboard_elements, function(element) {
          deserializeElement(element, function(element) {
            canvas.add(element);
            restoreLayers();
          });
        });
      });
    };

    /**
     * When a user has joined or left the whiteboard, update the online status on the list of members
     */
    socket.on('online', function(onlineUsers) {
      if ($scope.whiteboard) {
        for (var i = 0; i < $scope.whiteboard.members.length; i++) {
          var member = $scope.whiteboard.members[i];
          var online = $filter('filter')(onlineUsers, {'user_id': member.id});
          member.online = (online.length > 0);
        }
      }
    });

    /**
     * Get the whiteboard members that are currently online
     */
    var getOnlineUsers = $scope.getOnlineUsers = function() {
      if ($scope.whiteboard) {
        return $filter('filter')($scope.whiteboard.members, {'online': true});
      }
    };

    /* CANVAS */

    /**
     * Extend the Fabric.js `toObject` deserialization function to include
     * the property that uniquely identifies an object on the canvas, as well as
     * a property containing the index of the object relative to the other items
     * on the canvas
     */
    fabric.Object.prototype.toObject = (function(toObject) {
      return function() {
        return fabric.util.object.extend(toObject.call(this), {
          'uid': this.uid,
          'index': canvas.getObjects().indexOf(this),
          'assetId': this.assetId,
          'width': this.width,
          'height': this.height
        });
      };
    })(fabric.Object.prototype.toObject);

    /**
     * Initialize the Fabric.js canvas and load the whiteboard content
     * and online users
     */
    var initializeCanvas = function() {
      // Ensure that the horizontal and vertical origins of objects are set to center
      fabric.Object.prototype.originX = fabric.Object.prototype.originY = 'center';
      // Initialize the whiteboard Fabric.js instance
      canvas = new fabric.Canvas('whiteboards-board-board');
      // Set the selection style for the whiteboard
      setSelectionStyle();
      // Set the pencil brush as the drawing brush
      canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
      // Load the whiteboard information, including the whiteboard's content
      getWhiteboard();
    };

    /**
     * Set the selection style of the Fabric.js canvas whiteboard elements, as well as
     * the style of the helper shown when selecting multiple elements at once
     */
    var setSelectionStyle = function() {
      // Set the style of the multi-select helper
      canvas.selectionColor = 'transparent';
      canvas.selectionBorderColor = '#0295DE';
      canvas.selectionLineWidth = 2;
      // Make the border dashed
      // @see http://fabricjs.com/fabric-intro-part-4/
      canvas.selectionDashArray = [10, 5];

      // Set the selection style for all elements
      fabric.Object.prototype.borderColor = '#0295DE';
      fabric.Object.prototype.borderScaleFactor = 0.3;
      fabric.Object.prototype.cornerColor = '#0295DE';
      fabric.Object.prototype.cornerSize = 10;
      fabric.Object.prototype.transparentCorners = false;
      fabric.Object.prototype.rotatingPointOffset = 30;
    };

    // Variable that will keep track of whether the canvas elements are overflowing the viewport
    $scope.scrollingCanvas = false;

    /**
     * Set the width and height of the whiteboard canvas. The width of the visible
     * canvas will be the same for all users, and the canvas will be zoomed to accommodate
     * that width. By default, the size of the zoomed canvas will be the same as the size
     * of the viewport. When there are any elements on the canvas that are outside of the
     * viewport boundaries, the canvas will be enlarged to incorporate those
     */
    var setCanvasDimensions = function() {
      // Zoom the canvas to accomodate the base width within the viewport
      var viewportWidth = viewport.clientWidth;
      var ratio = viewportWidth / CANVAS_BASE_WIDTH;
      canvas.setZoom(ratio);

      // Calculate the position of the elements that are the most right and the
      // most bottom. When all elements fit within the viewport, the canvas is
      // made the same size as the viewport. When any elements overflow the viewport,
      // the canvas is enlarged to incorporate all assets outside of the viewport
      var viewportHeight = viewport.clientHeight;
      var maxRight = viewportWidth;
      var maxBottom = viewportHeight;

      canvas.forEachObject(function(element) {
        var bound = null;
        if (!element.group) {
          bound = element.getBoundingRect();
        } else {
          // Elements in a group are positioned relative to the group. In order to calculate the most
          // right and most bottom point of the element, we need to calculate its position relative to
          // the canvas and then calculate the bounding rectangle for that element
          var position = calculateGlobalElementPosition(element.group, element);
          var width = element.width * position.scaleX;
          var height = element.height * position.scaleY;
          var rotation = fabric.util.degreesToRadians(position.angle);

          // The left and top position correspond to the center of the element
          var center = new fabric.Point(position.left, position.top);

          // Calculate the corners of the object, keeping its rotation into account
          var tl = fabric.util.rotatePoint(new fabric.Point(center.x - (width / 2), center.y - (height / 2)), center, rotation);
          var tr = fabric.util.rotatePoint(new fabric.Point(center.x + (width / 2), center.y - (height / 2)), center, rotation);
          var br = fabric.util.rotatePoint(new fabric.Point(center.x + (width / 2), center.y + (height / 2)), center, rotation);
          var bl = fabric.util.rotatePoint(new fabric.Point(center.x - (width / 2), center.y + (height / 2)), center, rotation);

          // Calculate the position of the bounding rectangle
          var xCoords = [tl.x, tr.x, br.x, bl.x];
          var minX = _.min(xCoords) * canvas.getZoom();
          var maxX = _.max(xCoords) * canvas.getZoom();
          var boundingRectWidth = Math.abs(minX - maxX);

          var yCoords = [tl.y, tr.y, br.y, bl.y];
          var minY = _.min(yCoords) * canvas.getZoom();
          var maxY = _.max(yCoords) * canvas.getZoom();
          var boundingRectHeight = Math.abs(minY - maxY);

          bound = {
            'left': minX,
            'top': minY,
            'width': boundingRectWidth,
            'height': boundingRectHeight
          };
        }

        maxRight = Math.max(maxRight, bound.left + bound.width);
        maxBottom = Math.max(maxBottom, bound.top + bound.height);
      });

      // Keep track of whether the canvas can currently be scrolled
      if (maxRight > viewportWidth || maxBottom > viewportHeight) {
        $scope.scrollingCanvas = true;

        // Add padding when the canvas can be scrolled
        if (maxRight > viewportWidth) {
          maxRight += CANVAS_PADDING;
        }
        if (maxBottom > viewportHeight) {
          maxBottom += CANVAS_PADDING;
        }
      } else {
        $scope.scrollingCanvas = false;
      }

      // When the entire whiteboard content should fit within
      // the screen, adjust the zoom level to make it fit
      if ($scope.fitToScreen) {
        // Calculate the actual unzoomed width of the whiteboard
        var realWidth = maxRight / canvas.getZoom();
        var realHeight = maxBottom / canvas.getZoom();
        // Zoom the canvas based on whether the height or width
        // needs the largest zoom out
        var widthRatio = viewportWidth / realWidth;
        var heightRatio = viewportHeight / realHeight;
        var ratio = Math.min(widthRatio, heightRatio);
        canvas.setZoom(ratio);

        canvas.setHeight(viewportHeight);
        canvas.setWidth(viewportWidth);
      } else {
        // Adjust the value for rounding issues to prevent scrollbars
        // from incorrectly showing up
        canvas.setHeight(maxBottom - 1);
        canvas.setWidth(maxRight - 1);
      }
    };

    // Recalculate the size of the canvas when the window is resized
    window.addEventListener('resize', setCanvasDimensions);

    /**
     * Get the current center point of the whiteboard canvas. This will
     * exclude the toolbar and the chat/online sidebar (if expanded)
     */
    var getCanvasCenter = function() {
      // Calculate the center point of the whiteboard canvas
      var zoomLevel = canvas.getZoom();
      var centerX = ((viewport.clientWidth / 2) + viewport.scrollLeft) / zoomLevel;
      var centerY = ((viewport.clientHeight / 2) + viewport.scrollTop) / zoomLevel;

      return {
        'x': centerX,
        'y': centerY
      };
    };

    /**
     * Get the number of elements that are in the whiteboard
     *
     * @return {Number}                           The number of elements on the Canvas
     */
    var getNumberOfElements = $scope.getNumberOfElements = function() {
      return canvas.getObjects().length;
    };

    /**
     * Get a Fabric.js canvas element based on its unique id
     *
     * @param  {Boolean}        uid               The unique id of the Fabric.js canvas element to retrieve
     * @return {Object}                           The retrieved Fabric.js canvas element
     */
    var getCanvasElement = function(uid) {
      var elements = canvas.getObjects();
      for (var i = 0; i < elements.length; i++) {
        if (elements[i].get('uid') === uid) {
          return elements[i];
        }
      }
      return null;
    };

    /**
     * Set a unique id on a Fabric.js canvas element if the element doesn't have a
     * unique id assigned
     *
     * @param  {Object}         element           The Fabric.js canvas element for which to set a unique id
     */
    var setCanvasElementId = function(element) {
      if (!element.get('uid')) {
        element.set('uid', Math.round(Math.random() * 1000000));
      }
    };

    /**
     * Enable or disable all elements on the whiteboard canvas. When an element is disabled, it will not be possible
     * to select, move or modify it
     *
     * @param  {Boolean}        enabled           Whether the elements on the whiteboard canvas should be enabled or disabled
     */
    var enableCanvasElements = function(enabled) {
      canvas.selection = enabled;
      var elements = canvas.getObjects();
      for (var i = 0; i < elements.length; i++) {
        elements[i].selectable = enabled;
      }
    };

    /**
     * Update the appearance of a Fabric.js canvas element
     *
     * @param  {Number}         uid               The id of the element to update
     * @param  {Object}         update            The updated values to apply to the canvas element
     */
    var updateCanvasElement = function(uid, update) {
      var element = getCanvasElement(uid);

      var updateElementProperties = function() {
        // Update all element properties, except for the image source. The image
        // source is handled separately as this is an asynchronous action
        _.each(update, function(value, property) {
          if (property !== 'src' && value !== element.get(property)) {
            element.set(property, value);
          }
        });

        // When the source element for an asset has changed, update this last and
        // re-render the element after it has been loaded
        if (element.type === 'image' && element.getSrc() !== update.src) {
          element.setSrc(update.src, function() {
            canvas.renderAll();
            // Recalculate the size of the whiteboard canvas
            setCanvasDimensions();
          });
        } else {
          canvas.renderAll();
        }
      }

      // If the element is an asset for which the source has changed, we preload
      // the image to prevent flickering when the image is inserted into the element
      if (element.type === 'image' && element.getSrc() !== update.src) {
        fabric.util.loadImage(update.src, updateElementProperties);
      } else {
        updateElementProperties();
      }
    };

    /**
     * Detect keydown events in the whiteboard to respond to keyboard shortcuts
     */
    viewport.addEventListener('keydown', function($event) {
      // Remove the selected elements when the delete or backspace key is pressed
      if ($event.keyCode === 8 || $event.keyCode === 46) {
        deleteActiveElements();
        $event.preventDefault();
      // Undo the previous action when Ctrl+Z is pressed
      } else if ($event.keyCode === 90 && $event.metaKey) {
      //  undo();
      // Redo the previous action when Ctrl+Y is pressed
      } else if ($event.keyCode === 89 && $event.metaKey) {
      //  redo();
      }
    }, false);

    initializeCanvas();

    /* CONCURRENT EDITING */

    /**
     * Convert a serialized Fabric.js canvas element to a proper Fabric.js canvas element
     *
     * @param  {Object}         element           The serialized Fabric.js canvas element to deserialize
     * @param  {Function}       callback          Standard callback function
     * @param  {Object}         callback.element  The deserialized Fabric.js canvas element
     */
    var deserializeElement = function(element, callback) {
      element = angular.copy(element);

      // Extract the type from the serialized element
      var type = fabric.util.string.camelize(fabric.util.string.capitalize(element.type));
      if (element.type === 'image') {
        // In order to avoid cross-domain errors when loading images from different domains,
        // the source of the element needs to be temporarily cleared and set manually once
        // the element has been created
        element.realSrc = element.src;
        element.src = '';
        fabric[type].fromObject(element, function(element) {
          element.setSrc(element.get('realSrc'), function() {
            return callback(element);
          });
        });
      } else if (fabric[type].async) {
        fabric[type].fromObject(element, callback);
      } else {
        return callback(fabric[type].fromObject(element));
      }
    };

    /**
     * Calculate the position of an element in a group relative to the whiteboard canvas
     *
     * @param  {Object}         group             The group of which the element is a part
     * @param  {Object}         element           The Fabric.js element for which the position relative to its group should be calculated
     * @return {Object}                           The position of the element relative to the whiteboard canvas. Will return the `angle`, `left` and `top` postion and the `scaleX` and `scaleY` scaling factors
     */
    var calculateGlobalElementPosition = function(group, object) {
      var center = group.getCenterPoint();
      var rotated = calculateRotatedLeftTop(group, object);

      return {
        'angle': object.getAngle() + group.getAngle(),
        'left': center.x + rotated.left,
        'top': center.y + rotated.top,
        'scaleX': object.get('scaleX') * group.get('scaleX'),
        'scaleY': object.get('scaleY') * group.get('scaleY')
      };
    };

    /**
     * Calculate the top left position of an element in a group
     *
     * @param  {Object}         group             The group of which the element is a part
     * @param  {Object}         element           The Fabric.js element for which the top left position in its group should be calculated
     * @return {Object}                           The top left position of the element in its group. Will return the `top` and `left` postion
     */
    var calculateRotatedLeftTop = function(group, object) {
      var groupAngle = group.getAngle() * (Math.PI / 180);
      var left = (-Math.sin(groupAngle) * object.getTop() * group.get('scaleY') +
                  Math.cos(groupAngle) * object.getLeft() * group.get('scaleX'));
      var top = (Math.cos(groupAngle) * object.getTop() * group.get('scaleY') +
                   Math.sin(groupAngle) * object.getLeft() * group.get('scaleX'))
      return {
        'left': left,
        'top': top
      };
    };

    /**
     * Deactivate the active group if any of the provided elements are a part of
     * the active group
     *
     * @param  {Object[]}       elements          The elements that should be checked for presence in the active group
     */
    var deactiveActiveGroupIfOverlap = function(elements) {
      var group = canvas.getActiveGroup()
      if (group) {
        var intersection = _.intersection(_.pluck(group.objects, 'uid'), _.pluck(elements, 'uid'));
        if (intersection.length > 0) {
          canvas.discardActiveGroup().renderAll();
        }
      }
    };

    /**
     * Get the currently selected whiteboard elements
     *
     * @return {Object[]}                         The selected whiteboard elements
     */
    var getActiveElements = function() {
      var activeElements = [];
      var group = canvas.getActiveGroup();
      if (group) {
        _.each(group.objects, function(element) {
          // When a Fabric.js canvas element is part of a group selection, its properties will be
          // relative to the group. Therefore, we calculate the actual position of each element in
          // the group relative to the whiteboard canvas
          var position = calculateGlobalElementPosition(group, element);
          activeElements.push(angular.extend({}, element.toObject(), position));
        });
      } else {
        activeElements.push(canvas.getActiveObject().toObject());
      }
      return activeElements;
    };

    ///////////////
    // ADD ITEMS //
    ///////////////

    /**
     * Persist a new element to the server
     *
     * @param  {Object}         element           The new element to persist to the server
     */
    var saveNewElement = function(element) {
      // Add a unique id to the element
      setCanvasElementId(element);

      // Save the new element
      socket.emit('addActivity', [element.toObject()]);

      // Add the action to the undo/redo queue
      // TODO
      // addUndoActivity('add', [{'element': element.toObject()}]);
    };

    /**
     * A new element was added to the whiteboard canvas by the current user
     */
    canvas.on('object:added', function(ev) {
      var element = ev.target;

      // Don't add a new text element until text has been entered
      if (element.type === 'i-text' && !element.text.trim()) {
        return false;
      }

      // If the element already has a unique id, it was added by a different user and
      // there is no need to persist the addition
      if (!element.get('uid') && !element.get('isHelper')) {
        saveNewElement(element);

        // Recalculate the size of the whiteboard canvas
        setCanvasDimensions();
      }
    });

    /**
     * A whiteboard canvas element was added by a different user
     */
    socket.on('addActivity', function(elements) {
      _.each(elements, function(element) {
        deserializeElement(element, function(element) {
          // Add the element to the whiteboard canvas and
          // move it to its appropriate index
          canvas.add(element);
          element.moveTo(element.get('index'));
          canvas.renderAll();
          // Recalculate the size of the whiteboard canvas
          setCanvasDimensions();
        });
      });
    });

    //////////////////
    // UPDATE ITEMS //
    //////////////////

    /**
     * Persist element updates to the server
     *
     * @param  {Object[]}       elements          The updated elements to persist to the server
     */
    var saveElementUpdates = function(elements) {
      // Notify the server about the updated elements
      socket.emit('updateActivity', elements);

      // Recalculate the size of the whiteboard canvas
      setCanvasDimensions();
    };

    /**
     * One or multiple whiteboard canvas elements have been updated by the current user
     */
    canvas.on('object:modified', function() {
      // Get the selected whiteboard elements
      var elements = getActiveElements();

      // Add the action to the undo/redo queue
      // TODO
      // addUndoActivity('update', updates);

      // Notify the server about the updates
      saveElementUpdates(elements);
    });

    /**
     * One or multiple whiteboard canvas elements were updated by a different user
     */
    socket.on('updateActivity', function(elements) {
      // Deactivate the current group if any of the updated elements
      // are in the current group
      deactiveActiveGroupIfOverlap(elements);

      // Update the elements
      _.each(elements, function(element) {
        updateCanvasElement(element.uid, element);
      });

      // Recalculate the size of the whiteboard canvas
      setCanvasDimensions();
    });

    /**
     * An IText whiteboard canvas element was updated by the current user
     */
    fabric.IText.prototype.on('editing:exited', function() {
      var element = this;

      // If the text element is empty, it can be removed from the whiteboard canvas
      var text = element.text.trim();
      if (!text) {
        // TODO: Add the action to the undo/redo queue
        // element.text = element.originalState.text;
        // Only persist the delete to the server when the element
        // already existed
        if (element.get('uid')) {
          saveDeleteElements([element]);
        }
        canvas.remove(element);

      // The text element did not exist before. Notify the server that the element was added
      } else if (!element.get('uid')) {
        saveNewElement(element);

      // The text element existed before. Notify the server that the element was updated
      } else {
        saveElementUpdates([element]);
        // TODO: Add the action to the undo/redo queue
        // addUndoAction('update', element.toObject(), element.originalState);
      }

      // Switch back to move mode
      setMode('move');
    });

    //////////////////
    // DELETE ITEMS //
    //////////////////

    /**
     * Persist element deletions to the server
     *
     * @param  {Object[]}       elements          The deleted elements to persist to the server
     */
    var saveDeleteElements = function(elements) {
      // Notify the server about the deleted elements
      socket.emit('deleteActivity', elements);

      // Recalculate the size of the whiteboard canvas
      setCanvasDimensions();
    };

    /**
     * Delete the selected whiteboard element(s)
     */
    var deleteActiveElements = function() {
      // Get the selected items
      var elements = getActiveElements();

      // Delete the selected items
      _.each(elements, function(element) {
        canvas.remove(getCanvasElement(element.uid));
      });

      // Discard the active group if a group selection is present
      if (canvas.getActiveGroup()) {
        canvas.discardActiveGroup().renderAll();
      }

      // TODO: Add undo activity

      saveDeleteElements(elements);
    };

    /**
     * One or multiple whiteboard canvas elements were deleted by a different user
     */
    socket.on('deleteActivity', function(elements) {
      // Deactivate the current group if any of the deleted elements
      // are in the current group
      deactiveActiveGroupIfOverlap(elements);

      // Delete the elements
      _.each(elements, function(element) {
        element = getCanvasElement(element.uid);
        if (element) {
          canvas.remove(element);
        }
      });

      // Recalculate the size of the whiteboard canvas
      setCanvasDimensions();
    });

    /* ZOOMING */

    // Variable that will keep track of whether the whiteboard content needs to be fitted to the screen
    $scope.fitToScreen = false;

    /**
     * Toggle between fitting the whiteboard content to the screen and showing the
     * whiteboard content at full size
     */
    var toggleZoom = $scope.toggleZoom = function() {
      $scope.fitToScreen = !$scope.fitToScreen;
      setCanvasDimensions();
    };

    /* TOOLBAR */

    // Variable that will keep track of the selected action in the toolbar
    $scope.mode = 'move';

    /**
     * Set the mode of the whiteboard toolbar
     *
     * @param  {Boolean}        newMode           The mode the toolbar should be put in. Accepted values are `move`, `draw`, `shape`, `text` and `asset`
     */
    var setMode = $scope.setMode = function(newMode) {
      // Deactivate the currently selected item
      canvas.deactivateAll().renderAll();

      // Disable drawing mode
      setDrawMode(false);

      // Prevent the canvas items from being modified unless
      // the whiteboard is in 'move' mode
      enableCanvasElements(false);

      if (newMode === 'move') {
        enableCanvasElements(true);
        closePopovers();
      // Draw mode has been selected
      } else if (newMode === 'draw') {
        setDrawMode(true);
      // Text mode has been selected
      } else if (newMode === 'text') {
        // Change the cursor to text mode
        // TODO: This doesn't appear to work
        canvas.cursor = 'text';
      }

      $scope.mode = newMode;
    };

    /**
     * Close all popovers
     */
    var closePopovers = function() {
      // Get all popovers
      var popups = document.querySelectorAll('.popover');
      for (var i = 0; i < popups.length; i++) {
        // Close each popover
        var popup = angular.element(popups[i]);
        var popupScope = popup.scope().$parent;
        popupScope.isOpen = false;
        popup.remove();
      }
    };

    /**
     * Set the toolbar back to move mode when the asset and export
     * tooltips are hidden
     */
    $scope.$on('tooltip.hide', function() {
      if ($scope.mode === 'asset' || $scope.mode === 'export') {
        setMode('move');
      }
    });

    /* UNDO/REDO */

    // Variable that will keep track of the activities the current user has taken
    //$scope.activityQueue = [];

    // Variable that will keep track of the current position in the activity queue
    //$scope.currentActivityPosition = 0;

    /**
     * Add a new activity to the activities queue
     *
     * @param  {String}         type              The type of the activity to add to the activities queue. One of `add`, `update` or `delete
     * @param  {Object[]}       elements          The Fabric.js elements that were involved in the activity
     * // TODO
     */
    //var addUndoActivity = function(type, elements) {
    //  console.log(type);
    //  console.log(elements);
    //  // Remove all activities that happened after the current activity in the activities queue
    //  $scope.activityQueue.splice($scope.currentActivityPosition, $scope.activityQueue.length - $scope.currentActivityPosition);

    //  // Add the activity to the activities queue
    //  $scope.activityQueue.push({
    //    'type': type,
    //    'elements': elements
    //  });
    //  $scope.currentActivityPosition++;
    //};

    /**
     * Undo the action at the current position in the actions queue
     */
    //var undo = $scope.undo = function() {
    //  if ($scope.currentActivityPosition !== 0) {
    //    // Deactivate the currently selected item
    //    canvas.deactivateAll().renderAll();

    //    $scope.currentActivityPosition--;
    //    var previousActivity = $scope.activityQueue[$scope.currentActivityPosition];

    //    // The previous action was an element that was added.
    //    // Undoing this should delete the element again
    //    if (previousActivity.type === 'add') {
    //    //  var element = getCanvasElement(previousAction.element.uid);
    //    //  element.set('isUndoRedo', true);
    //    //  canvas.remove(element);

    //    // The previous action was an element that was deleted.
    //    // Undoing this should add the element again
    //    } else if (previousActivity.type === 'delete') {
        //  deserializeElement(previousAction.element, function(element) {
        //    element.set('isUndoRedo', true);
        //    canvas.add(element);
        //    element.moveTo(element.get('index'));
        //    canvas.renderAll();
        //  });

        // The previous action was an element that was updated.
        // Undoing this should undo the update
    //    } else if (previousActivity.type === 'update') {
    //      var updates = previousActivity.elements.map(function(update) {
    //        console.log(update.originalState);
    //        var element = angular.extend({}, update.element, update.originalState);
    //        updateCanvasElement(element.uid, element);
    //        return element;
    //      });
    //      saveElementUpdates(updates);
    //    }
    //  }
    //};

    /**
     * Redo the action at the next position in the actions queue
     */
    //var redo = $scope.redo = function() {
    //  if ($scope.currentActivityPosition !== $scope.activityQueue.length) {
    //    // Deactivate the currently selected item
    //    canvas.deactivateAll().renderAll();

    //    var nextActivity = $scope.activityQueue[$scope.currentActivityPosition];
    //    $scope.currentActivityPosition++;

    //    // The next action was an element that was added.
    //    // Redoing this should add the element again
    //    if (nextActivity.type === 'add') {
    //    //  deserializeElement(nextAction.element, function(element) {
    //    //    element.set('isUndoRedo', true);
    //    //    canvas.add(element);
    //    //    element.moveTo(element.get('index'));
    //    //    canvas.renderAll();
    //    //  });

    //    // The next action was an element that was deleted.
    //    // Undoing this should delete the element again
    //    } else if (nextActivity.type === 'delete') {
    //    // var element = getCanvasElement(nextAction.element.uid);
    //    // element.set('isUndoRedo', true);
    //    //  canvas.remove(element);

    //    // The next action was an element that was updated.
    //    // Undoing this should re-apply the update
    //    } else if (nextActivity.type === 'update') {
    //      var updates = nextActivity.elements.map(function(update) {
    //        updateCanvasElement(update.element.uid, update.element);
    //        return update.element;
    //      });
    //      saveElementUpdates(updates);
    //    }
    //  }
    //};

    /* DRAWING */

    // Variable that will keep track of the selected line width and selected draw color
    $scope.draw = {
      'options': [
        {
          'value': 1,
          'label': '<img src="/assets/img/whiteboard-draw-small.png" />'
        },
        {
          'value': 5,
          'label': '<img src="/assets/img/whiteboard-draw-medium.png" />'
        },
        {
          'value': 10,
          'label': '<img src="/assets/img/whiteboard-draw-large.png" />'
        }
      ],
      'selected': {
        'lineWidth': 1,
        'color': $scope.colors[0]
      }
    };

    /**
     * Enable or disable drawing mode for the whiteboard canvas
     *
     * @param  {Boolean}        drawMode          Whether drawing mode for the whiteboard canvas should be enabled
     */
    var setDrawMode = $scope.setDrawMode = function(drawMode) {
      canvas.isDrawingMode = drawMode;
    };

    /**
     * Change the drawing color when a new color has been selected in the color picker
     */
    $scope.$watch('draw.selected.color', function() {
      canvas.freeDrawingBrush.color = $scope.draw.selected.color.color;
    }, true);

    /**
     * Change the drawing line width when a new line width has been selected in the width picker
     */
    $scope.$watch('draw.selected.lineWidth', function() {
      canvas.freeDrawingBrush.width = parseInt($scope.draw.selected.lineWidth, 10);
    }, true);

    /* SHAPE */

    // Variable that will keep track of the selected shape, style and draw color
    $scope.shape = {
      'options': [
        {
          'shape': 'Rect',
          'style': 'thin',
          'label': '<img src="/assets/img/whiteboard-shape-rect-thin.png" />'
        },
        {
          'shape': 'Rect',
          'style': 'thick',
          'label': '<img src="/assets/img/whiteboard-shape-rect-thick.png" />'
        },
        {
          'shape': 'Rect',
          'style': 'fill',
          'label': '<img src="/assets/img/whiteboard-shape-rect-fill.png" />'
        },
        {
          'shape': 'Circle',
          'style': 'thin',
          'label': '<img src="/assets/img/whiteboard-shape-circle-thin.png" />'
        },
        {
          'shape': 'Circle',
          'style': 'thick',
          'label': '<img src="/assets/img/whiteboard-shape-circle-thick.png" />'
        },
        {
          'shape': 'Circle',
          'style': 'fill',
          'label': '<img src="/assets/img/whiteboard-shape-circle-fill.png" />'
        }
      ]
    };

    $scope.shape.selected = {
      'type': $scope.shape.options[0],
      'color': $scope.colors[0]
    };

    // Variable that will keep track of the shape that is being added to the whiteboard canvas
    var shape = null;

    // Variable that will keep track of whether a shape is currently being drawn
    var isDrawingShape = false;

    // Variable that will keep track of the point at which drawing a shape started
    var startShapePointer = null;

    /**
     * The mouse is pressed down on the whiteboard canvas
     */
    canvas.on('mouse:down', function(ev) {
      // Only start drawing a shape when the canvas is in shape mode
      if ($scope.mode === 'shape') {
        // Indicate that drawing a shape has started
        isDrawingShape = true;

        // Keep track of the point where drawing the shape started
        startShapePointer = canvas.getPointer(ev.e);

        // Create the basic shape of the selected type that will
        // be used as the drawing guide. The originX and originY
        // of the helper element are set to left and top to make it
        // easier to map the top left corner of the drawing guide with
        // the original cursor postion
        shape = new fabric[$scope.shape.selected.type.shape]({
          'left': startShapePointer.x,
          'top': startShapePointer.y,
          'originX': 'left',
          'originY': 'top',
          'radius': 1,
          'width': 1,
          'height': 1,
          'fill': 'transparent',
          'stroke': $scope.shape.selected.color.color,
          'strokeWidth': $scope.shape.selected.type.style === 'thick' ? 10 : 2
        });
        if ($scope.shape.selected.type.style === 'fill') {
          shape.fill = $scope.shape.selected.color.color;
        }
        // Indicate that this element is a helper element that should
        // not be saved back to the server
        shape.set('isHelper', true);
        canvas.add(shape);
      }
    });

    /**
     * The mouse is moved on the whiteboard canvas
     */
    canvas.on('mouse:move', function(ev) {
      // Only continue drawing the shape when the whiteboard canvas is in shape mode
      if (isDrawingShape) {
        // Get the current position of the mouse
        var currentShapePointer = canvas.getPointer(ev.e);

        // When the user has moved the cursor to the left of the original
        // starting point, move the left of the circle to that point so
        // negative shape drawing can be achieved
        if (startShapePointer.x > currentShapePointer.x) {
          shape.set({'left': currentShapePointer.x});
        }
        // When the user has moved the cursor above the original starting
        // point, move the left of the circle to that point so negative
        // shape drawing can be achieved
        if (startShapePointer.y > currentShapePointer.y) {
          shape.set({'top': currentShapePointer.y});
        }

        // Set the radius and width of the circle based on how much the cursor
        // has moved compared to the starting point
        if ($scope.shape.selected.type.shape === 'Circle') {
          shape.set({
            'width': Math.abs(startShapePointer.x - currentShapePointer.x),
            'height': Math.abs(startShapePointer.x - currentShapePointer.x),
            'radius': Math.abs(startShapePointer.x - currentShapePointer.x) / 2
          });
        // Set the width and height of the shape based on how much the cursor
        // has moved compared to the starting point
        } else {
          shape.set({
            'width': Math.abs(startShapePointer.x - currentShapePointer.x),
            'height': Math.abs(startShapePointer.y - currentShapePointer.y)
          });
        }

        canvas.renderAll();
      }
    });

    /**
     * The mouse is released on the whiteboard canvas
     */
    canvas.on('mouse:up', function() {
      if (isDrawingShape) {
        // Indicate that shape drawing has stopped
        isDrawingShape = false;
        // Switch the toolbar back to move mode
        setMode('move');
        // Clone the drawn shape and add the clone to the canvas.
        // This is caused by a bug in Fabric where it initially uses
        // the size when drawing started to position the controls. Cloning
        // ensures that the controls are added in the correct position.
        // The origin of the element is also set to `center` to make it
        // inline with the other whiteboard elements
        var finalShape = fabric.util.object.clone(shape);
        finalShape.left += finalShape.width / 2;
        finalShape.top += finalShape.height / 2;
        finalShape.originX = finalShape.originY = 'center';
        // Indicate that this is no longer a drawing helper shape and can
        // therefore be saved back to the server
        finalShape.set('isHelper', false);

        canvas.add(finalShape);
        canvas.remove(shape);
        // Select the added shape
        canvas.setActiveObject(finalShape);
      }
    });

    /* TEXT */

    // Variable that will keep track of the selected text size and color
    $scope.text = {
      'options': [
        {
          'value': 36,
          'label': '<span class="whiteboards-text-option">Title</span>'
        },
        {
          'value': 14,
          'label': '<span class="whiteboards-text-option">Normal</span>'
        }
      ],
      'selected': {
        'size': 14,
        'color': $scope.colors[0]
      }
    };

    /**
     * Add an editable text field to the whiteboard canvas
     */
    canvas.on('mouse:down', function(ev) {
      if ($scope.mode === 'text') {
        // Add the text field to where the user clicked
        var textPointer = canvas.getPointer(ev.e);

        // Start off with an empty text field
        var text = new fabric.IText('', {
          'left': textPointer.x,
          'top': textPointer.y,
          'fontFamily': '"HelveticaNeue-Light", "Helvetica Neue Light", "Helvetica Neue", Helvetica, Arial, "Lucida Grande", sans-serif',
          'fontSize': $scope.text.selected.size,
          'fill': $scope.text.selected.color.color
        });
        canvas.add(text);

        // Put the editable text field in edit mode straight away
        setTimeout(function() {
          canvas.setActiveObject(text);
          text.enterEditing();
          // The textarea needs to be put in edit mode manually
          // @see https://github.com/kangax/fabric.js/issues/1740
          text.hiddenTextarea.focus();
        }, 0);
      }
    });

    /* ADD ASSET */

    /**
     * Launch the modal that allows for an existing asset to be added to
     * whiteboard canvas
     */
    var reuseAsset = $scope.reuseAsset = function() {
      // Create a new scope for the modal dialog
      var scope = $scope.$new(true);
      scope.closeModal = function(selectedAssets) {
        _.each(selectedAssets, addAsset);
        this.$hide();
      };
      // Open the asset selection modal dialog
      $modal({
        'animation': false,
        'scope': scope,
        'template': '/app/whiteboards/reuse/reuse.html'
      });
      // Switch the toolbar back to move mode. This will
      // also close the add asset popover
      setMode('move');
    };

    /**
     * Add an asset to the whiteboard canvas
     *
     * @param  {Asset}         asset                The asset that should be added to the whiteboard canvas
     */
    var addAsset = $scope.addAsset = function(asset) {
      // Switch the toolbar back to move mode
      setMode('move');

      // Default to a placeholder when the asset does not have a preview image
      if (!asset.image_url) {
        if (asset.type === 'file' && asset.mime.indexOf('image/') !== -1) {
          asset.image_url = asset.download_url;
        } else {
          asset.image_url = ASSET_PLACEHOLDERS[asset.type];
        }
      }

      // Add the asset to the center of the whiteboard canvas
      fabric.Image.fromURL(asset.image_url, function(element) {
        var canvasCenter = getCanvasCenter();

        // Scale the element to ensure it takes up a maximum of 80% of the
        // visible viewport width and height
        var maxWidth = viewport.clientWidth * 0.8 / canvas.getZoom();
        var widthRatio = maxWidth / element.width;
        var maxHeight = viewport.clientHeight * 0.8 / canvas.getZoom();
        var heightRatio = maxHeight / element.height;
        // Determine which side needs the most scaling for the element to fit on the screen
        var ratio = _.min([widthRatio, heightRatio]);
        if (ratio < 1) {
          element.scale(ratio);
        }

        element.left = canvasCenter.x;
        element.top = canvasCenter.y;

        // Add the asset id to the element
        element.assetId = asset.id;

        // Add the new element to the canvas
        canvas.add(element);
        canvas.setActiveObject(element);
      });
    };

    /* ADD LINK */

    /**
     * Launch the modal that allows for a new link to be added
     */
    var addLink = $scope.addLink = function() {
      // Create a new scope for the modal dialog
      var scope = $scope.$new(true);
      scope.closeModal = function(asset) {
        if (asset) {
          addAsset(asset);
        }
        this.$hide();
      };
      // Open the add link modal dialog
      $modal({
        'scope': scope,
        'template': '/app/whiteboards/addlinkmodal/addlinkmodal.html'
      });
      // Switch the toolbar back to move mode. This will
      // also close the add asset popover
      setMode('move');
    };

    /* UPLOAD FILE(S) */

    /**
     * Launch the modal that allows for a new files to be uploaded
     */
    var uploadFiles = $scope.uploadFiles = function() {
      // Create a new scope for the modal dialog
      var scope = $scope.$new(true);
      scope.closeModal = function(assets) {
        _.each(assets, addAsset);
        this.$hide();
      };
      // Open the add link modal dialog
      $modal({
        'scope': scope,
        'template': '/app/whiteboards/uploadmodal/uploadmodal.html'
      });
      // Switch the toolbar back to move mode. This will
      // also close the add asset popover
      setMode('move');
    };

    /* SIDEBAR */

    // Variable that will keep track of whether the chat/online sidebar is expanded
    $scope.sidebarExpanded = true;

    // Variable that will keep track of the current mode the sidebar is displayed in
    $scope.sidebarMode = 'chat';

    // Variable that will keep track of the chat messages on the current whiteboard
    $scope.chatMessages = [];

    // Variable that will keep track of the state of the chat list
    $scope.chatList = {
      'ready': true
    };

    // Variable that will keep track of the current chat message
    $scope.newChatMessage = null;

    /**
     * Toggle the view mode in the sidebar. If the sidebar was hidden, it will be shown
     * in the requested mode. If the sidebar was shown in a different mode, it will be switched to
     * the requested mode. If the sidebar was shown in the requested mode, it will be hidden again.
     *
     * @param  {Boolean}        newMode           The mode in which the sidebar should be shown. Accepted values are `chat` and `online`
     */
    var toggleSidebar = $scope.toggleSidebar = function(newMode) {
      if ($scope.sidebarExpanded && $scope.sidebarMode === newMode) {
        $scope.sidebarExpanded = false;
      } else {
        $scope.sidebarExpanded = true;
      }
      $scope.sidebarMode = newMode;

      // Recalculate the size of the whiteboard canvas. `setTimeout`
      // is required to ensure that the sidebar has collapsed/expanded
      setTimeout(setCanvasDimensions, 0);
    };

    /**
     * Create a new chat message
     *
     * @param  {Event}          $event            The keypress event
     */
    var createChatMessage = $scope.createChatMessage = function($event) {
      // Only submit the chat message when the enter button is pressed
      if ($event.which === 13) {
        if ($scope.newChatMessage.body) {
          socket.emit('chat', $scope.newChatMessage.body);
        }
        // Reset the new chat message
        $scope.newChatMessage = null;
        $event.preventDefault();
      }
    };

    /**
     * Get the chat messages
     */
    var getChatMessages = $scope.getChatMessages = function() {
      // Indicate the no further REST API requests should be made
      // until the current request has completed
      $scope.chatList.ready = false;

      var lastId = null;
      if ($scope.chatMessages[0]) {
        lastId = $scope.chatMessages[0].id;
      }
      whiteboardsFactory.getChatMessages(whiteboardId, lastId).success(function(chatMessages) {
        // The oldest messages go on top
        chatMessages.reverse();

        // Prepend the older messages
        $scope.chatMessages = chatMessages.concat($scope.chatMessages);

        // Only request another page of chat messages if the returned number of messages
        // is the maximum number the REST API returns
        if (chatMessages.length === 10) {
          $scope.chatList.ready = true;
        }
      });
    };

    /**
     * Check whether two dates occur on different days
     *
     * @param  {String}   dateA         The first date to check
     * @param  {String}   [dateB]       The second date to check
     * @return {Boolean}                Whether the two dates occur on a different day
     */
    var isDifferentDay = $scope.isDifferentDay = function(dateA, dateB) {
      if (!dateB) {
        return true;
      }

      dateA = moment(dateA);
      dateB = moment(dateB);
      return !dateA.isSame(dateB, 'day');
    };

    /**
     * When a new chat message is received via the websocket, add it to
     * the list of chat messages
     */
    socket.on('chat', function(chatMessage) {
      // Add the message to the set of chat messages
      $scope.chatMessages.push(chatMessage);

      // Angular uses a `$$hashKey` property on each object to determine whether it needs to update
      // the DOM. When the new chat message is added on a new day, we have to update all the date
      // headers. By deleting the `$$hashKey` property we force Angular to re-render the entire list
      if (isDifferentDay(chatMessage.created_at), $scope.chatMessages[$scope.chatMessages.length - 1].created_at) {
        $scope.chatMessages.map(function(msg) {
          delete msg.$$hashKey;
          return msg;
        });
      }
    });

    /* SETTINGS */

    /**
     * Launch the modal that allows for a whiteboard to be edited
     */
    var editWhiteboard = $scope.editWhiteboard = function() {
      // Create a new scope for the modal dialog
      var scope = $scope.$new(true);
      scope.whiteboard = $scope.whiteboard;
      scope.closeModal = function(updatedWhiteboard) {
        if (updatedWhiteboard) {
          $scope.whiteboard = updatedWhiteboard;
          // Set the title of the window to the new title of the whiteboard
          $rootScope.header = $scope.whiteboard.title;
        }
        this.$hide();
      };
      // Open the edit whiteboard modal dialog
      $modal({
        'scope': scope,
        'template': '/app/whiteboards/edit/edit.html'
      });
    };

    /* EXPORT */

    // Depending on the size of the whiteboard, exporting it to PNG can sometimes take a while. To
    // prevent the user from clicking the button twice when waiting to get a response, the button
    // will be disabled as soon as its clicked. Once the file has been downloaded, it will be
    // re-enabled. However, there are no cross-browser events that expose whether a file has been
    // downloaded. The PNG export endpoint works around this by taking in a `downloadId` parameter
    // and using that to construct a predictable cookie name. When a user clicks the button, the UI
    // will disable the button and wait until the cookie is set before re-enabling it again
    var downloadId = null;

    // Variable that will keep track of the URL through which the whiteboard can be exported as a PNG file
    $scope.exportPngUrl = null;

    // Variable that will keep track of whether the current whiteboard is being exported to PNG
    $scope.isExportingAsPng = false;

    /**
     * Generate the export to PNG url
     */
    var generateExportPngUrl = function() {
      downloadId = Math.floor(Math.random() * 10000000);

      $scope.exportPngUrl = utilService.getApiUrl('/whiteboards/' + whiteboardId + '/export/png?downloadId=' + downloadId);
    };

    // Generate the initial download id and PNG url
    generateExportPngUrl();

    /**
     * Export the whiteboard to a PNG file
     */
    var exportAsPng = $scope.exportAsPng = function($event) {
      if ($scope.isExportingAsPng) {
        $event.preventDefault();
        return false;
      }

      // Indicate that the server is generating the PNG file
      $scope.isExportingAsPng = true;

      // Once the user has started receiving the PNG file, a cookie will be set. As long
      // as that cookie isn't set, the "Download as image" button should be disabled
      var cookieName = 'whiteboard.' + downloadId + '.png';
      var stopWatching = $scope.$watch(function() {
        return $cookies.get(cookieName);
      }, function(newValue) {
        if (newValue) {
          // The file started downloading, the "Download as image" button can now be enabled
          $scope.isExportingAsPng = false;

          // Remove the cookie as it's no longer required
          $cookies.remove(cookieName);

          // Generate a new download id for the next time the user clicks the download image button
          generateExportPngUrl();

          // Remove the watch as it's no longer required
          stopWatching();
        }
      });
    };

    /**
     * Launch the modal that allows the current user to export the current whiteboard to the asset library
     */
    var exportAsAsset = $scope.exportAsAsset = function() {
      // Create a new scope for the modal dialog
      var scope = $scope.$new(true);
      scope.whiteboard = $scope.whiteboard;
      scope.closeModal = function(asset) {
        if (asset) {
          // Show a notification indicating the whiteboard was exported
          var myAlert = $alert({
            'container': '#whiteboards-board-notifications',
            'content': 'This board has been successfully added to the <strong>Asset Library</strong>.',
            'duration': 5,
            'keyboard': true,
            'show': true,
            'templateUrl': 'whiteboards-notification-template',
            'type': 'success'
          });
        }
        this.$hide();
      };

      // Open the export as asset modal dialog
      $modal({
        'scope': scope,
        'templateUrl': '/app/whiteboards/exportasassetmodal/exportasasset.html'
      });

      // Switch the toolbar back to move mode. This will
      // also close the add asset popover
      setMode('move');
    };

    /* INITIALIZATION */

    userFactory.getMe().success(function(me) {
      $scope.me = me;
    });

  });

}(window.angular));
