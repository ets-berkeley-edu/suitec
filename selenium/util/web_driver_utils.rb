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

require 'selenium-webdriver'
require 'page-object'
require 'json'

class WebDriverUtils

  @config = YAML.load_file File.join(ENV['HOME'], '/.collabosphere_selenium/settings.yml')

  def self.driver
    Selenium::WebDriver.for @config['webdriver'].to_sym
  end

  def self.base_url
    @config['base_url']
  end

  def self.sub_account
    @config['sub_account']
  end

  def self.page_load_wait
    @config['page_load_timeout']
  end

  def self.page_update_wait
    @config['ajax_timeout']
  end

  def self.admin_username
    @config['admin_username']
  end

  def self.admin_password
    @config['admin_password']
  end

  def self.test_user_password
    @config['test_user_password']
  end

  def self.lti_key
    @config['lti_key']
  end

  def self.lti_secret
    @config['lti_secret']
  end

  def self.asset_library_url
    @config['lti_asset_library_url']
  end

  def self.engagement_index_url
    @config['lti_engagement_index_url']
  end

  # Generates a unique name for a test course site by combining the test name and the epoch
  # @param spec [RSpec]
  def self.test_course_name(spec)
    "#{spec.inspect.sub('RSpec::ExampleGroups::', '')}-#{Time.now.to_i.to_s}"
  end

  # Loads an array of test users from a file and maps them by each user's id
  def self.load_test_users
    test_users = File.join(ENV['HOME'], '/.collabosphere_selenium/testUsers.json')
    users_array = JSON.parse(File.read(test_users))['users']
    users_array.inject({}) { |map, user| map[user['id']] = user; map }
  end

  # Waits for an element to become visible after a DOM update and then clicks the element
  # @param element [Selenium::WebDriver::Element]
  def self.wait_for_element_and_click(element)
    element.when_visible timeout=page_update_wait
    element.click
  end

  # Waits for an element to become visible after a page load and then clicks the element
  # @param element [Selenium::WebDriver::Element]
  def self.wait_for_page_and_click(element)
    element.when_visible timeout=page_load_wait
    element.click
  end

end
