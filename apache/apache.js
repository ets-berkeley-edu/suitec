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

var _ = require('lodash');
var config = require('config');
var fs = require('fs');

// Read the Apache config template
fs.readFile(__dirname + '/collabosphere.template', 'utf8', function (err,template) {
  if (err) {
    console.log('An error occurred when reading the Apache config template');
  }

  // Generate the Apache config file
  var templateData = {
    'documentRoot': config.get('apache.documentRoot'),
    'logDirectory': config.get('apache.logDirectory'),
    'port': config.get('app.port')
  };

  var templateOutput = _.template(template)(templateData);

  // Store the generate output
  fs.writeFile(__dirname + '/collabosphere.conf', templateOutput, function (err) {
    if (err) {
      console.log('An error occurred when writing the generated Apache config file');
    }

    console.log('Successfully generated the Apache config file');
  });
});
