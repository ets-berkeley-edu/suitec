# Copyright ©2016. The Regents of the University of California (Regents). All Rights Reserved.
#
# Permission to use, copy, modify, and distribute this software and its documentation
# for educational, research, and not-for-profit purposes, without fee and without a
# signed licensing agreement, is hereby granted, provided that the above copyright
# notice, this paragraph and the following two paragraphs appear in all copies,
# modifications, and distributions.
#
# Contact The Office of Technology Licensing, UC Berkeley, 2150 Shattuck Avenue,
# Suite 510, Berkeley, CA 94720-1620, (510) 643-7201, otl@berkeley.edu,
# http://ipira.berkeley.edu/industry-info for commercial licensing opportunities.
#
# IN NO EVENT SHALL REGENTS BE LIABLE TO ANY PARTY FOR DIRECT, INDIRECT, SPECIAL,
# INCIDENTAL, OR CONSEQUENTIAL DAMAGES, INCLUDING LOST PROFITS, ARISING OUT OF
# THE USE OF THIS SOFTWARE AND ITS DOCUMENTATION, EVEN IF REGENTS HAS BEEN ADVISED
# OF THE POSSIBILITY OF SUCH DAMAGE.
#
# REGENTS SPECIFICALLY DISCLAIMS ANY WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
# IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE. THE
# SOFTWARE AND ACCOMPANYING DOCUMENTATION, IF ANY, PROVIDED HEREUNDER IS PROVIDED
# "AS IS". REGENTS HAS NO OBLIGATION TO PROVIDE MAINTENANCE, SUPPORT, UPDATES,
# ENHANCEMENTS, OR MODIFICATIONS.

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

  def self.collabosphere_base_url
    @config['collabosphere_base_url']
  end

  def self.canvas_base_url
    @config['canvas_base_url']
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

  def self.file_upload_wait
    @config['file_upload_timeout']
  end

  def self.canvas_sync_attempts
    @config['canvas_sync_attempts']
  end

  def self.super_admin_username
    @config['super_admin_username']
  end

  def self.super_admin_password
    @config['super_admin_password']
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

  def self.test_data_file_path(filename)
    File.join(ENV['HOME'], "/test-data/#{filename}")
  end

  # Parses an array of test users from a JSON file
  # @return [Array]                                 - the set of test users
  def self.load_test_users
    test_users = File.join(ENV['HOME'], '/.collabosphere_selenium/testUsers.json')
    JSON.parse(File.read(test_users))['users']
  end

  #
  # @return [Array]                                 - return the set of test users mapped by the 'id' associated with each
  def self.mapped_test_users
    load_test_users.inject({}) { |map, user| map[user['id']] = user; map }
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

  # Waits for an element to be present dynamically on a page then enters text in the element
  # @param element [Selenium::WebDriver::Element]   - the element
  # @param text [String]                            - the text to enter in the element
  def self.wait_for_element_and_type(element, text)
    element.when_present(timeout=page_update_wait)
    element.click
    element.clear
    element.send_keys text
  end

  # Waits for a select element to be visible on a page then selects an option
  # @param element [Selenium::WebDriver::Element]   - the select element
  # @param option [String]                          - the option to be selected
  def self.wait_for_element_and_select(driver, element, option)
    element.when_visible(timeout=page_update_wait)
    wait = Selenium::WebDriver::Wait.new(:timeout => WebDriverUtils.page_update_wait)
    wait.until { element.include? option }
    element.select option
  end

  # Checks for the existence of an element on the page
  # @param driver [Selenium::WebDriver]             - the browser
  # @param element_xpath [String]                   - the element's xpath
  def self.element_present?(driver, element_xpath)
    driver.find_element(:xpath => element_xpath)
    true
  rescue Selenium::WebDriver::Error::NoSuchElementError
    false
  end

  # Clicks a link, verifies that the destination page loads in a new window, verifies the page title matches expectations,
  # and then closes the new window and returns focus to the original window
  # @param driver [Selenium::WebDriver]             - the browser driver
  # @param link [Selenium::WebDriver::Element]      - the link element to be clicked
  # @param expected_page_title [String]             - the expected title of the page that should load
  def self.verify_external_link(driver, link, expected_page_title)
    begin
      link.click
      if driver.window_handles.length > 1
        driver.switch_to.window driver.window_handles.last
        wait = Selenium::WebDriver::Wait.new(:timeout => WebDriverUtils.page_load_timeout)
        wait.until { driver.find_element(:xpath => "//title[contains(.,'#{expected_page_title}')]") }
        true
      else
        logger.error('Link did not open in a new window')
        false
      end
    rescue
      false
    ensure
      if driver.window_handles.length > 1
        # Handle any alert that might appear when opening the new window
        driver.switch_to.alert.accept rescue Selenium::WebDriver::Error::NoAlertPresentError
        driver.close
        # Handle any alert that might appear when closing the new window
        driver.switch_to.alert.accept rescue Selenium::WebDriver::Error::NoAlertPresentError
      end
      driver.switch_to.window driver.window_handles.first
    end
  end

end
