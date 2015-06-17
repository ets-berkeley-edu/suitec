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

class CanvasPage

  include PageObject
  include Logging

  # Login messages
  h2(:updated_terms_heading, :xpath => '//h2[contains(text(),"Updated Terms of Use")]')
  checkbox(:terms_cbx, :name => 'user[terms_of_use]')
  button(:accept_course_invite, :name => 'accept')
  h2(:recent_activity_heading, :xpath => '//h2[contains(text(),"Recent Activity")]')

  # Course
  link(:add_new_course_button, :xpath => '//a[contains(.,"Add a New Course")]')
  text_area(:course_name_input, :xpath => '//label[@for="course_name"]/../following-sibling::td/input')
  text_area(:ref_code_input, :id => 'course_course_code')
  span(:create_course_button, :xpath => '//span[contains(.,"Add Course")]')
  h2(:course_site_heading, :xpath => '//div[@id="course_home_content"]/h2')
  button(:publish_course_button, :xpath => '//button[@class="ui-button btn-publish"]')
  button(:course_published_button, :xpath => '//button[@class="ui-button disabled btn-published"]')
  text_area(:search_course_input, :id => 'course_name')
  button(:search_course_button, :xpath => '//input[@id="course_name"]/following-sibling::button')
  li(:add_course_success, :xpath => '//li[contains(.,"successfully added!")]')

  # People
  link(:people_link, :text => 'People')
  link(:add_people_button, :id => 'addUsers')
  text_area(:user_list, :id => 'user_list_textarea')
  select_list(:user_role, :id => 'role_id')
  button(:next_button, :id => 'next-step')
  button(:add_button, :id => 'createUsersAddButton')
  paragraph(:add_users_success, :xpath => '//p[contains(.,"The following users have been enrolled")]')
  button(:done_button, :xpath => '//button[contains(.,"Done")]')

  # Tool config
  link(:apps_link, :text => 'Apps')
  link(:view_apps_link, :text => 'View App Configurations')
  link(:add_app_link, :text => 'Add App')
  button(:config_type, :xpath => '//button[@data-id="configuration_type_selector"]')
  link(:by_url, :text => 'By URL')
  text_area(:app_name_input, :xpath => '//input[@placeholder="Name"]')
  text_area(:key_input, :xpath => '//input[@placeholder="Consumer key"]')
  text_area(:secret_input, :xpath => '//input[@placeholder="Shared Secret"]')
  text_area(:url_input, :xpath => '//input[@placeholder="Config URL"]')
  link(:asset_library_app, :xpath => '//td[@title="Asset Library"]')
  link(:asset_library_link, :text => 'Asset Library')
  link(:engagement_index_app, :xpath => '//td[@title="Engagement Index"]')
  link(:engagement_index_link, :text => 'Engagement Index')

  button(:submit_button, :xpath => '//button[contains(.,"Submit")]')
  link(:logout_link, :text => 'Logout')

  # Loads the Canvas homepage
  def load_homepage
    logger.info 'Loading Canvas homepage'
    navigate_to "#{WebDriverUtils.base_url}"
  end

  # Accepts the Canvas messages that can intercept the user when logging into a course site
  # @param course_id [String]                 - the Canvas course id in the course site URL path
  def accept_login_messages(course_id)
    wait_until(timeout=WebDriverUtils.page_load_wait) { current_url.include? "#{course_id}" }
    if updated_terms_heading?
      logger.info 'Accepting terms and conditions'
      terms_cbx_element.when_visible timeout=WebDriverUtils.page_update_wait
      check_terms_cbx
      submit_button
    end
    recent_activity_heading_element.when_visible timeout=WebDriverUtils.page_load_wait
    if accept_course_invite?
      logger.info 'Accepting course invite'
      accept_course_invite
      accept_course_invite_element.when_not_visible timeout=WebDriverUtils.page_load_wait
    end
  end

  # Loads the Canvas sub-account used to create test course sites
  def load_sub_account
    navigate_to "#{WebDriverUtils.base_url}/accounts/#{WebDriverUtils.sub_account}"
  end

  # Loads the test course site homepage
  # @param course_id [String]                   - the Canvas course id in the course site URL path
  def load_course_site(course_id)
    navigate_to "#{WebDriverUtils.base_url}/courses/#{course_id}"
  end

  # Loads the test course site users page
  # @param course_id [String]                   - the Canvas course id in the course site URL path
  def load_users_page(course_id)
    navigate_to "#{WebDriverUtils.base_url}/courses/#{course_id}/users"
  end

  # Loads the test course site LTI tool configuration page
  # @param course_id [String]                   - the Canvas course id in the course site URL path
  def load_tools_config_page(course_id)
    navigate_to "#{WebDriverUtils.base_url}/courses/#{course_id}/settings/configurations"
  end

  # Logs out of Canvas
  def log_out
    WebDriverUtils.wait_for_element_and_click logout_link_element
  end

  # Ensures focus is not in the iframe, then clicks the sidebar link to an existing asset library
  # @param driver [Selenium::WebDriver]         - the browser
  # @return [String]                            - return the URL of the course site's asset library
  def click_asset_library_link(driver)
    driver.switch_to.default_content
    WebDriverUtils.wait_for_element_and_click asset_library_link_element
    current_url
  end

  # Ensures focus is not in the iframe, then clicks the Engagement Index link in the Canvas sidebar
  # @param driver [Selenium::WebDriver]         - the browser
  # @return [String]                            - return the URL of the course site's engagement index
  def click_engagement_index_link(driver)
    driver.switch_to.default_content
    WebDriverUtils.wait_for_element_and_click engagement_index_link_element
    current_url
  end

  # Creates a test course site using a specified string as course title and ref code
  # @param test_id [String]                     - the string used to identify a specific test run and its course site
  def create_course_site(test_id)
    logger.info "Creating a course site named #{test_id}"
    load_sub_account
    WebDriverUtils.wait_for_page_and_click add_new_course_button_element
    course_name_input_element.when_visible timeout=WebDriverUtils.page_update_wait
    self.course_name_input = "#{test_id}"
    self.ref_code_input = "#{test_id}"
    WebDriverUtils.wait_for_element_and_click create_course_button_element
    add_course_success_element.when_visible timeout=WebDriverUtils.page_load_wait
  end

  # Searches for a test course site.  Since Canvas can lag in indexing new sites, will retry the search up to 3 times.
  # @param test_id [String]                     - the string used to identify a specific test run and its course site
  def search_for_course(test_id)
    tries ||= 3
    logger.info('Searching for course site')
    load_sub_account
    search_course_input_element.when_visible timeout=WebDriverUtils.page_update_wait
    self.search_course_input = "#{test_id}"
    search_course_button
    wait_until(timeout) { course_site_heading.include? "#{test_id}" }
  rescue => e
    logger.error('Course site not found, retrying')
    retry unless (tries -= 1).zero?
  end

  # Publishes a test course site
  # @param test_id [String]                     - the string used to identify a specific test run and its course site
  # @return [String]                            - return the Canvas course id extracted from the course site URL
  def publish_course(test_id)
    logger.info 'Publishing the course'
    search_for_course test_id
    WebDriverUtils.wait_for_element_and_click publish_course_button_element
    course_published_button_element.when_visible timeout=WebDriverUtils.page_load_wait
    current_url.sub("#{WebDriverUtils.base_url}/courses/", '')
  end

  # Adds to a course site all the test users in a hash where the user 'role' matches the user_role param
  # @param course_id [String]                   - the Canvas course id in the course site URL path
  # @param test_users [Hash]                    - the set of test users from which to draw
  # @param user_role [String]                   - the type of users to add to the course site (e.g., 'Teacher', 'Student')
  def add_users(course_id, test_users, user_role)
    logger.info "Adding users with role #{user_role}"
    load_users_page course_id
    WebDriverUtils.wait_for_page_and_click add_people_button_element.when_visible
    user_list_element.when_visible timeout=WebDriverUtils.page_update_wait
    users = ''
    test_users.each do |id, user|
      if user['role'] == user_role
        users << "#{user['uid'].to_s}, "
      end
    end
    self.user_list = users
    self.user_role = user_role
    next_button
    WebDriverUtils.wait_for_page_and_click add_button_element
    add_users_success_element.when_visible timeout=WebDriverUtils.page_load_wait
    done_button
  end

  # Loads the UI for adding a new LTI tool
  # @param course_id [String]                   - the Canvas course id in the course site URL path
  def load_add_new_tool_config(course_id)
    load_tools_config_page course_id
    WebDriverUtils.wait_for_page_and_click apps_link_element
    WebDriverUtils.wait_for_element_and_click add_app_link_element
    WebDriverUtils.wait_for_element_and_click config_type_element
    WebDriverUtils.wait_for_element_and_click by_url_element
    url_input_element.when_visible timeout=WebDriverUtils.page_update_wait
  end

  # Adds the asset library to a test course site
  # @param course_id [String]                   - the Canvas course id in the course site URL path
  def add_asset_library(course_id)
    logger.info 'Adding asset library'
    load_add_new_tool_config course_id
    self.app_name_input = 'Asset Library'
    self.key_input = WebDriverUtils.lti_key
    self.secret_input = WebDriverUtils.lti_secret
    self.url_input = WebDriverUtils.asset_library_url
    submit_button
    asset_library_app_element.when_visible timeout=WebDriverUtils.page_load_wait
  end

  # Adds the engagement index to a test course site
  # @param course_id [String]                   - the Canvas course id in the course site URL path
  def add_engagement_index(course_id)
    logger.info 'Adding engagement index'
    load_add_new_tool_config course_id
    self.app_name_input = 'Engagement Index'
    self.key_input = WebDriverUtils.lti_key
    self.secret_input = WebDriverUtils.lti_secret
    self.url_input = WebDriverUtils.engagement_index_url
    submit_button
    engagement_index_app_element.when_visible timeout=WebDriverUtils.page_load_wait
  end

  # Creates a test course site with the complete set of test users and Collabosphere tools
  # @param test_id [String]                     - the string used to identify a specific test run and its course site
  # @param test_users [Hash]                    - the set of test users from which to draw
  # @return [String]                            - return the Canvas course id extracted from the course site URL
  def create_complete_test_course(test_id, test_users)
    create_course_site test_id
    course_id = publish_course test_id
    logger.info "Course ID is #{course_id}"
    add_users(course_id, test_users, 'Teacher')
    add_users(course_id, test_users, 'Designer')
    add_users(course_id, test_users, 'Student')
    add_asset_library course_id
    add_engagement_index course_id
    course_id
  end

end
