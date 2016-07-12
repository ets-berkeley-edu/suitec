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

class EngagementIndexPage

  include PageObject
  include Logging

  text_area(:search_input, :class => 'leaderboard-list-search')
  link(:download_csv_link, :text => 'Download CSV')
  table(:users_table, :xpath => '//div[@class="leaderboard-list-container ng-scope"]/table')

  # Loads the engagement index, puts browser focus in the iframe containing the tool, and waits for the user table to appear
  # @param driver [Selenium::WebDriver]         - the browser
  # @param url [String]                         - the engagement index URL specific to the test course site
  def load_page(driver, url)
    navigate_to url
    wait_until(timeout=WebDriverUtils.page_load_wait) { self.title == 'Engagement Index' }
    wait_until(timeout) { driver.find_element(:id, 'tool_content') }
    driver.switch_to.frame driver.find_element(:id, 'tool_content')
    users_table_element.when_visible(timeout=WebDriverUtils.page_update_wait)
  end

  # Searches for a user by name
  # @param user [Hash]                          - the user from the set of test users
  def search_for_user(user)
    name = user['fullName']
    logger.info "Searching engagement index for #{name}"
    WebDriverUtils.wait_for_page_and_click search_input_element
    self.search_input = name
  end

  # Returns the current engagement score for a user when viewed by an admin user
  # @param user [Hash]                          - the user from the set of test users
  # @return [String]                            - the score displayed on the engagement index table
  def user_score(user)
    score = ''
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
    wait_until(timeout=WebDriverUtils.page_update_wait) { user_score(user) == expected_score }
    logger.info "Score updated to #{expected_score}"
    true
  rescue
    logger.warn('Score not yet updated, retrying')
    retry unless (tries -= 1).zero?
    false
  end

  # Creates and/or cleans out the download dir, downloads the current CSV, and collects score information from its rows
  # @param driver [Selenium::WebDriver]         - the browser
  # @param course_id [String]                   - the Canvas id of the test course site
  # @param url [String]                         - the engagement index URL specific to the test course site
  # @return [Array]                             - the collection of activities contained in the CSV
  def download_csv(driver, course_id, url)
    logger.info 'Downloading activities CSV'
    WebDriverUtils.prepare_download_dir
    load_page(driver, url)
    WebDriverUtils.wait_for_page_and_click download_csv_link_element
    date = Time.now.strftime("%Y_%m_%d")
    # Hour and minute in the file name are globbed to avoid test failures due to clock sync issues
    csv_file_path = "#{WebDriverUtils.download_dir}/engagement_index_activities_#{course_id}_#{date}_*.csv"
    wait_until(timeout=WebDriverUtils.page_load_wait) { Dir[csv_file_path].any? }
    csv = Dir[csv_file_path].first
    activities = []
    CSV.foreach(csv, {:headers => true}) do |column|
      # user_name, action, score, running_total
      activities << "#{column[1]}, #{column[2]}, #{column[4]}, #{column[5]}"
    end
    activities
  end

end
