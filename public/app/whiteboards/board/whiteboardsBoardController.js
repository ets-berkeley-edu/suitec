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

  angular.module('collabosphere').controller('WhiteboardsBoardController', function(Fabric, FabricConstants, userFactory, utilService, whiteboardsFactory, $filter, $modal, $rootScope, $scope, $stateParams) {

    // Variable that will keep track of the current whiteboard id
    var whiteboardId = $stateParams.whiteboardId;

    // Variable that will keep track of the current whiteboard
    $scope.whiteboard = null;

    // Element that will keep track of the whiteboard viewport
    var viewport = document.getElementById('whiteboards-board-viewport');

    // Variable that will keep track of the whiteboard Fabric.js instance
    var canvas = null;

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

        // Restore the layout of the whiteboard canvas
        for (var i = 0; i < whiteboard.whiteboard_elements.length; i++) {
          var element = whiteboard.whiteboard_elements[i];
          deserializeElement(element, function(element) {
            canvas.add(element);
            element.moveTo(element.get('index'));
            canvas.renderAll();
          });
        }
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
          'index': canvas.getObjects().indexOf(this)
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
      // Set the pencil brush as the drawing brush
      canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
      // Set the width and height of the canvas
      setCanvasDimensions();
      // Load the whiteboard information, including the whiteboard's content
      getWhiteboard();
    };

    /**
     * Set the width and height of the whiteboard canvas to be the same
     * as the surrounding viewport. This will allow the canvas to be
     * infinitely scrollable
     */
    var setCanvasDimensions = function() {
      canvas.setHeight(viewport.clientHeight);
      canvas.setWidth(viewport.clientWidth);
    };

    // Resize the viewport when the window is resized
    window.addEventListener('resize', setCanvasDimensions);

    /**
     * Get the current center point of the whiteboard canvas. This will
     * exclude the toolbar and the chat/online sidebar (if expanded)
     */
    var getCanvasCenter = function() {
      // Calculate the height of the toolbar
      var toolbarHeight = document.getElementById('whiteboards-board-toolbar').clientHeight;

      // Calculate the width of the sidebar
      var sidebarWidth = document.getElementById('whiteboards-board-sidebar').clientWidth;

      // Calculate the width and height of the viewport excluding the toolbar and chat/online bar (if expanded)
      var viewportWidth = viewport.clientWidth;
      if ($scope.sidebarExpanded) {
        viewportWidth = viewportWidth - sidebarWidth;
      }
      var viewportHeight = viewport.clientHeight - toolbarHeight;

      // Calculate the center point of the whiteboard canvas
      var zoomLevel = canvas.getZoom();
      var centerX = (currentCanvasPan.x + (viewportWidth / 2)) / zoomLevel;
      var centerY = (currentCanvasPan.y + (viewportHeight / 2)) / zoomLevel;

      return {
        'x': centerX,
        'y': centerY
      };
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
     * A new element was added to the whiteboard canvas by the current user
     */
    canvas.on('object:added', function(ev) {
      var element = ev.target;

      // Don't add a new text element until text has been entered
      if (element.type === 'i-text' && !element.text.trim()) {
        return false;
      }

      // Only notify the server if the element was added by the current user
      // and the element is not a drawing helper element
      // TODO
      if ((!element.get('uid') && !element.get('isHelper')) || element.get('isUndoRedo')) {
        // Add a unique id to the element
        setCanvasElementId(element);
        socket.emit('addElement', element.toObject());

        // Add the action to the undo/redo queue
        if (!element.get('isUndoRedo') && !element.get('isHelper')) {
          addUndoAction('add', element.toObject());
        }
      }
      element.set('isUndoRedo', null);
    });

    /**
     * A new element was added to the whitebard canvas by a different user
     */
    socket.on('addElement', function(element) {
      deserializeElement(element, function(element) {
        // Add the element to the whiteboard canvas and move it to its appropriate index
        canvas.add(element);
        element.moveTo(element.get('index'));
        canvas.renderAll();
      });
    });

    /**
     * A whiteboard canvas element was updated by the current user
     */
    canvas.on('object:modified', function(ev) {
      var element = ev.target;

      // Only notify the server if the element was updated by the current user
      // and if the element is not a drawing helper element
      if (!element.get('isSocketUpdate') && !element.get('isHelper')) {
        socket.emit('updateElement', element.toObject());
        // Add the action to the undo/redo queue
        if (!element.get('isUndoRedo') && !element.get('isHelper')) {
          addUndoAction('update', element.toObject(), element.originalState);
        }
      }
      element.set('isUndoRedo', null);
      element.set('isSocketUpdate', null);
    });

    /**
     * A whiteboard canvas element was updated by a different user
     */
    socket.on('updateElement', function(updatedElement) {
      var originalElement = getCanvasElement(updatedElement.uid);
      if (originalElement) {
        deserializeElement(updatedElement, function(updatedElement) {
          // Indicate that this update has come in through a socket
          originalElement.set('isSocketUpdate', true);

          // Remove the existing element from the whiteboard canvas and add the updated element
          canvas.remove(originalElement);
          canvas.add(updatedElement);
          updatedElement.moveTo(updatedElement.get('index'));
          canvas.renderAll();
        });
      }
    });

    /**
     * An IText whiteboard canvas element was updated by the current user
     */
    fabric.IText.prototype.on('editing:exited', function() {
      var element = this;

      // If the text element is empty, it can be removed from the whiteboard canvas
      var text = element.text.trim();
      if (!text) {
        // If the text element did not have a unique identifier, there's no need
        // to persist the deletion to the back-end
        if (!element.get('uid')) {
          element.set('isHelper', true);
        }
        element.text = element.originalState.text;
        canvas.remove(element);
      // The text element did not exist before. Notify the server that the element was added
      } else if (!element.get('uid')) {
        setCanvasElementId(element);
        socket.emit('addElement', element.toObject());
        // Add the action to the undo/redo queue
        addUndoAction('add', element.toObject());
      // The text element existed before. Notify the server that the element was updated
      } else {
        socket.emit('updateElement', element.toObject());
        // Add the action to the undo/redo queue
        addUndoAction('update', element.toObject(), element.originalState);
      }

      element.set('isUndoRedo', null);

      // Switch back to move mode
      $scope.mode = 'move';
    });

    /**
     * A whiteboard canvas element was deleted by the current user
     */
    canvas.on('object:removed', function(ev) {
      var element = ev.target;
      // Only notify the server if the element was deleted by the current user
      if (!element.get('isSocketUpdate')) {
        socket.emit('deleteElement', element.toObject());
        // Add the action to the undo/redo queue
        if (!element.get('isUndoRedo') && !element.get('isHelper')) {
          addUndoAction('delete', element.toObject());
        }
      }
      element.set('isUndoRedo', null);
      element.set('isSocketUpdate', null);
    });

    /**
     * A whiteboard canvas element was deleted by a different user
     */
    socket.on('deleteElement', function(element) {
      var element = getCanvasElement(element.uid);
      if (element) {
        // Indicate that this update has come in through a socket
        element.set('isSocketUpdate', true);
        canvas.remove(element);
      }
    });

    /* INFINITE CANVAS SCROLLING */

    // Variable that will keep track of whether the whiteboard canvas is currently being infinitely dragged
    var isDraggingCanvas = false;

    // Variable that will keep track of the current whiteboard canvas top left position
    var currentCanvasPan = new fabric.Point(0, 0);

    // Variable that will keep track of the previous mouse position when the whiteboard canvas is being dragged
    var previousMousePosition = new fabric.Point(0, 0);

    /**
     * The mouse is pressed down on the whiteboard canvas
     */
    canvas.on('mouse:down', function(ev) {
      // Only start the whiteboard canvas infinite scrolling when no whiteboard
      // element has been clicked and the canvas is not in draw or shape mode
      if (!canvas.getActiveObject() && !canvas.isDrawingMode && $scope.mode !== 'shape') {
        // Indicate that infinite scrolling has started
        isDraggingCanvas = true;
        // Indicate that no element selections can currently be made
        canvas.selection = false;

        // Keep track of the point where the infinite scrolling started
        previousMousePosition.setXY(ev.e.clientX, ev.e.clientY);
        // Change the cursors to a grabbing icon
        canvas.setCursor('grabbing');
      }
    });

    /**
     * The mouse is moved on the whiteboard canvas
     */
    canvas.on('mouse:move', function(ev) {
      // Only move the whiteboard canvas when the whiteboard canvas is in infinite scrolling mode
      if (isDraggingCanvas) {
        // Get the current position of the mouse
        var currentMousePosition = new fabric.Point(ev.e.clientX, ev.e.clientY);

        // Calculate the new top left of the whiteboard canvas based on the difference
        // between the current mouse position and the previous mouse position
        currentCanvasPan.x = currentCanvasPan.x - (currentMousePosition.x - previousMousePosition.x);
        currentCanvasPan.y = currentCanvasPan.y - (currentMousePosition.y - previousMousePosition.y);
        canvas.absolutePan(currentCanvasPan);

        // Keep track of the point where the mouse is currently at
        previousMousePosition = currentMousePosition;
      }
    });

    /**
     * The mouse is released on the whiteboard canvas
     */
    canvas.on('mouse:up', function() {
      if (isDraggingCanvas) {
        // Indicate that infinite scrolling has stopped
        isDraggingCanvas = false;
        // Indicate that element selections can be made again
        canvas.selection = true;
        // Change the cursors back to the default cursor
        canvas.setCursor('default');
      }
    });

    /* ZOOMING */

    // Variable that will keep track of the current zoom level
    $scope.zoomLevel = 1;

    /**
     * Zoom the Fabric.js canvas in or out
     *
     * @param  {Number}         zoomDelta         The level by which the current zoom level should be increased
     */
    var zoom = $scope.zoom = function(zoomDelta) {
      var currentZoom = $scope.zoomLevel;
      // Modify the zoom level
      $scope.zoomLevel = currentZoom + zoomDelta;
      // TODO: Recalculate the pan point and zoom to center
      // canvas.zoomToPoint(new fabric.Point(getCanvasCenter().x, getCanvasCenter().y), $scope.zoomLevel);
      canvas.setZoom($scope.zoomLevel);
      canvas.absolutePan(currentCanvasPan);
    };

    /* TOOLBAR */

    // Variable that will keep track of the selected action in the toolbar
    $scope.mode = 'move';

    /**
     * Set the mode of the whiteboard toolbar
     *
     * @param  {Boolean}        newMode           The mode the toolbar should be put in. Accepted values are `move`, `erase`, `draw`, `shape`, `text`, `asset` and `whiteboard`
     */
    var setMode = $scope.setMode = function(newMode) {
      // Deactivate the currently selected item
      var activeElement = canvas.getActiveObject();
      if (activeElement && activeElement.type === 'i-text') {
        activeElement.exitEditing();
      }
      canvas.deactivateAll().renderAll();
      lockObjects(false);

      // Revert the cursor
      canvas.hoverCursor = 'default';
      // Disable drawing mode
      setDrawMode(false);

      // Erase mode has been selected
      if (newMode === 'erase') {
        // Prevent objects from being moved when deleting
        lockObjects(true);
        // Change the cursor to delete mode when hovering over an object
        canvas.hoverCursor = 'not-allowed';
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
     * @see https://angular-ui.github.io/bootstrap/
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

    /* UNDO/REDO */

    // Variable that will keep track of the actions the current user has taken
    $scope.actionQueue = [];

    // Variable that will keep track of the current position in the actions queue
    $scope.currentActionPosition = 0;

    /**
     * Add a new action to the actions queue
     *
     * @param  {String}         type              The type of the action to add to the actions queue. One of `add`, `update` or `delete
     * @param  {Object}         element           The Fabric.js element on which the action took place. The state of the element reflects the state after the action took place
     * @param  {Object}         [originalState]   The state of the Fabric.js element before the action took place
     */
    var addUndoAction = function(type, element, originalState) {
      // Remove all actions that happened after the current action in the actions queue
      $scope.actionQueue.splice($scope.currentActionPosition, $scope.actionQueue.length - $scope.currentActionPosition);

      // Add the action to the actions queue
      $scope.actionQueue.push({
        'type': type,
        'element': angular.copy(element),
        'originalState': angular.copy(originalState)
      });
      $scope.currentActionPosition++;
    };

    /**
     * Undo the action at the current position in the actions queue
     * TODO: Can undo and redo be consolidated?
     */
    var undo = $scope.undo = function() {
      $scope.currentActionPosition--;
      var previousAction = angular.copy($scope.actionQueue[$scope.currentActionPosition]);

      // The previous action was an element that was added.
      // Undoing this should delete the element again
      if (previousAction.type === 'add') {
        var element = getCanvasElement(previousAction.element.uid);
        element.set('isUndoRedo', true);
        canvas.remove(element);

      // The previous action was an element that was deleted.
      // Undoing this should add the element again
      } else if (previousAction.type === 'delete') {
        deserializeElement(previousAction.element, function(element) {
          element.set('isUndoRedo', true);
          canvas.add(element);
          element.moveTo(element.get('index'));
          canvas.renderAll();
        });

      // The previous action was an element that was updated.
      // Undoing this should undo the update
      } else if (previousAction.type === 'update') {
        var element = getCanvasElement(previousAction.element.uid);
        for (var property in previousAction.originalState) {
          if (element[property] !== previousAction.originalState[property]) {
            element.set(property, previousAction.originalState[property]);
          }
        }
        element.set('isUndoRedo', true);
        canvas.fire('object:modified', {'target': element});
        canvas.absolutePan(currentCanvasPan);
        canvas.renderAll();
      }
    };

    /**
     * Redo the action at the next position in the actions queue
     */
    var redo = $scope.redo = function() {
      var nextAction = angular.copy($scope.actionQueue[$scope.currentActionPosition]);
      $scope.currentActionPosition++;

      // The next action was an element that was added.
      // Redoing this should add the element again
      if (nextAction.type === 'add') {
        deserializeElement(nextAction.element, function(element) {
          element.set('isUndoRedo', true);
          canvas.add(element);
          element.moveTo(element.get('index'));
          canvas.renderAll();
        });

      // The next action was an element that was deleted.
      // Undoing this should delete the element again
      } else if (nextAction.type === 'delete') {
        var element = getCanvasElement(nextAction.element.uid);
        element.set('isUndoRedo', true);
        canvas.remove(element);

      // The next action was an element that was updated.
      // Undoing this should re-apply the update
      } else if (nextAction.type === 'update') {
        var element = getCanvasElement(nextAction.element.uid);
        for (var property in nextAction.originalState) {
          if (element[property] !== nextAction.element[property]) {
            element.set(property, nextAction.element[property]);
          }
        }
        element.set('isUndoRedo', true);
        canvas.fire('object:modified', {'target': element});
        canvas.absolutePan(currentCanvasPan);
        canvas.renderAll();
      }
    };

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
        // Indicate that no element selections can currently be made
        canvas.selection = false;

        // Keep track of the point where drawing the shape started
        startShapePointer = canvas.getPointer(ev.e);

        // Create the basic shape of the selected type that will
        // be used as the drawing guide
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
        // Indicate that element selections can be made again
        canvas.selection = true;
        // Switch the toolbar back to move mode
        setMode('move');
        // Clone the drawn shape and add the clone to the canvas.
        // This is caused by a bug in Fabric where it initially uses
        // the size when drawing started to position the controls. Cloning
        // ensures that the controls are added in the correct position
        var finalShape = fabric.util.object.clone(shape);
        // Indicate that this is no longer a drawing helper shape and can
        // therefore be saved back to the server
        finalShape.set('isHelper', false);

        canvas.add(finalShape);
        canvas.remove(shape);
        // Select the added shape
        canvas.setActiveObject(finalShape);
      }
    });

    /* ERASE */

    /**
     * Lock or unlock all elements on the whiteboard canvas
     *
     * @param  {Boolean}        lock              Whether the elements on the whiteboard canvas should be locked or unlocked
     */
    var lockObjects = function(lock) {
      var elements = canvas.getObjects();
      for (var i = 0; i < elements.length; i++) {
        var element = elements[i];
        element.lockMovementX = lock;
        element.lockMovementY = lock;
      }
    };

    /**
     * Delete the selected whiteboard item when the whiteboard
     * is in erase mode
     */
    canvas.on('object:selected', function() {
      if ($scope.mode === 'erase') {
        canvas.remove(canvas.getActiveObject());
      }
    });

    /* TEXT */

    // Variable that will keep track of the available text sizes
    var textSizes = [12, 14, 18, 24, 30, 36, 48, 60, 72];

    // Variable that will keep track of the selected text size and color
    $scope.text = {};
    $scope.text.options = textSizes.map(function(textSize) {
      return {
        'value': textSize,
        'label': '<span>' + textSize + '</span>'
      };
    });

    $scope.text.selected = {
      'size': 14,
      'color': $scope.colors[0]
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
        if (selectedAssets) {
          for (var i = 0; i < selectedAssets.length; i++) {
            var asset = selectedAssets[i];
            // TODO: Deal with assets that don't have a large image URL
            if (asset.image_url) {
              addAsset(asset.image_url);
            }
          }
        }
        this.$hide();
      };
      // Open the asset selection modal dialog
      $modal({
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
     * @param  {String}         url               The image URL of the asset that should be added to the whiteboard canvas
     */
    var addAsset = $scope.addAsset = function(url) {
      // Switch the toolbar back to move mode
      setMode('move');
      // Add the asset to the center of the whiteboard canvas
      fabric.Image.fromURL(url, function(element) {
        var canvasCenter = getCanvasCenter();

        // Scale the element if it is too large to fit onto the viewport
        var toolbarHeight = document.getElementById('whiteboards-board-toolbar').clientHeight;
        var sidebarWidth = document.getElementById('whiteboards-board-sidebar').clientWidth;

        var maxWidth = viewport.clientWidth - (viewport.clientWidth / 5);
        if ($scope.sidebarExpanded) {
          maxWidth -= sidebarWidth;
        }
        if (element.width > maxWidth) {
          element.scale(maxWidth / element.width);
        }
        var maxHeight = viewport.clientHeight - (viewport.clientHeight / 5) - toolbarHeight;
        if (element.height > maxHeight) {
          element.scale(maxHeight / element.height);
        }

        element.left = canvasCenter.x;
        element.top = canvasCenter.y;
        canvas.add(element);

        // Select the added asset
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
          // TODO: Deal with assets that don't have thumbnail URL
          if (asset.thumbnail_url) {
            addAsset(asset.thumbnail_url);
          }
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
        if (assets) {
          for (var i = 0; i < assets.length; i++) {
            var asset = assets[i];
            // TODO: Deal with assets that don't have thumbnail URL
            if (asset.thumbnail_url) {
              addAsset(asset.thumbnail_url);
            }
          }
        }
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

    /* INITIALIZATION */

    userFactory.getMe().success(function(me) {
      $scope.me = me;
    });

  });

}(window.angular));
