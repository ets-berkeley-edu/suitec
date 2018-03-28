/**
 * Copyright ©2018. The Regents of the University of California (Regents). All Rights Reserved.
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

  /**
   * Display an activity network for a given dataset.
   */
  angular.module('collabosphere').directive('activityNetwork', function($compile, $templateCache) {
    return {
      'restrict': 'E',
      'scope': {
        'interactions': '=',
        'loadProfileById': '=',
        'me': '=',
        'messageUser': '=',
        'user': '='
      },
      'templateUrl': '/app/dashboard/activityNetwork.html',
      'link': function(scope, elem, attrs) {

        var DEFAULT_RADIUS = 10;

        // Initialize interaction types; default to all selected.
        var INTERACTION_TYPES = {
          'Views': [ 'get_view_asset' ],
          'Likes': [ 'get_like' ],
          'Comments': ['get_asset_comment_reply', 'get_asset_comment'],
          'Posts': [ 'get_discussion_entry_reply' ],
          'Pins': [ 'get_pin_asset' ],
          'Assets Added to Whiteboard': [ 'get_whiteboard_add_asset' ],
          'Remixes': [ 'get_remix_whiteboard' ],
          'Whiteboards Exported': [ 'co_create_whiteboard' ]
        };

        scope.interactionTypesEnabled = _.mapValues(INTERACTION_TYPES, _.constant(true));

        var resetNodes = function() {
          if (scope.showUsers === 'recent') {
            scope.interactions.nodes = scope.interactions.recentUsers;
          } else {
            scope.interactions.nodes = scope.interactions.allUsers;
          }
        };

        scope.showUsers = 'recent';
        resetNodes();

        var linksByIds = {};
        var linkTypesVisible = {};

        // Initialize force diagram.
        var svg = d3.select('#profile-activity-network');
        var container = d3.select('.profile-activity-network-container');
        var controlsForm = d3.select('#profile-activity-network-controls');

        var simulation = d3.forceSimulation();
        simulation.force('link', d3.forceLink().id(function(d) { return d.id; }));
        simulation.alphaDecay(0.01);

        scope.$watchGroup(['interactions', 'user'], function(newVals, oldVals) {
          // Don't reload the diagram unless interaction data or user id has changed.
          var newUserCount = _.size(_.get(newVals, ['0', 'allUsers']));
          var oldUserCount = _.size(_.get(oldVals, ['0', 'allUsers']));
          var newUserId = _.get(newVals, ['1', 'id']);
          var oldUserId = _.get(oldVals, ['1', 'id']);
          if ((newUserCount === oldUserCount) && (newUserId === oldUserId)) {
            return;
          }

          resetNodes();

          // Set the focal user, whose avatar will appear larger and who will be the point of reference for interaction counts.
          scope.focalUser = scope.user;

          // The selected user is set on mouseover.
          scope.selectedUser = scope.focalUser;

          // Clear any existing elements within the SVG and re-initialize.
          svg.selectAll('g').remove();
          svg.selectAll('defs').remove();

          var defs = svg.append('defs');
          var g = svg.append('g');

          var linkSelection = g.append('g')
            .attr('class', 'links')
            .selectAll('line');
          var nodeSelection = g.append('g')
            .attr('class', 'nodes')
            .selectAll('g.circle');
          var clipPathRect = defs.append('clipPath')
            .attr('id', 'profile-activity-network-clipper')
            .append('rect');

          var isZoomingToPreset = false;

          var executeZoom = function() {
            g.attr('transform', d3.event.transform);
          };
          var zoom = d3.zoom().on('zoom', executeZoom);
          svg.call(zoom);

          scope.zoomScale = 1;

          zoom.on('end', function() {
            // All zoom presets should be re-enabled on the next user zoom.
            if (!isZoomingToPreset) {
              scope.currentNetworkPreset = null;
            } else {
              isZoomingToPreset = false;
            }
            // Update the scope with the current zoom scale.
            scope.zoomScale = d3.zoomTransform(svg.node()).k;
          });

          scope.interactions.links = [];

          // Create pattern elements for user avatars.
          var avatar = function(d) {
            var avatarId = 'avatar_' + d.id;
            defs.append('svg:pattern')
              .attr('id', avatarId)
              .attr('width', '100%')
              .attr('height', '100%')
              .attr('patternContentUnits', 'objectBoundingBox')
              .append('svg:image')
              .attr('xlink:href', d.canvas_image)
              .attr('width', 1)
              .attr('height', 1)
              .attr('preserveAspectRatio', 'none');
            return 'url(#' + avatarId + ')';
          };

          // Calculate link weight between nodes.
          var calculateLinks = function() {
            _.forOwn(scope.interactionTypesEnabled, function(isEnabled, key) {
              _.forEach(INTERACTION_TYPES[key], function(interactionType) {
                linkTypesVisible[interactionType] = isEnabled;
              });
            });

            _.forEach(_.keys(linksByIds), function(key) {
              delete linksByIds[key];
            });

            // To ease selection logic, we explicitly link each node to itself.
            _.forEach(scope.interactions.nodes, function(node) {
              linksByIds[node.id + ',' + node.id] = {'total': 1};
            });

            _.forEach(scope.interactions.linkTypes, function(link) {
              if (!linkTypesVisible[link.type]) {
                return;
              }

              if (scope.showUsers === 'recent' &&
                 (!scope.interactions.recentIds[link.source] || !scope.interactions.recentIds[link.target])) {
                return;
              }

              var linkKey;
              var direction;
              if (link.source < link.target) {
                linkKey = link.source + ',' + link.target;
                direction = 'up';
              } else {
                linkKey = link.target + ',' + link.source;
                direction = 'down';
              }
              linksByIds[linkKey] = linksByIds[linkKey] || {};
              linksByIds[linkKey].total = linksByIds[linkKey].total || 0;
              linksByIds[linkKey].total += link.count;
              linksByIds[linkKey][direction] = linksByIds[linkKey][direction] || {};
              linksByIds[linkKey][direction][link.type] = linksByIds[linkKey][direction][link.type] || 0;
              linksByIds[linkKey][direction][link.type] += link.count;
            });

            scope.interactions.links.splice(0, scope.interactions.links.length);

            _.forOwn(linksByIds, function(value, key) {
              var keyComponents = key.split(',');
              var taperedTotal = value.total === 0 ? 0 : Math.round(1 + Math.sqrt(value.total - 1));
              scope.interactions.links.push({
                'source': keyComponents[0],
                'target': keyComponents[1],
                'value': taperedTotal
              });
            });
          };

          // Fade out an element (used for user details tooltip).
          var fadeout = function(element) {
            element.transition(d3.transition().duration(500))
              .on('end', function() {
                this.remove();
              })
              .style('opacity', 0);
          };

          // Node selection handler; show connections and tooltip.
          var onNodeSelected = function(node) {
            if (!node) {
              node = d3.select(this).node().__data__;
            }
            scope.selectedUser = node;

            if (isNodeConnected(scope.selectedUser)) {
              showConnections();
            }

            // Clear any existing tooltips.
            container.selectAll('.profile-activity-network-tooltip').remove();

            var coordinates = [0, 0];
            coordinates = d3.mouse(container.node());
            var mouseX = coordinates[0];
            var mouseY = coordinates[1];

            // Calculate interaction totals between the selected users.
            var interactionsLeft;
            var interactionsRight;
            if (scope.focalUser.id < scope.selectedUser.id) {
              var linksBetweenUsers = linksByIds[scope.focalUser.id + ',' + scope.selectedUser.id];
              if (linksBetweenUsers) {
                interactionsLeft = linksBetweenUsers.up || {};
                interactionsRight = linksBetweenUsers.down || {};
              }
            } else if (scope.focalUser.id > scope.selectedUser.id) {
              var linksBetweenUsers = linksByIds[scope.selectedUser.id + ',' + scope.focalUser.id];
              if (linksBetweenUsers) {
                interactionsLeft = linksBetweenUsers.down || {};
                interactionsRight = linksBetweenUsers.up || {};
              }
            }

            if (interactionsLeft || interactionsRight) {
              scope.interactionCounts = {
                'left': {},
                'right': {}
              };
              _.forOwn(INTERACTION_TYPES, function(typesList, interactionLabel) {
                scope.interactionCounts.left[interactionLabel] = 0;
                scope.interactionCounts.right[interactionLabel] = 0;
                _.forEach(typesList, function(typeKey) {
                  var leftCount = (interactionsLeft[typeKey] || 0);
                  var rightCount = (interactionsRight[typeKey] || 0);
                  // Whiteboard co-creation is a special-case bidirectional activity.
                  if (typeKey === 'co_create_whiteboard') {
                    var totalCount = leftCount + rightCount;
                    leftCount = totalCount;
                    rightCount = totalCount;
                  }
                  scope.interactionCounts.left[interactionLabel] += leftCount;
                  scope.interactionCounts.right[interactionLabel] += rightCount;
                });
              });
            } else {
              scope.interactionCounts = null;
            }

            // Position tooltip and arrow; orientation will depend on location within the chart.
            var containerDimensions = container.node().getBoundingClientRect();
            var tooltipOrientation = (mouseX < 240) ? 'left' : 'right';

            var tooltip = container.append('div')
              .attr('class', ('profile-activity-network-tooltip profile-activity-network-tooltip-' + tooltipOrientation))
              .style('bottom', (containerDimensions.height - mouseY + 16) + 'px');

            if (tooltipOrientation === 'left') {
              tooltip.style('left', (mouseX - 30) + 'px');
            } else {
              tooltip.style('right', (containerDimensions.width - mouseX - 30) + 'px');
            }

            // The tooltip starts out hidden...
            tooltip.style('opacity', 0);
            tooltip.append(function() {
              var tooltipDiv = document.createElement('div');
              tooltipDiv.innerHTML = $templateCache.get('/app/dashboard/activityNetworkTooltip.html');
              $compile(tooltipDiv)(scope);
              return tooltipDiv;
            });

            // ...and transitions to visible.
            tooltip.transition(d3.transition().duration(100).ease(d3.easeLinear))
              .on('start', function() {
                tooltip.style('display', 'block');
              })
              .style('opacity', 1);

            // Cancel pending fadeout if hovering over tooltip.
            tooltip.on('mouseenter', function() {
              tooltip.transition();
            });

            // Restart fadeout after leaving tooltip.
            tooltip.on('mouseleave', function() {
              fadeout(tooltip);
            });
          };

          // Node deselection handler; remove tooltip, restore opacity to all nodes.
          var onNodeDeselected = function() {
            fadeout(container.select('.profile-activity-network-tooltip'));
            nodeSelection.style('opacity', 1);
            linkSelection.style('opacity', function(link) {
              return isLinkConnected(link) ? 1 : 0.3;
            });
          };

          // Touch devices have no 'mouseout' event; call the deselection handler when document elements are tapped.
          if ('ontouchstart' in window) {
            document.body.addEventListener('touchstart', onNodeDeselected);
          }

          // Restart simulation.
          var restart = function(alpha, recalculateConnections) {
            resetNodes();
            calculateLinks();

            linkSelection = linkSelection.data(scope.interactions.links);
            linkSelection.exit().remove();

            nodeSelection = nodeSelection.data(scope.interactions.nodes);
            nodeSelection.exit().remove();
            svg.selectAll('circle').remove();
            svg.selectAll('text').remove();

            simulation.on('tick', ticked);
            simulation.nodes(scope.interactions.nodes);
            simulation.force('link').links(scope.interactions.links);

            linkSelection = linkSelection.enter().append('line')
              .attr('stroke', 'black')
              .merge(linkSelection);

            nodeSelection = nodeSelection.enter().append('g')
              .attr('class', 'node')
              .merge(nodeSelection);
            nodeSelection.attr('id', function(d) {
              return 'profile-activity-network-user-node-' + d.id;
            });
            nodeSelection.append('circle')
              .attr('r', function(d) {
                if (d.id === scope.focalUser.id) {
                  return 25;
                } else {
                  return DEFAULT_RADIUS;
                }
              })
              .on('mouseover', onNodeSelected)
              .on('mouseout', onNodeDeselected)
              .on('click', function(node) {
                container.select('.profile-activity-network-tooltip').remove();
                scope.focalUser = node;
                onNodeSelected(node);
                restart(0.1, false);
              });
            nodeSelection.append('text')
              .attr('dx', 0)
              .attr('dy', function(d) {
                if (d.id === scope.focalUser.id) {
                  return 35;
                } else {
                  return 25;
                }
              })
              // Only first names fit easily on the force diagram.
              .text(function(d) {
                return d.canvas_full_name.split(' ')[0];
              });

            // Calculate links to highlight the focal user's connections, but not in full mouseover mode.
            if (recalculateConnections) {
              showConnections();
              onNodeDeselected();
            }

            simulation.alpha(alpha).restart();
          };

          // Called when link type selection is changed.
          var restartLinks = scope.restartLinks = function() {
            restart(0.1, true);
          };

          // Size force diagram to window, accounting for course size and resizing as necessary.
          var activityNetworkScale = Math.round(Math.sqrt(4000 * scope.interactions.nodes.length));
          var bounds;
          var viewportWidth;
          var viewportHeight;

          scope.minScale = 1;

          var isNodeConnected = function(node) {
            var key1 = scope.focalUser.id + ',' + node.id;
            var key2 = node.id + ',' + scope.focalUser.id;
            return !!(linksByIds[key1] && linksByIds[key1].total) || !!(linksByIds[key2] && linksByIds[key2].total);
          };

          var isLinkConnected = function(link) {
            return scope.focalUser.id === link.source.id || scope.focalUser.id === link.target.id;
          };

          var sizeAndRestart = function(recalculateConnections) {
            viewportWidth = controlsForm.node().getBoundingClientRect().width;
            viewportHeight = Math.max(400, Math.min(250, activityNetworkScale));

            var aspectRatio = viewportWidth * 1.0 / viewportHeight;

            svg.attr('width', viewportWidth).attr('height', viewportHeight);
            clipPathRect.attr('width', viewportWidth).attr('height', viewportHeight);

            var xMargin = Math.max(0, (Math.round(activityNetworkScale * aspectRatio) - viewportWidth) / 2);
            var yMargin = Math.max(0, (activityNetworkScale - viewportHeight) / 2);
            bounds = [[-1 * xMargin, -1 * yMargin], [viewportWidth + xMargin, viewportHeight + yMargin]];
            scope.minScale = Math.min(viewportHeight / activityNetworkScale, 1);
            zoom.scaleExtent([scope.minScale, 1]).translateExtent(bounds);

            simulation.force('charge', d3.forceManyBody().strength(-0.3 * activityNetworkScale).distanceMax(300));
            simulation.force('gravity', d3.forceManyBody().strength(70).distanceMax(600));
            simulation.force('center', d3.forceCenter(viewportWidth / 2, viewportHeight / 2));
            simulation.force('collide', d3.forceCollide(30));
            restart(0.6, recalculateConnections);
          };

          scope.meNode = null;

          var networkPreset = scope.networkPreset = function(preset) {
            isZoomingToPreset = true;
            scope.currentNetworkPreset = preset;
            if (preset === 'me') {
              var translateX = Math.max(bounds[0][0], Math.min(viewportWidth / 2 - scope.meNode.x, bounds[1][0] - viewportWidth));
              var translateY = Math.max(bounds[0][1], Math.min(viewportHeight / 2 - scope.meNode.y, bounds[1][1] - viewportHeight));
              svg.transition().duration(300).call(zoom.transform, d3.zoomIdentity.translate(translateX, translateY));
            } else if (preset === 'all') {
              svg.transition().duration(300).call(zoom.scaleTo, scope.minScale);
            }
          };

          var networkZoom = scope.networkZoom = function(scale) {
            svg.transition().duration(300).call(zoom.scaleBy, scale);
          };

          window.addEventListener('resize', function() {
            sizeAndRestart(false);
          });

          // Highlight connected nodes and links for a given node.
          var showConnections = function() {
            nodeSelection.attr('class', function(node) {
              var classAttr;
              if (isNodeConnected(node)) {
                classAttr = 'node node-connected';
              } else {
                classAttr = 'node node-unconnected';
              }
              if (node.id === scope.me.id) {
                scope.meNode = node;
                classAttr += ' node-me';
              } else if (node.looking_for_collaborators) {
                classAttr += ' node-looking-for-collaborators';
              }
              return classAttr;
            });
            nodeSelection.style('fill', function(node) {
              if (isNodeConnected(node)) {
                return avatar(node);
              } else {
                return '#eee';
              }
            });
            nodeSelection.style('opacity', function(node) {
              return isNodeConnected(node) ? 1 : 0.35;
            });
            linkSelection.style('opacity', function(link) {
              return isLinkConnected(link) ? 1 : 0.15;
            });
            linkSelection.style('stroke-width', function(link) {
              return isLinkConnected(link) ? link.value : 1;
            });
          };

          var setShowUsers = scope.setShowUsers = function(showUsers) {
            scope.showUsers = showUsers;
            restart(0.1, true);
          };

          // Handle user profile loads triggered from a tooltip link.
          var switchUser = scope.switchUser = function(user) {
            container.select('.profile-activity-network-tooltip').remove();
            scope.loadProfileById(user.id, false, true);
          };

          // Incremental updates to force animation.
          var ticked = function() {
            linkSelection
              .attr('x1', function(d) { return d.source.x; })
              .attr('y1', function(d) { return d.source.y; })
              .attr('x2', function(d) { return d.target.x; })
              .attr('y2', function(d) { return d.target.y; });

            svg.selectAll('circle')
              .attr('cx', function(d) {
                if (d.id === scope.user.id) {
                  return d.x = Math.max((viewportWidth - 200) / 2, Math.min((viewportWidth + 200) / 2, d.x));
                } else if (d.id === scope.focalUser.id) {
                  return d.x = Math.max(bounds[0][0] + 40, Math.min(bounds[1][0] - 40, d.x));
                } else {
                  return d.x = Math.max(bounds[0][0] + DEFAULT_RADIUS + 15, Math.min(bounds[1][0] - (DEFAULT_RADIUS + 15), d.x));
                }
              })
              .attr('cy', function(d) {
                if (d.id === scope.user.id) {
                  return d.y = Math.max((viewportHeight - 200) / 2, Math.min((viewportHeight + 200) / 2, d.y));
                } else if (d.id === scope.focalUser.id) {
                  return d.y = Math.max(bounds[0][1] + 30, Math.min(bounds[1][1] - 45, d.y));
                } else {
                  return d.y = Math.max(bounds[0][1] + DEFAULT_RADIUS + 5, Math.min(bounds[1][1] - (DEFAULT_RADIUS + 20), d.y));
                }
              });

            svg.selectAll('text')
              .attr('x', function(d) { return d.x; })
              .attr('y', function(d) { return d.y; });
          };

          sizeAndRestart(true);
        });
      }
    };
  });

  /**
   * Given an object, return an array of those keys which have truthy values. Used in the tooltip template for well-behaved
   * row repeats.
   */
  angular.module('collabosphere').filter('pickKeys', function() {
    return function(interactionTypes) {
      return _.keys(_.pickBy(interactionTypes));
    };
  });

  /**
   * Truncate a string to the first n words.
   */
  angular.module('collabosphere').filter('firstWords', function() {
    return function(string, count) {
      return string.split(' ').slice(0, count).join(' ');
    };
  });

}(window.angular));
