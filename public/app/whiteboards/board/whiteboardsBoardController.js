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

  angular.module('collabosphere').controller('WhiteboardsBoardController', function(Fabric, FabricConstants, $scope) {

    var canvas = new fabric.Canvas('board');

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

    var toggleDraw = $scope.toggleDraw = function() {
      canvas.isDrawingMode = !canvas.isDrawingMode;
    };

    var deleteMode = false;
    var toggleDelete = $scope.toggleDelete = function() {
      deleteMode = !deleteMode;
    };

    canvas.on('object:selected', function() {
      if (deleteMode) {
        console.log('Removing');
        canvas.remove(canvas.getActiveObject());
      }
    });

    var addText = $scope.addText = function() {
      //var text = new fabric.Text('hello world', { left: 100, top: 100 });
      //canvas.add(text);
      var text = new fabric.IText('Tap and Type', {
  fontFamily: 'arial black',
  left: 100,
  top: 100 ,
})
      canvas.add(text);
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

    var getCanvasCenter = function() {
      return {
        'x': (last.x / canvas.getZoom()) + (viewport.clientWidth / canvas.getZoom() / 2),
        'y': (last.y / canvas.getZoom()) + (viewport.clientHeight / canvas.getZoom() / 2)
      }
    }

  });

}(window.angular));
