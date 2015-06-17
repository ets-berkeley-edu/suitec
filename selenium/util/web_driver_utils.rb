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

require_relative '../spec/spec_helper'

class WebDriverUtils

  @config = YAML.load_file File.join(ENV['HOME'], '/.collabosphere_selenium/settings.yml')

  def self.download_dir
    File.join(ENV['HOME'], @config['webdriver_download_dir'])
  end

  # Creates the download dir if it does not exist and deletes any files remaining from previous tests
  def self.prepare_download_dir
    FileUtils::mkdir_p download_dir
    FileUtils.rm_rf(download_dir, secure: true)
  end

  # Instantiates the browser and (in the case of Firefox) modifies the default handling of CSV downloads
  def self.driver
    if @config['webdriver'] == 'firefox'
      profile = Selenium::WebDriver::Firefox::Profile.new
      profile['browser.download.folderList'] = 2
      profile['browser.download.manager.showWhenStarting'] = false
      profile['browser.download.dir'] = download_dir
      profile['browser.helperApps.neverAsk.saveToDisk'] = 'text/csv'
      driver = Selenium::WebDriver.for :firefox, :profile => profile
      driver.manage.window.maximize
      driver
    elsif @config['webdriver'] == 'chrome'
      Selenium::WebDriver.for :chrome
    elsif @config['webdriver'] == 'safari'
      Selenium::WebDriver.for :safari
    else
      logger.error 'Designated WebDriver is not supported'
      nil
    end
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
  # @param spec [RSpec]                             - the spec being executed
  # @return [String]                                - return concatenated spec name and current epoch
  def self.test_course_name(spec)
    "#{spec.inspect.sub('RSpec::ExampleGroups::', '')}-#{Time.now.to_i.to_s}"
  end

  # Loads an array of test users from a file and maps them by each user's id
  # @return [Hash]                                  - return the set of test users mapped by the 'id' associated with each
  def self.load_test_users
    test_users = File.join(ENV['HOME'], '/.collabosphere_selenium/testUsers.json')
    users_array = JSON.parse(File.read(test_users))['users']
    users_array.inject({}) { |map, user| map[user['id']] = user; map }
  end

  # Waits for an element to become visible after a DOM update and then clicks the element
  # @param element [Selenium::WebDriver::Element]   - the element to be clicked
  def self.wait_for_element_and_click(element)
    element.when_visible timeout=page_update_wait
    element.click
  end

  # Waits for an element to become visible after a page load and then clicks the element
  # @param element [Selenium::WebDriver::Element]   - the element to be clicked
  def self.wait_for_page_and_click(element)
    element.when_visible timeout=page_load_wait
    element.click
  end

end
