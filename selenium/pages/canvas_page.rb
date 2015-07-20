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
  link(:masquerade_link, :class => 'masquerade_button')
  link(:stop_masquerading_link, :class => 'stop_masquerading')
  h2(:recent_activity_heading, :xpath => '//h2[contains(text(),"Recent Activity")]')

  # Course
  link(:add_new_course_button, :xpath => '//a[contains(.,"Add a New Course")]')
  text_area(:course_name_input, :xpath => '//label[@for="course_name"]/../following-sibling::td/input')
  text_area(:ref_code_input, :id => 'course_course_code')
  span(:create_course_button, :xpath => '//span[contains(.,"Add Course")]')
  h2(:course_site_heading, :xpath => '//div[@id="course_home_content"]/h2')
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

  # Discussions
  link(:new_discussion_link, :id => 'new-discussion-btn')
  text_area(:discussion_title, :id => 'discussion-title')
  checkbox(:threaded_discussion_cbx, :id => 'threaded')
  checkbox(:graded_discussion_cbx, :id => 'use_for_grading')
  elements(:discussion_reply, :list_item, :xpath => '//ul[@class="discussion-entries"]/li')
  link(:primary_reply_link, :xpath => '//article[@id="discussion_topic"]//a[@data-event="addReply"]')
  link(:primary_html_editor_link, :xpath => '//article[@id="discussion_topic"]//a[contains(.,"HTML Editor")]')
  text_area(:primary_reply_input, :xpath => '//article[@id="discussion_topic"]//textarea[@class="reply-textarea"]')
  button(:primary_post_reply_button, :xpath => '//article[@id="discussion_topic"]//button[contains(.,"Post Reply")]')
  elements(:secondary_reply_link, :link, :xpath => '//li[@class="entry"]//a[@data-event="addReply"]')
  elements(:secondary_html_editor_link, :link, :xpath => '//li[@class="entry"]//a[contains(.,"HTML Editor")]')
  elements(:secondary_reply_input, :text_area, :xpath => '//li[@class="entry"]//textarea[@class="reply-textarea"]')
  elements(:secondary_post_reply_button, :button, :xpath => '//li[@class="entry"]//button[contains(.,"Post Reply")]')

  # Assignments
  link(:new_assignment_link, :text => 'Assignment')
  select_list(:assignment_type, :id => 'assignment_submission_type')
  text_area(:assignment_name, :id => 'assignment_name')
  checkbox(:online_url_cbx, :id => 'assignment_online_url')
  checkbox(:online_upload_cbx, :id => 'assignment_online_upload')
  h1(:assignment_title_heading, :class => 'title')
  link(:submit_assignment_link, :text => 'Submit Assignment')
  link(:assignment_file_upload_tab, :class => 'submit_online_upload_option')
  text_area(:file_upload_input, :name => 'attachments[0][uploaded_data]')
  button(:file_upload_submit_button, :id => 'submit_file_button')
  link(:assignment_site_url_tab, :class => 'submit_online_url_option')
  text_area(:url_upload_input, :id => 'submission_url')
  button(:url_upload_submit_button, :xpath => '(//button[@type="submit"])[2]')
  div(:assignment_submission_conf, :xpath => '//div[contains(.,"Turned In!")]')

  button(:publish_button, :class => 'btn-publish')
  button(:save_and_publish_button, :class => 'save_and_publish')
  button(:published_button, :class => 'btn-published')
  button(:submit_button, :xpath => '//button[contains(.,"Submit")]')
  link(:logout_link, :text => 'Logout')

  # Loads the Canvas homepage
  def load_homepage
    logger.info 'Loading Canvas homepage'
    navigate_to "#{WebDriverUtils.canvas_base_url}"
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

  # Logs out of Canvas
  # @param driver [Selenium::WebDriver]         - the browser
  def log_out(driver)
    driver.switch_to.default_content
    WebDriverUtils.wait_for_element_and_click logout_link_element
  end

  # Masquerades as a Canvas user, provided the logged in user has masquerade rights
  # @param test_user [Hash]                     - the test user to be impersonated
  # @param course_id [String]                   - the Canvas course id in the course site URL path
  def masquerade_as(test_user, course_id)
    logger.info "Masquerading as #{test_user['username']}"
    navigate_to "#{WebDriverUtils.canvas_base_url}/users/#{test_user['canvasId'].to_s}/masquerade"
    WebDriverUtils.wait_for_page_and_click masquerade_link_element
    stop_masquerading_link_element.when_visible timeout=WebDriverUtils.page_load_wait
    load_course_site course_id
  end

  # Stops masquerading as another user
  def stop_masquerading
    WebDriverUtils.wait_for_page_and_click stop_masquerading_link_element
    stop_masquerading_link_element.when_not_visible timeout=WebDriverUtils.page_load_wait
  end

  # COURSE SITE SETUP

  # Loads the Canvas sub-account used to create test course sites
  def load_sub_account
    navigate_to "#{WebDriverUtils.canvas_base_url}/accounts/#{WebDriverUtils.sub_account}"
  end

  # Loads the test course site homepage and accepts login messages
  # @param course_id [String]                   - the Canvas course id in the course site URL path
  def load_course_site(course_id)
    navigate_to "#{WebDriverUtils.canvas_base_url}/courses/#{course_id}"
    accept_login_messages course_id
  end

  # Loads the test course site users page
  # @param course_id [String]                   - the Canvas course id in the course site URL path
  def load_users_page(course_id)
    navigate_to "#{WebDriverUtils.canvas_base_url}/courses/#{course_id}/users"
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

  # Searches for a test course site up to 3 times, since Canvas can lag in indexing new sites.
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
    WebDriverUtils.wait_for_element_and_click publish_button_element
    published_button_element.when_visible timeout=WebDriverUtils.page_load_wait
    logger.info "Course site URL is #{current_url}"
    current_url.sub("#{WebDriverUtils.canvas_base_url}/courses/", '')
  end

  # Adds to a course site all the test users in a hash where the user 'role' matches the user_role param
  # @param course_id [String]                   - the Canvas course id in the course site URL path
  # @param test_users [Hash]                    - the set of test users from which to draw
  # @param user_role [String]                   - the type of users to add to the course site (e.g., 'Teacher', 'Student')
  def add_users(course_id, test_users, user_role)
    users = ''
    test_users.each do |id, user|
      if user['role'] == user_role
        users << "#{user['uid'].to_s}, "
      end
    end
    if users.empty?
      logger.warn "No test users with role #{user_role}"
    else
      logger.info "Adding users with role #{user_role}"
      load_users_page course_id
      WebDriverUtils.wait_for_page_and_click add_people_button_element.when_visible
      user_list_element.when_visible timeout=WebDriverUtils.page_update_wait
      self.user_list = users
      self.user_role = user_role
      next_button
      WebDriverUtils.wait_for_page_and_click add_button_element
      add_users_success_element.when_visible timeout=WebDriverUtils.page_load_wait
      done_button
    end
  end

  # LTI TOOLS

  # Loads the test course site LTI tool configuration page
  # @param course_id [String]                   - the Canvas course id in the course site URL path
  def load_tools_config_page(course_id)
    navigate_to "#{WebDriverUtils.canvas_base_url}/courses/#{course_id}/settings/configurations"
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

  # Ensures focus is not in the iframe, then clicks the sidebar link to an existing asset library
  # @param driver [Selenium::WebDriver]         - the browser
  # @return [String]                            - return the URL of the course site's asset library
  def click_asset_library_link(driver)
    driver.switch_to.default_content
    WebDriverUtils.wait_for_element_and_click asset_library_link_element
    logger.info "Asset Library URL is #{current_url}"
    current_url
  end

  # Ensures focus is not in the iframe, then clicks the Engagement Index link in the Canvas sidebar
  # @param driver [Selenium::WebDriver]         - the browser
  # @return [String]                            - return the URL of the course site's engagement index
  def click_engagement_index_link(driver)
    driver.switch_to.default_content
    WebDriverUtils.wait_for_element_and_click engagement_index_link_element
    logger.info "Engagement Index URL is #{current_url}"
    current_url
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
    load_course_site course_id
    course_id
  end

  # DISCUSSIONS

  # Creates and publishes a discussion and returns the discussion's URL
  # @param course_id [String]                   - the Canvas course id
  # @param discussion_name [String]             - the title of the discussion
  # @return [String]                            - the URL of the discussion
  def create_discussion(course_id, discussion_name)
    logger.info "Creating discussion topic named '#{discussion_name}'"
    navigate_to "#{WebDriverUtils.canvas_base_url}/courses/#{course_id}/discussion_topics"
    WebDriverUtils.wait_for_page_and_click new_discussion_link_element
    WebDriverUtils.wait_for_element_and_type(discussion_title_element, discussion_name)
    check_threaded_discussion_cbx
    WebDriverUtils.wait_for_element_and_click save_and_publish_button_element
    published_button_element.when_visible timeout=WebDriverUtils.page_load_wait
    logger.info "Discussion URL is #{current_url}"
    current_url
  end

  # Adds a reply to a discussion. If index_position is nil, then adds a reply to the topic; else adds a reply to an existing
  # reply at the index position in the collection of replies
  # @param discussion_url [String]              - the URL of the discussion assignment
  # @param index_position [Integer]             - the position of the existing reply in the array of replies
  # @param reply_body [String]                  - the text of the reply
  def add_reply(discussion_url, index_position, reply_body)
    navigate_to discussion_url
    if index_position.nil?
      logger.info 'Replying to discussion topic'
      WebDriverUtils.wait_for_page_and_click primary_reply_link_element
      primary_html_editor_link if primary_html_editor_link_element.visible?
      WebDriverUtils.wait_for_element_and_type(primary_reply_input_element, reply_body)
      replies = discussion_reply_elements.length
      primary_post_reply_button
    else
      logger.info 'Replying to reply'
      wait_until(timeout=WebDriverUtils.page_load_wait) { secondary_reply_link_elements.any? }
      WebDriverUtils.wait_for_page_and_click secondary_reply_link_elements[index_position]
      secondary_html_editor_link_elements[index_position].click if secondary_html_editor_link_elements[index_position].visible?
      wait_until(timeout=WebDriverUtils.page_update_wait) { secondary_reply_input_elements.any? }
      WebDriverUtils.wait_for_element_and_type(secondary_reply_input_elements[index_position], reply_body)
      replies = discussion_reply_elements.length
      secondary_post_reply_button_elements[index_position].click
    end
    wait_until(timeout=WebDriverUtils.page_update_wait) { discussion_reply_elements.length == replies + 1 }
  end

  # SUBMISSION ASSIGNMENTS

  # Creates and publishes a new online submission assignment and returns the assignment's URL
  # @param course_id [String]                   - the Canvas course id
  # @param assignment_name [String]             - the name of the assignment
  # @return [String]                            - the URL of the submission assignment
  def create_assignment(course_id, assignment_name)
    logger.info "Creating submission assignment named '#{assignment_name}'"
    navigate_to "#{WebDriverUtils.canvas_base_url}/courses/#{course_id}/assignments"
    WebDriverUtils.wait_for_page_and_click new_assignment_link_element
    WebDriverUtils.wait_for_element_and_type(assignment_name_element, assignment_name)
    assignment_type_element.when_visible timeout=WebDriverUtils.page_load_wait
    self.assignment_type = 'Online'
    online_url_cbx_element.when_visible timeout=WebDriverUtils.page_update_wait
    check_online_url_cbx
    check_online_upload_cbx
    WebDriverUtils.wait_for_element_and_click save_and_publish_button_element
    published_button_element.when_visible timeout=WebDriverUtils.page_load_wait
    logger.info "Submission assignment URL is #{current_url}"
    current_url
  end

  # Submits a file or URL for an assignment, depending what test data is specified for the test user
  # @param assignment_url [String]              - the URL of the submission assignment
  # @param user [Hash]                          - the test user submitting the assignment
  def submit_assignment(assignment_url, user)
    logger.info "Submitting #{user['testData']} for #{user['username']}"
    navigate_to assignment_url
    WebDriverUtils.wait_for_page_and_click submit_assignment_link_element
    case user['submissionType']
      when 'File'
        file_upload_input_element.when_visible(timeout=WebDriverUtils.page_update_wait)
        self.file_upload_input_element.send_keys WebDriverUtils.test_data_file_path(user['testData'])
        WebDriverUtils.wait_for_element_and_click file_upload_submit_button_element
      when 'Link'
        WebDriverUtils.wait_for_page_and_click assignment_site_url_tab_element
        url_upload_input_element.when_visible(timeout=WebDriverUtils.page_update_wait)
        self.url_upload_input = user['testData']
        WebDriverUtils.wait_for_element_and_click url_upload_submit_button_element
      else
        logger.error 'Unsupported submission type in test data'
    end
    assignment_submission_conf_element.when_visible timeout=WebDriverUtils.file_upload_wait
  end

end
