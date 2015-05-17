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

  angular.module('collabosphere').controller('WhiteboardsBoardController', function(Fabric, FabricConstants, whiteboardsBoardFactory, $modal, $routeParams, $scope) {

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

        // Load the content of the whiteboard
        canvas.loadFromJSON({'objects': whiteboard.whiteboard_elements}, function() {
          // Set the correct index for all items
          var elements = canvas.getObjects();
          for (var i = 0; i < elements.length; i++) {
            elements[i].moveTo(elements[i].get('index'));
          }

          canvas.renderAll();
        });
      });
    };

    /**
     * When a user has joined or left the whiteboard, update the list of online users
     */
    socket.on('online', function(onlineUsers){
      $scope.whiteboard.online = onlineUsers;
    });

    /* CANVAS */

    /**
     * Extend the Fabric.js `toObject` deserialization function to include
     * the property that uniquely identifies an object on the canvas, as well as
     * a property containing the index of the object relative to the other items
     * on the canvas
     */
    fabric.Object.prototype.toObject = (function(toObject) {
      return function () {
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
      // Extract the type from the serialized element
      var type = fabric.util.string.camelize(fabric.util.string.capitalize(element.type));
      if (fabric[type].async) {
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
      if (!element.get('uid')) {
        // Add a unique id to the element
        element.set('uid', Math.round(Math.random() * 10000));
        socket.emit('addElement', element.toObject());
      }
    });

    /**
     * A new element was added to the whitebard canvas by a different user
     */
    socket.on('addElement', function(element) {
      deserializeElement(element, function(element) {
        // Add the element to the whiteboard canvas and move it to its appropriate index
        canvas.add(element);
        element.moveTo(element.get('index'));
      });
    });

    /**
     * A whiteboard canvas element was updated by the current user
     */
    canvas.on('object:modified', function(ev) {
      var element = ev.target;
      // Only notify the server if the element was updated by the current user
      if (!element.get('isSocketUpdate')) {
        socket.emit('updateElement', element.toObject());
      }
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
        canvas.remove(text);
        // Notify the server if the element was already stored
        if (element.get('uid')) {
          socket.emit('deleteElement', element.toObject());
        }
      // The text element did not exist before. Notify the server that the element was added
      } else if (!element.get('uid')) {
        element.set('uid', Math.round(Math.random() * 10000));
        socket.emit('addElement', element.toObject());
      // The text element existed before. Notify the server that the element was updated
      } else {
        socket.emit('updateElement', element.toObject());
      }

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
      }
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

    /* ZOOMING */

    // Variable that will keep track of the current zoom level
    $scope.zoomLevel = 1;

    /**
     * TODO
     */
    var zoom = $scope.zoom = function(zoomDelta) {
      var currentZoom = $scope.zoomLevel;
      // Modify the zoom level
      $scope.zoomLevel = currentZoom + zoomDelta;
      //canvas.zoomToPoint(new fabric.Point(getCanvasCenter().x, getCanvasCenter().y), $scope.zoomLevel);
      // TODO: Recalculate the pan point and zoom to center
      // last = ;
      canvas.setZoom($scope.zoomLevel);
      canvas.absolutePan(new fabric.Point(last.x, last.y));
    };

    /* TOOLBAR */

    // Variable that will keep track of the selected action in the toolbar
    $scope.mode = 'move';

    /**
     * Set the mode of the whiteboard toolbar
     *
     * @param  {Boolean}        newMode           The mode the toolbar should be put in. Accepted values are `move`, `erase`, `draw`, `shape` and `text`
     */
    var setMode = $scope.setMode = function(newMode) {
      // Deactivate the currently selected item
      var activeElement = canvas.getActiveObject();
      if (activeElement && activeElement.type === 'i-text') {
        activeElement.exitEditing();
      }
      canvas.deactivateAll().renderAll();
      lockObjects(false);

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
        // Prevent objects from being moved when deleting
        lockObjects(true);
        // change the cursor to delete mode when hovering over an object
        canvas.hoverCursor = 'not-allowed';
      // Draw mode has been selected
      } else if (newMode === 'draw') {
        setDrawMode(true);

      closePopovers();
      // Shape mode has been selected
      } else if (newMode === 'shape') {
        addCircle();
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
    }

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

    /* ADD ASSET */

    $scope.items = ['1', '2'];

    /**
     * TODO
     */
    var reuseAsset = $scope.reuseAsset = function() {
      setMode('move');
      closePopovers();
      var modalInstance = $modal.open({
        templateUrl: '/app/whiteboards/reuse/reuse.html',
        controller: 'WhiteboardsReuseController',
        size: 'lg'
      });

      modalInstance.result.then(function(selectedAssets) {
        for (var i = 0; i < selectedAssets.length; i++) {
          var asset = selectedAssets[i];
          if (asset.thumbnail_url) {
            addAsset(asset.thumbnail_url);
          }
        }
      }, function () {
        console.log('Modal dismissed at: ' + new Date());
      });
    }

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
      socket.emit('chat', $scope.newChatMessage.body);
      // Reset the new chat message
      $scope.newChatMessage = null;
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
    canvas.setActiveObject(rect);
    }

    var addAsset = $scope.addAsset = function(url) {
      setMode('move');
      fabric.Image.fromURL(url, function(oImg) {
        oImg.left = getCanvasCenter().x;
        oImg.top = getCanvasCenter().y;
        canvas.add(oImg);
        canvas.setActiveObject(oImg);
      });
    }


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
        canvas.setCursor('grabbing');
        canvas.renderAll();
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
        canvas.setCursor('default');
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

    // TODO: Resize viewport when canvas is resized

    //
    //
    //

    /* angular.element(document.body).bind('click', function (e) {
        //Find all elements with the popover attribute
        var popups = document.querySelectorAll('*[popover]');
        if(popups) {
          //Go through all of them
          for(var i=0; i<popups.length; i++) {
            //The following is the popover DOM elemet
            var popup = popups[i];
            //The following is the same jQuery lite element
            var popupElement = angular.element(popup);

            var content;
            var arrow;
            if(popupElement.next()) {
              //The following is the content child in the popovers first sibling
              content = popupElement.next()[0].querySelector('.popover-content');
              //The following is the arrow child in the popovers first sibling
              arrow = popupElement.next()[0].querySelector('.arrow');
            }
            //If the following condition is met, then the click does not correspond
            //to a click on the current popover in the loop or its content.
            //So, we can safely remove the current popover's content and set the
            //scope property of the popover
            if(popup != e.target && e.target != content && e.target != arrow) {
              if(popupElement.next().hasClass('popover')) {
                //Remove the popover content
                popupElement.next().remove();
                //Set the scope to reflect this
                popupElement.scope().tt_isOpen = false;
              }
            }
          }
        }
      }); */

/*var hidePopover = function(element) {
    //Set the state of the popover in the scope to reflect this
    var elementScope = angular.element($(element).siblings('.popover')).scope().$parent;
    elementScope.isOpen = false;
    elementScope.$apply();
    //Remove the popover element from the DOM
    $(element).siblings('.popover').remove();
};
var hidePopovers = function(e) {
    $('*[popover]').each(function() {
        //Only do this for all popovers other than the current one that cause this event,
        if (!($(this).is(e.target) || $(this).has(e.target).length > 0) && $(this).siblings('.popover').length !==
            0 && $(this).siblings('.popover').has(e.target).length === 0) {
            hidePopover(this);
        }
    });
};*/

    var closePopovers = function() {
      var popupTriggers = document.querySelectorAll('*[popover-template]');
      var popups = document.querySelectorAll('.popover');
      for(var i=0; i<popups.length; i++) {
        var popup = angular.element(popups[i]);
        var elementScope = popup.scope().$parent;
        console.log(popup.scope().isOpen);
        console.log(popup.scope());
        elementScope.isOpen = false;
        //elementScope.$apply();
        popup.remove();
        //popup.scope().$apply();
        //console.log(popup.scope().isOpen);
        //console.log(popup.scope());
        //popup.remove();
      }
      //for(var i=0; i<popupTriggers.length; i++) {
      //  var popupTrigger = angular.element(popupTriggers[i]);
      //  console.log(popupTrigger);
      //  console.log(popupTrigger.scope());
      //  console.log(popupTrigger.scope().isOpen);
      //  popupTrigger.scope().isOpen = false;
      //}

    };

  });

}(window.angular));
