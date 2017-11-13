/**
 * Copyright ©2017. The Regents of the University of California (Regents). All Rights Reserved.
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
          'Use Assets': [ 'get_whiteboard_add_asset' ],
          'Remixes': [ 'get_remix_whiteboard' ],
          'Co-creations': [ 'co_create_whiteboard' ]
        };
        scope.interactionTypesEnabled = _.mapValues(INTERACTION_TYPES, _.constant(true));

        var linksByIds = {};
        var linkTypesVisible = {};

        // Initialize force diagram.
        var svg = d3.select('#profile-activity-network');
        var container = d3.select('.profile-activity-network-container');
        var controlsForm = d3.select('#profile-activity-network-controls');

        var simulation = d3.forceSimulation();
        simulation.force('link', d3.forceLink().id(function(d) { return d.id; }));
        simulation.force('collide', d3.forceCollide(30));
        simulation.alphaDecay(0.01);

        scope.$watchGroup(['interactions', 'user'], function() {
          // Clear any existing elements within the SVG and re-initialize.
          svg.selectAll('g').remove();
          svg.selectAll('defs').remove();

          var defs = svg.append('defs');
          var linkSelection = svg.append('g')
            .attr('class', 'links')
            .selectAll('line');
          var nodeSelection = svg.append('g')
            .attr('class', 'nodes')
            .selectAll('g.circle');

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

              var linkKey;
              var direction;
              if (link.source > link.target) {
                linkKey = link.source + ',' + link.target;
                direction = 'up';
              } else {
                linkKey = link.target + ',' + link.source;
                direction = 'down';
              }
              linksByIds[linkKey] = linksByIds[linkKey] || {};
              linksByIds[linkKey].total = linksByIds[linkKey].total || 0;
              linksByIds[linkKey].total += 1;
              linksByIds[linkKey][direction] = linksByIds[linkKey][direction] || {};
              linksByIds[linkKey][direction][link.type] = linksByIds[linkKey][direction][link.type] || 0;
              linksByIds[linkKey][direction][link.type] += 1;
            });

            scope.interactions.links.splice(0, scope.interactions.links.length);

            _.forOwn(linksByIds, function(value, key) {
              var keyComponents = key.split(',');
              scope.interactions.links.push({
                'source': keyComponents[0],
                'target': keyComponents[1],
                'value': value.total
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

          // Drag event handlers.
          var onDragStarted = function(d) {
            if (!d3.event.active) { simulation.alphaTarget(0.3).restart(); }
            d.fx = d.x;
            d.fy = d.y;
          };

          var onDragEnded = function(d) {
            if (!d3.event.active) { simulation.alphaTarget(0); }
            d.fx = null;
            d.fy = null;
          };

          var onDragged = function(d) {
            d.fx = d3.event.x;
            d.fy = d3.event.y;
          };

          // Node selection handler; show connections and tooltip.
          var onNodeSelected = function() {
            scope.selectedUser = d3.select(this).node().__data__;
            showConnections.call(this);

            // Clear any existing tooltips.
            container.selectAll('.profile-activity-network-tooltip').remove();

            if (scope.selectedUser.id !== scope.user.id) {
              // The tooltip starts out hidden...
              var tooltip = container.append('div')
                .attr('class', 'profile-activity-network-tooltip')
                .style('left', (scope.selectedUser.x - 60) + 'px')
                .style('top', (scope.selectedUser.y - 275) + 'px')
                .style('opacity', 0);

              // ...and transitions to visible.
              tooltip.transition(d3.transition().duration(100).ease(d3.easeLinear))
                .on('start', function() {
                  tooltip.style('display', 'block');
                })
                .style('opacity', 1);

              // Compile the tooltip template.
              tooltip.append(function() {
                var tooltipDiv = document.createElement('div');
                tooltipDiv.innerHTML = $templateCache.get('/app/dashboard/activityNetworkTooltip.html');
                $compile(tooltipDiv)(scope);
                return tooltipDiv;
              });

              // Cancel pending fadeout if hovering over tooltip.
              tooltip.on('mouseenter', function() {
                tooltip.transition();
              });

              // Restart fadeout after leaving tooltip.
              tooltip.on('mouseleave', function() {
                fadeout(tooltip);
              });
            }
          };

          // Restart simulation.
          var restart = function(alpha) {
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
              .call(d3.drag()
                .on('start', onDragStarted)
                .on('drag', onDragged)
                .on('end', onDragEnded))
              .on('mouseover', onNodeSelected)
              .on('mouseout', function() {
                fadeout(container.select('.profile-activity-network-tooltip'));
              })
              .merge(nodeSelection);
            nodeSelection.append('circle')
              .attr('r', function(d) {
                if (d.id === scope.user.id) {
                  return 25;
                } else {
                  return DEFAULT_RADIUS;
                }
              });
            nodeSelection.append('text')
              .attr('dx', 0)
              .attr('dy', function(d) {
                if (d.id === scope.user.id) {
                  return 35;
                } else {
                  return 25;
                }
              })
              // Only first names fit easily on the force diagram.
              .text(function(d) {
                return d.canvas_full_name.split(' ')[0];
              });

            svg.selectAll('.node').each(function(d) {
              if (d.id === scope.user.id) {
                showConnections.call(this);
              }
            });

            simulation.alpha(alpha).restart();
          };

          // Called when link type selection is changed.
          var restartLinks = scope.restartLinks = function() {
            restart(0.1);
          };

          // Size force diagram to window, accounting for course size and resizing as necessary.
          var activityNetworkArea = 3000 * scope.interactions.nodes.length;
          var activityNetworkWidth;
          var activityNetworkHeight;

          var sizeAndRestart = function() {
            activityNetworkWidth = controlsForm.node().getBoundingClientRect().width;
            activityNetworkHeight = Math.max((activityNetworkArea / activityNetworkWidth), 250);
            svg.attr('width', activityNetworkWidth).attr('height', activityNetworkHeight);
            simulation.force('charge', d3.forceManyBody().strength(-0.1 * Math.sqrt(activityNetworkWidth * activityNetworkHeight)));
            simulation.force('center', d3.forceCenter(activityNetworkWidth / 2, activityNetworkHeight / 2));
            restart(0.6);
          };

          window.addEventListener('resize', sizeAndRestart);

          // Highlight connected nodes and links for a given node.
          var showConnections = function() {
            var selectedNode = d3.select(this).node().__data__;
            var isNodeConnected = function(node) {
              var key1 = selectedNode.id + ',' + node.id;
              var key2 = node.id + ',' + selectedNode.id;
              return !!(linksByIds[key1] && linksByIds[key1].total) || !!(linksByIds[key2] && linksByIds[key2].total);
            };
            nodeSelection.classed('node-connected', isNodeConnected);
            nodeSelection.classed('node-unconnected', function(node) {
              return !isNodeConnected(node);
            });
            nodeSelection.style('fill', function(node) {
              if (isNodeConnected(node)) {
                return avatar(node);
              } else {
                return '#aaa';
              }
            });
            var isLinkConnected = function(link) {
              return selectedNode.id === link.source.id || selectedNode.id === link.target.id;
            };
            linkSelection.style('opacity', function(link) {
              return isLinkConnected(link) ? 1 : 0.3;
            });
            linkSelection.style('stroke-width', function(link) {
              return isLinkConnected(link) ? link.value : 1;
            });
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
                  return d.x = Math.max(activityNetworkWidth / 4, Math.min(3 * activityNetworkWidth / 4, d.x));
                } else {
                  return d.x = Math.max(DEFAULT_RADIUS + 15, Math.min(activityNetworkWidth - (DEFAULT_RADIUS + 15), d.x));
                }
              })
              .attr('cy', function(d) {
                if (d.id === scope.user.id) {
                  return d.y = Math.max(activityNetworkHeight / 4, Math.min(3 * activityNetworkHeight / 4, d.y));
                } else {
                  return d.y = Math.max(DEFAULT_RADIUS + 5, Math.min(activityNetworkHeight - (DEFAULT_RADIUS + 20), d.y));
                }
              });

            svg.selectAll('text')
              .attr('x', function(d) { return d.x; })
              .attr('y', function(d) { return d.y; });
          };

          sizeAndRestart();
        });
      }
    };
  });

}(window.angular));
