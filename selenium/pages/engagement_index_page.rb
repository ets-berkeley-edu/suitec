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
    WebDriverUtils.wait_for_page_and_click search_input_element
    self.search_input = name
    wait_until(timeout=WebDriverUtils.page_update_wait) { (users_table_element[1][1].text).include? name }
  end

  # Returns the current engagement score for a user
  # @param user [Hash]                          - the user from the set of test users
  def user_score(user)
    score = String.new('')
    users_table_element.each { |row| score = row[3].text if row[1].text == user['fullName'] }
    score
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
