# Copyright 2015 UC Berkeley (UCB) Licensed under the
# Educational Community License, Version 2.0 (the "License"); you may
# not use this file except in compliance with the License. You may
# obtain a copy of the License at
#
#     http://opensource.org/licenses/ECL-2.0
#
# Unless required by applicable law or agreed to in writing,
# software distributed under the License is distributed on an "AS IS"
# BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
# or implied. See the License for the specific language governing
# permissions and limitations under the License.

require 'rspec'
require 'logger'
require 'csv'
require 'json'
require 'selenium-webdriver'
require 'page-object'
require_relative '../util/web_driver_utils'
require_relative '../logging'
require_relative '../pages/canvas_page'
require_relative '../pages/cal_net_page'
require_relative '../pages/asset_library_page'
require_relative '../pages/engagement_index_page'
require 'fileutils'
