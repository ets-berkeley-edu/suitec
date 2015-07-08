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

class EngagementIndexPage

  include PageObject
  include Logging

  text_area(:search_input, :class => 'leaderboard-list-search')
  link(:download_csv_link, :text => 'Download CSV')
  table(:users_table, :class => 'leaderboard-list-table')

  # Loads the engagement index and puts browser focus in the iframe containing the tool
  # @param driver [Selenium::WebDriver]         - the browser
  # @param url [String]                         - the engagement index URL specific to the test course site
  def load_page(driver, url)
    navigate_to url
    wait_until(timeout=WebDriverUtils.page_load_wait) { self.title == 'Engagement Index' }
    wait_until(timeout) { driver.find_element(:id, 'tool_content') }
    driver.switch_to.frame driver.find_element(:id, 'tool_content')
  end

  # Searches for a user by name and waits until the user's name appears in the first row
  # @param user [Hash]                          - the user from the set of test users
  def search_for_user(user)
    name = user['fullName']
    logger.info "Searching engagement index for #{name}"
    WebDriverUtils.wait_for_page_and_click search_input_element
    self.search_input = name
    wait_until(timeout=WebDriverUtils.page_update_wait) { (users_table_element[1][1].text).include? name }
  end

  # Returns the current engagement score for a user
  # @param user [Hash]                          - the user from the set of test users
  # @return [String]                            - the score displayed on the engagement index table
  def user_score(user)
    score = String.new('')
    users_table_element.each { |row| score = row[3].text if row[1].text == user['fullName'] }
    score
  end

  # Makes a configurable number of attempts to match a user's displayed score to the expected score.
  # Returns true if the test user's score matches the expected score.
  # @param driver [Selenium::WebDriver]         - the browser
  # @param url [String]                         - the engagement index URL specific to the test course site
  # @param user [Hash]                          - the user from the set of test users
  # @param expected_score [String]              - the score expected to be displayed for the user
  def user_score_updated?(driver, url, user, expected_score)
    tries ||= WebDriverUtils.canvas_sync_attempts
    logger.info("Checking if #{user['fullName']} has an updated score")
    load_page(driver, url)
    wait_until(timeout=WebDriverUtils.page_update_wait) { users_table? }
    wait_until(timeout) { user_score(user) == expected_score }
    logger.info 'Score updated'
  rescue => e
    logger.warn('Score not yet updated, retrying')
    retry unless (tries -= 1).zero?
  end

  # Creates and/or cleans out the download dir, downloads the current CSV, and collects score information from its rows
  # @param driver [Selenium::WebDriver]         - the browser
  # @param url [String]                         - the engagement index URL specific to the test course site
  # @return [Array]                             - the collection of activities contained in the CSV
  def download_csv(driver, url)
    WebDriverUtils.prepare_download_dir
    csv_file_path = "#{WebDriverUtils.download_dir}/activities.csv"
    csv = File.join(csv_file_path)
    load_page(driver, url)
    WebDriverUtils.wait_for_page_and_click download_csv_link_element
    wait_until(timeout=WebDriverUtils.page_load_wait) { File.file? csv }
    activities = []
    # TODO: add the running total to the activity info being collected by the tests
    CSV.foreach(csv_file_path, {:headers => true}) do |column|
      # user_name, action, score
      activities << "#{column[1]}, #{column[2]}, #{column[4]}"
    end
    activities
  end

end
