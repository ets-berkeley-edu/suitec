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

  angular.module('collabosphere').controller('WhiteboardsBoardController', function(Fabric, FabricConstants, whiteboardsBoardFactory, $routeParams, $scope) {

    // Variable that will keep track of the current whiteboard id
    var whiteboardId = $routeParams.whiteboardId;

    // Variable that will keep track of the current whiteboard
    $scope.whiteboard = null;

    // Element that will keep track of the whiteboard viewport
    var viewport = document.getElementById('whiteboards-board-viewport');

    // Variable that will keep track of the whiteboard Fabric.js instance
    var canvas = null;

    // Open a websocket connection for real-time communication with the server (chat + whiteboard changes)
    var socket = io();

    /* WHITEBOARD */

    /**
     * Get the current whiteboard. This will include the number of online people, as well
     * as the content of the whiteboard
     */
    var getWhiteboard = function() {
      whiteboardsBoardFactory.getWhiteboard(whiteboardId).success(function(whiteboard) {
        $scope.whiteboard = whiteboard;
      });
    };

    /* CANVAS */

    /**
     * Initialize the Fabric.js canvas and load the whiteboard content
     * and online users
     */
    var initializeCanvas = function() {
      // Ensure that the horizontal and vertical origins of objects are set to center
      fabric.Object.prototype.originX = fabric.Object.prototype.originY = 'center'
      // Initialize the whiteboard Fabric.js instance
      canvas = new fabric.Canvas('whiteboards-board-board');
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
      var centerX = (last.x + (viewportWidth / 2)) / zoomLevel;
      var centerY = (last.y + (viewportHeight / 2)) / zoomLevel;

      return {
        'x': centerX,
        'y': centerY
      }
    };

    initializeCanvas();

    /* TOOLBAR */

    // Variable that will keep track of the selected action in the toolbar
    $scope.mode = 'move';

    /**
     * Set the mode of the whiteboard toolbar
     *
     * @param  {Boolean}        newMode           The mode the toolbar should be put in. Accepted values are `move`, `erase`, `draw`, `shape` and `text`
     */
    var setMode = $scope.setMode = function(newMode) {
      // If the selected mode is the same as the current mode, undo the selection
      // and switch back to move mode
      if ($scope.mode === newMode) {
        newMode = 'move';
      }

      // Revert the cursor
      canvas.hoverCursor = 'default';
      // Disable drawing mode
      setDrawMode(false);

      // Erase mode has been selected
      if (newMode === 'erase') {
        canvas.hoverCursor = 'not-allowed';
      // Draw mode has been selected
      } else if (newMode === 'draw') {
        setDrawMode(true);
      // Text mode has been selected
      } else if (newMode === 'text') {
        addText();
      }

      $scope.mode = newMode;
    };

    /* DRAWING */

    /**
     * Enable or disable drawing mode for the whiteboard canvas
     *
     * @param  {Boolean}        drawMode          Whether drawing mode for the whiteboard canvas should be enabled
     */
    var setDrawMode = $scope.setDrawMode = function(drawMode) {
      canvas.isDrawingMode = drawMode
    };

    /* ERASE */

    /**
     * Delete the selected whiteboard item when the whiteboard
     * is in erase mode
     */
    canvas.on('object:selected', function() {
      if ($scope.mode === 'erase') {
        canvas.remove(canvas.getActiveObject());
        // TODO: REST API call to remove item
      }
    });

    /* TEXT */

    /**
     * Add an editable text field to the whiteboard canvas
     */
    var addText = $scope.addText = function() {
      // Add the editable text field to the center of the whiteboard canvas
      var canvasCenter = getCanvasCenter();
      // Start off with an empty text field
      var text = new fabric.IText('', {
        left: canvasCenter.x,
        top: canvasCenter.y ,
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
    };

    /* SIDEBAR */

    // Variable that will keep track of whether the chat/online sidebar is expanded
    $scope.sidebarExpanded = true;

    // Variable that will keep track of the current mode the sidebar is displayed in
    $scope.sidebarMode = 'chat';

    // Variable that will keep track of the chat messages on the current whiteboard
    $scope.chatMessages = [];

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
     */
    var createChatMessage = $scope.createChatMessage = function() {
      whiteboardsBoardFactory.createChatMessage(whiteboardId, $scope.newChatMessage.body).success(function(chatMessage) {
        // Reset the new chat message
        $scope.newChatMessage = null;
      });
    };

    /**
     * Get the most recent chat messages
     */
    var getChatMessages = function() {
      whiteboardsBoardFactory.getChatMessages(whiteboardId).success(function(chatMessages) {
        // Reverse the returned chat messages to ensure that the newest chat
        // message is at the bottom
        $scope.chatMessages = chatMessages.reverse();
      });
    };

    /**
     * When a new chat message is received via the websocket, add it to
     * the list of chat messages
     */
    socket.on('chat', function(chatMessage){
      $scope.chatMessages.push(chatMessage);
    });

    // Get the most recent chat messages
    getChatMessages();




















    var addCircle = $scope.addCircle = function() {
          // create a rectangle object
    var rect = new fabric.Rect({
      left: getCanvasCenter().x,
      top: getCanvasCenter().y,
      fill: 'red',
      width: 20,
      height: 20
    });

    // "add" rectangle onto canvas
    canvas.add(rect);
    }

    var addImage = $scope.addImage = function() {
      fabric.Image.fromURL('http://upload.wikimedia.org/wikipedia/commons/thumb/d/de/Redwood_National_Park%2C_fog_in_the_forest.jpg/220px-Redwood_National_Park%2C_fog_in_the_forest.jpg', function(oImg) {
        oImg.left = getCanvasCenter().x;
        oImg.top = getCanvasCenter().y;
        oImg.originX = 'center';
        oImg.originY = 'center';
        canvas.add(oImg);
      });
    }

    var zoomIn = $scope.zoomIn = function() {
      var currentZoom = canvas.getZoom();
      var newZoom = currentZoom + 0.5;
      canvas.setZoom(newZoom);
      canvas.absolutePan(new fabric.Point(last.x, last.y));
    };

    var zoomOut = $scope.zoomOut = function() {
      var currentZoom = canvas.getZoom();
      var newZoom = currentZoom - 0.5;
      if (newZoom > 0.1) {
        canvas.setZoom(newZoom);
        canvas.absolutePan(new fabric.Point(last.x, last.y));
      }
    };


    var isDraggingCanvas = false;
    var start = {
      'x': 0,
      'y': 0
    };
    var latest = {
      'x': 0,
      'y': 0
    }
    var last = {
      'x': 0,
      'y': 0
    }

    canvas.on('mouse:down', function(e) {
      if (!canvas.getActiveObject() && !canvas.isDrawingMode) {
        isDraggingCanvas = true;
        canvas.selection = false;

        start.x = e.e.layerX;
        start.y = e.e.layerY;
        console.log(start);
        console.log(e.e);
      }
    });

    canvas.on('mouse:up', function(e) {
      if (isDraggingCanvas) {
        isDraggingCanvas = false;
        canvas.selection = true;

        last = {
          x: latest.x,
          y: latest.y
        };
      }
    });

    canvas.on('mouse:move', function(e) {
      if (isDraggingCanvas) {
        var current = {
          x: e.e.layerX,
          y: e.e.layerY
        };

        latest.x = last.x - (current.x - start.x);
        latest.y = last.y - (current.y - start.y);
        canvas.absolutePan(new fabric.Point(latest.x, latest.y));
      }
    });

    //
    //
    //

    fabric.Object.prototype.toObject = (function(toObject) {
      return function () {
        return fabric.util.object.extend(toObject.call(this), {
          'uid': this.uid,
          'index': canvas.getObjects().indexOf(this)
        });
      };
    })(fabric.Object.prototype.toObject);

    canvas.on('path:created', function(e) {
      var object = e.target;
      if (!object.get('isUpdate')) {
        object.set('uid', Math.round(Math.random() * 10000));
        whiteboardsBoardFactory.addWhiteboardElement(whiteboardId, object.toObject());
      }
      object.set('isUpdate', false);
    });

    canvas.on('object:added', function(e) {
      var object = e.target;
      console.log('OBJECT ADDED');
      console.log(object.type);
      if (!object.get('isUpdate')) {
        object.set('uid', Math.round(Math.random() * 10000));
        whiteboardsBoardFactory.addWhiteboardElement(whiteboardId, object.toObject());
      }
      object.set('isUpdate', false);
    });

    canvas.on('object:modified', function(e) {
      console.log('Updating object');
      var object = e.target;
      if (!object.get('isUpdate')) {
        whiteboardsBoardFactory.updateWhiteboardElement(whiteboardId, object.toObject());
      }
      object.set('isUpdate', false);
    });

    ///
    ///
    ///

    socket.on('addElement', function(element) {
      console.log('ADDING NEW ELEMENT');
      if (getElement(element.uid)) {
        return false;
      }
      var type = fabric.util.string.camelize(fabric.util.string.capitalize(element.type));
      if (fabric[type].async) {
          fabric[type].fromObject(element, function (img) {
            img.set('isUpdate', true);
              canvas.add(img);
          });
      } else {
        var item = fabric[type].fromObject(element);
        item.set('isUpdate', true);
          canvas.add(item);
      }
    });

    socket.on('updateElement', function(element) {
      console.log('UPDATING ELEMENT');
      if (getElement(element.uid)) {
        canvas.remove(getElement(element.uid));
      }
      var type = fabric.util.string.camelize(fabric.util.string.capitalize(element.type));
      if (fabric[type].async) {
          fabric[type].fromObject(element, function (img) {
            img.set('isUpdate', true);
              canvas.add(img);
          });
      } else {
        var item = fabric[type].fromObject(element);
        item.set('isUpdate', true);
          canvas.add(item);
      }
    });

    var getElement = function(uid) {
      var elements = canvas.getObjects();
      for (var i = 0; i < elements.length; i++) {
        if (elements[i].get('uid') === uid) {
          return elements[i];
        }
      }
      return null;
    };

  });

}(window.angular));
