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

  angular.module('collabosphere').controller('LeaderboardController', function(userFactory, utilService, $scope) {

    // Default sort
    $scope.sortBy = 'rank';
    $scope.reverse = true;

    // Variable that will keep track of the users in this course and their points
    $scope.users = null;

    /**
     * Get the users in the engagement index and their engagement
     * index points
     */
    var getLeaderboard = function() {
      // The users in the engagement index can only be loaded by course admins
      // and users that share their points with the course
      if ($scope.me.is_admin || $scope.me.share_points) {
        userFactory.getLeaderboard().then(function(users) {
          $scope.users = users;

          // Extract the current user's rank
          for (var i = 0; i < $scope.users.length; i++) {
            if ($scope.users[i].id === $scope.me.id) {
              $scope.me.rank = $scope.users[i].rank;
              break;
            }
          }

          // Draw the boxplot showing how the current user ranks. The boxplot
          // is only shown when sufficient users share their score
          if ($scope.me.share_points && $scope.users.length >= 3) {
            drawBoxPlot();
          }
        });
      }
    };

    /**
     * Render the box plot showing how the current user ranks
     * in the course
     */
    var drawBoxPlot = function() {
      var points = [];
      for (var i = 0; i < $scope.users.length; i++) {
        points.push($scope.users[i].points);
      }

      // Wait until Angular has finished rendering the box plot container on the screen
      setTimeout(function() {
        // Render the box plot using highcharts
        // @see http://api.highcharts.com/highcharts
        var chart = new Highcharts.Chart({
          'chart': {
            'backgroundColor': 'transparent',
            'inverted': true,
            // Ensure that the box plot is displayed horizontally
            'margin': [0, 20, 0, 20],
            'renderTo': 'leaderboard-userinfo-boxplot',
            'type': 'boxplot'
          },

          'title':{
            // Ensure that no chart title is rendered
            'text':''
          },

          'legend': {
            // Ensure that no legend is rendered
            'enabled': false
          },

          'credits': {
            // Ensure that no highcarts watermark is rendered
            'enabled': false
          },

          'tooltip': {
            'hideDelay': 100,
            'positioner': function(labelWidth, labelHeight) {
              // Ensure that the tooltip does not overlap with the box plot to
              // allow access hover access to 'my points'
              return {
                x: 305,
                y: 15 - (labelHeight / 2)
              };
            },
            'shadow': false,
            'style': {
              'color': '#FFF'
            },
            // Ensure the tooltip is rendered as HTML to allow it
            // to overflow the box plot container
            'useHTML': true
          },

          // Ensure that no x-axis labels or lines are shown and
          // that the box plot takes up the maximum amount of space
          'xAxis': {
            'endOnTick': false,
            'labels': {
              'enabled': false
            },
            'lineWidth': 0,
            'startOnTick': false,
            'tickLength': 0
          },

          // Ensure that no y-axis labels or lines are shown and
          // that the box plot takes up the maximum amount of space
          'yAxis': {
            'endOnTick': false,
            'gridLineWidth': 0,
            'labels': {
              'enabled': false
            },
            'lineWidth': 0,
            'maxPadding': 0,
            'minPadding': 0,
            'startOnTick': false,
            'tickLength': 0,
            'title': {
              'enabled': false
            }
          },

          // Style the box plot
          'plotOptions': {
            'boxplot': {
              'color': '#88ACC4',
              'fillColor': '#88ACC4',
              'lineWidth': 1,
              'medianColor': '#EEE',
              'medianWidth': 3,
              'whiskerLength': 20,
              'whiskerWidth': 3
            }
          },

          'series': [
            // Box plot data serie
            {
              'data': [calculateBoxPlotData(points)],
              'pointWidth': 40,
              'tooltip': {
                'headerFormat': '',
                'pointFormat': 'Maximum: {point.high}<br/>' +
                             'Upper Quartile: {point.q3}<br/>' +
                             'Median: {point.median}<br/>' +
                             'Lower Quartile: {point.q1}<br/>' +
                             'Minimum: {point.low}',
                'borderColor': 'transparent'
              }
            // Current user points
            }, {
              'data': [[0, $scope.me.points]],
              'marker': {
                'fillColor': '#3179BC',
                'lineWidth': 5,
                'lineColor': '#3179BC'
              },
              'tooltip': {
                'headerFormat': '',
                'pointFormat': 'My Points: {point.y}'
              },
              'type': 'scatter'
            }
          ]
        });
      }, 0);
    };

    /**
     * Calculate the maximum value, upper quartile, median, lower quartile
     * and minimum value of a data series. These values can be used to
     * generate a box plot diagram
     *
     * @param  {Number[]}     series          The data series used to calculate the box plot values
     * @return {Number[]}     boxplotData     The calculated box plot values
     * @return {Number}       boxplotData[0]  The maximum value
     * @return {Number}       boxplotData[1]  The upper quartile value
     * @return {Number}       boxplotData[2]  The median value
     * @return {Number}       boxplotData[3]  The lower quartile value
     * @return {Number}       boxplotData[4]  The minimum value
     */
    var calculateBoxPlotData = function(series) {
      // Sort the provided data series in ascending order
      series.sort(function(a, b) {
        return b - a;
      });

      var min = series[0];
      var max = series[series.length - 1];

      // Calculate the quartiles
      var q1 = calculateQuartile(series, 1);
      var q2 = calculateQuartile(series, 2);
      var q3 = calculateQuartile(series, 3);

      return [max, q3, q2, q1, min];
    };

    /**
     * Calculate a quartile value for an ordered data series
     *
     * @param  {Number[]}     series        The data series to calculate a quartile value for. Note that this should be sorted in ascending order
     * @param  {Number}       quartile      The quartile to generate. For the median value, `2` should be provided
     * @return {Number}                     The calculated quartile
     */
    var calculateQuartile = function(series, quartile) {
      // Calculate the position of the quartile point in the series
      var quartileIndex = Math.floor(series.length / 4 * quartile);

      // If the quartile point lands on an item in the series, return that value
      if (series.length % 2) {
        return series[quartileIndex];
      // If the quartile point lands in between 2 items, calculate the average of those items
      } else {
        return (series[quartileIndex - 1] + series[quartileIndex]) / 2;
      }
    };

    /**
     * Get the URL at which the CSV export of the activities in course
     * can be downloaded
     *
     * @return {String}                     The URL at which the CSV export can be downloaded
     */
    var getCSVExportURL = $scope.getCSVExportURL = function() {
      return utilService.getApiUrl('/activities.csv');
    };

    /**
     * Change the sorting field and/or sorting direction when one of the
     * engagement list headers is clicked
     *
     * @param  {String}     sortBy          The name of the field to sort by
     */
    var sort = $scope.sort = function(sortBy) {
      $scope.sortBy = sortBy;
      $scope.reverse = !$scope.reverse;
    };

    /**
     * Store whether the current user's engagement index points should be
     * shared with the entire course. This function will only be used for the
     * initial save
     */
    var saveSharePoints = $scope.saveSharePoints = function() {
      userFactory.updateSharePoints($scope.me.new_share_points).success(function() {
        $scope.me.share_points = $scope.me.new_share_points;
        getLeaderboard();
      });
    };

    /**
     * Change whether the current user's engagement index points should be shared
     * with the entire class. This will be executed every time the corresponding
     * checkbox is changed following the initial save
     */
    var changeSharePoints = $scope.changeSharePoints = function() {
      // Only save the new setting straight away when the initial
      // save has already happened. Note that admins will not see the
      // splash screens, so their changes can be saved straight away
      if ($scope.me.share_points !== null || $scope.me.is_admin) {
        $scope.saveSharePoints();
      }
    };

    userFactory.getMe().success(function(me) {
      $scope.me = me;

      // If the user hasn't indicated if their score should be
      // shared with the course, check the checkbox by default
      $scope.me.new_share_points = $scope.me.share_points;
      if ($scope.me.share_points === null && !$scope.me.is_admin) {
        $scope.me.new_share_points = true;
      }

      getLeaderboard();
    });

  });

}(window.angular));
