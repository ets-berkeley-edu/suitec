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

class AssetLibraryPage

  include PageObject
  include Logging

  # SEARCH
  text_area(:search_input, :id => 'assetlibrary-search')
  button(:advanced_search_button, :xpath => '//button[@title="Advanced search"]')
  button(:search_button, :xpath => '//button[@title="Search"]')

  # ADD SITE
  link(:add_site_link, :xpath => '//a[contains(.,"Add Site")]')
  h2(:add_url_heading, :xpath => '//h2[text()="Add a URL"]')
  text_area(:url_input, :id => 'assetlibrary-addlink-url')
  text_area(:url_title_input, :id => 'assetlibrary-addlink-title')
  select_list(:url_category, :id => 'assetlibrary-addlink-category')
  text_area(:url_description, :id => 'assetlibrary-addlink-description')
  link(:cancel_url_link, :text => 'Cancel')
  button(:add_url_button, :xpath => '//button[text()="Add URL"]')
  div(:missing_url_error, :xpath => '//div[text()="Please enter a URL"]')
  div(:missing_url_title_error, :xpath => '//div[text()="Please enter a title"]')
  div(:bad_url_error, :xpath => '//div[text()="Please enter a valid URL"]')

  # MANAGE CATEGORIES
  link(:manage_categories_link, :xpath => '//a[contains(.,"Manage categories")]')
  h2(:manage_categories_heading, :xpath => '//h2[text()="Manage Categories"]')
  text_area(:category_input, :id => 'assetlibrary-categories-create')
  button(:add_category_button, :xpath => '//button[text()="Add"]')
  elements(:category_title, :span, :xpath => '//span[@data-ng-bind="category.title"]')
  elements(:edit_category_button, :button, :xpath => '//button[@title="Edit this category"]')
  elements(:delete_category_button, :button, :xpath => '//button[@title="Delete this category"]')

  # ASSETS
  elements(:list_view_asset, :list_item, :xpath => '//li[@data-ng-repeat="asset in assets"]')
  elements(:list_view_asset_link, :link, :xpath => '//li[@data-ng-repeat="asset in assets"]//a')
  elements(:list_view_asset_title, :h3, :xpath => '//li[@data-ng-repeat="asset in assets"]//h3')
  elements(:list_view_asset_owner_name, :element, :xpath => '//li[@data-ng-repeat="asset in assets"]//small')
  elements(:list_view_asset_like_button, :button, :xpath => '//button[@data-ng-click="like(asset)"]')
  elements(:list_view_asset_likes_count, :span, :xpath => '//span[@data-ng-bind="asset.likes | number"]')
  elements(:list_view_asset_comments_count, :span, :xpath => '//span[@data-ng-bind="asset.comment_count | number"]')
  h2(:detail_view_asset_title, :xpath => '//h2')

  # COMMENTS
  span(:asset_detail_comment_count, :xpath => '//div[@class="assetlibrary-item-metadata"]//span[@data-ng-bind="asset.comment_count | number"]')
  text_area(:comment_input, :id => 'assetlibrary-item-newcomment-body')
  button(:comment_add_button, :xpath => '//span[text()="Comment"]/..')
  elements(:comment, :div, :class => 'assetlibrary-item-comment')

  link(:back_to_library_link, :text => 'Back to Asset Library')

  # Loads the asset library and puts browser focus in the iframe containing the tool
  # @param driver [Selenium::WebDriver]         - the browser
  # @param url [String]                         - the asset library URL specific to the test course site
  def load_page(driver, url)
    navigate_to url
    wait_until(timeout=WebDriverUtils.page_load_wait) { self.title == 'Asset Library' }
    wait_until(timeout=WebDriverUtils.page_load_wait) { driver.find_element(:id, 'tool_content') }
    driver.switch_to.frame driver.find_element(:id, 'tool_content')
  end

  # Obtains the asset id from the first asset in the list of assets
  # @return [String]                            - the ID of the asset
  def get_first_asset_id
    wait_until(timeout=WebDriverUtils.page_load_wait) { list_view_asset_link_elements.any? }
    list_view_asset_link_elements[0].attribute('href').sub("#{WebDriverUtils.collabosphere_base_url}/assetlibrary/", '')
  end

  # Waits for an asset with a specified id to become visible in the list view
  # @param driver [Selenium::WebDriver]         - the browser
  # @param asset_id [String]                    - the id of the asset that should appear in the list view
  def wait_for_asset_in_list_view(driver, asset_id)
    wait_until(timeout=WebDriverUtils.page_load_wait) { driver.find_element(:xpath, "//li[@data-ng-repeat='asset in assets']//a[contains(@href,'#{asset_id}')]") }
  end

  # Combines the methods for loading the asset library and waiting for an asset with a specific title to appear
  # @param driver [Selenium::WebDriver]         - the browser
  # @param url [String]                         - the asset library URL specific to the test course site
  # @param asset_id [String]                    - the id of the asset that should appear in the list view
  def load_list_view_asset(driver, url, asset_id)
    load_page(driver, url)
    wait_for_asset_in_list_view(driver, asset_id)
  end

  # Waits for and then clicks the asset library item with a given asset id
  # @param asset_id [String]                    - the id of the asset
  def click_asset_link(asset_id)
    logger.info 'Clicking list view thumbnail'
    wait_until(timeout=WebDriverUtils.page_load_wait) { list_view_asset_link_elements.any? }
    asset_link = list_view_asset_link_elements.find { |link| link.attribute('href').include?("#{asset_id}") }
    asset_link.click
  end

  # Waits for an asset with a specified title to become visible in the detail view
  # @param asset_title [String]                 - the title of the asset that should appear in the detail view
  def wait_for_asset_detail(asset_title)
    wait_until(timeout=WebDriverUtils.page_update_wait) { detail_view_asset_title == "#{asset_title}" }
  end

  # Combines methods to load the asset library, click an asset, and wait for the asset detail to load
  # @param driver [Selenium::WebDriver]         - the browser
  # @param url [String]                         - the asset library URL specific to the test course site
  # @param asset_title [String]                 - the title of the asset that should appear in the list view
  # @param asset_id [String]                    - the id of the asset
  def load_asset_detail(driver, url, asset_title, asset_id)
    load_list_view_asset(driver, url, asset_id)
    click_asset_link asset_id
    wait_for_asset_detail asset_title
  end

  # ADD SITE

  # Waits for and then clicks the link to add a new URL asset
  def click_add_site_link
    logger.info 'Clicking Add Site link'
    WebDriverUtils.wait_for_page_and_click add_site_link_element
    add_url_heading_element.when_visible timeout=WebDriverUtils.page_update_wait
  end

  # Enters the metadata associated with a new URL asset
  # @param url [String]                         - the URL of the asset
  # @param title [String]                       - the title of the asset
  # @param category [String]                    - the title of the category
  # @param description [String]                 - the description of the asset
  def enter_url_metadata(url, title, category, description)
    logger.info 'Entering URL details'
    WebDriverUtils.wait_for_element_and_click url_input_element
    self.url_input = url
    self.url_title_input = title
    unless category.nil?
      self.url_category = category
    end
    self.url_description = description
  end

  # Waits for and then clicks the Add button for a new URL asset
  def click_add_url_button
    logger.info 'Confirming new URL'
    WebDriverUtils.wait_for_element_and_click add_url_button_element
  end

  # Waits for and then clicks the Cancel link for a new URL asset
  def click_cancel_url_button
    logger.info 'Canceling new URL'
    WebDriverUtils.wait_for_element_and_click cancel_url_link_element
  end

  # MANAGE CATEGORIES

  # Waits for and then clicks the Manage Categories link
  def click_manage_categories_link
    logger.info 'Clicking Manage Categories link'
    WebDriverUtils.wait_for_page_and_click manage_categories_link_element
    manage_categories_heading_element.when_visible WebDriverUtils.page_update_wait
  end

  # Enters the title of a new category and clicks the Add button
  # @param title [String]                      - the title of the category
  def add_category(title)
    logger.info "Adding category called #{title}"
    WebDriverUtils.wait_for_element_and_click category_input_element
    self.category_input = title
    WebDriverUtils.wait_for_element_and_click add_category_button_element
  end

  # Clicks the delete button for a category at a specified position in the list, then accepts the alert
  # @param driver [Selenium::WebDriver]         - the browser
  # @param index_position [Integer]             - the position of the category in the list of categories
  def delete_category(driver, index_position)
    logger.info 'Deleting category'
    wait_until(timeout=WebDriverUtils.page_update_wait) { delete_category_button_elements[index_position].exists? }
    WebDriverUtils.wait_for_element_and_click delete_category_button_elements[index_position]
    driver.switch_to.alert.accept
  end

  # LIKES

  # Returns all the click-able 'like' button elements on the current page
  def enabled_like_buttons
    buttons = []
    list_view_asset_like_button_elements.each { |button| buttons << button if button.enabled? }
    buttons
  end

  # Toggles the state of a specified 'like' button element in a collection of elements, from like to not-like or vice versa
  # @param index_position [Integer]             - the position of the button in the collection of buttons
  def toggle_list_view_item_like(index_position)
    WebDriverUtils.wait_for_element_and_click list_view_asset_like_button_elements[index_position]
  end

  # COMMENTS

  # Adds a new comment on the asset detail view
  # @param comment_body [String]                - the text of the new comment
  def add_comment(comment_body)
    WebDriverUtils.wait_for_element_and_type(self.comment_input_element, comment_body)
    wait_until(timeout=WebDriverUtils.page_update_wait) { comment_add_button_element.enabled? }
    comment_add_button
  end

  # Returns the comment count displayed for an asset at a given position in the asset list view
  # @param index_position [Integer]             - the position of the asset in the list
  def asset_comment_count(index_position)
    list_view_asset_elements[index_position].span_element(:xpath => '//span[@data-ng-bind="asset.comment_count | number"]').text
  end

  # Returns the text of a comment or reply at a given position in the collection of comments
  # @param index_position [Integer]             - the position of the comment in the collection
  def comment_body(index_position)
    comment_elements[index_position].paragraph_element.text
  end

  # Returns the commenter name of a comment at a given position in the collection of comments
  # @param index_position [Integer]             - the position of the comment in the collection
  def commenter_name(index_position)
    comment_elements[index_position].link_element.text
  end

  # Returns the first link with specified text within the body of a comment at a given position in the collection of comments
  # @param driver [Selenium::WebDriver]         - the browser
  # @param index_position [Integer]             - the position of the comment in the collection
  # @param link_text [String]                   - the text of the link
  def comment_body_link(driver, index_position, link_text)
    driver.find_element(:xpath => "//div[@data-ng-repeat='comment in asset.comments'][#{(index_position + 1).to_s}]//p/a[text()='#{link_text}']" )
  end

  # Returns reply button element at a given position in the collection of comments
  # @param driver [Selenium::WebDriver]         - the browser
  # @param index_position [Integer]             - the position of the comment in the collection
  # @return [Selenium::WebDriver::Element]      - the reply button element
  def reply_button_element(driver, index_position)
    driver.find_element(:xpath => "//div[@data-ng-repeat='comment in asset.comments'][#{(index_position + 1).to_s}]//button[contains(.,'Reply')]")
  rescue Selenium::WebDriver::Error::NoSuchElementError
    nil
  end

  # Clicks the reply button for a comment at a given position in the collection of comments
  # @param driver [Selenium::WebDriver]         - the browser
  # @param index_position [Integer]             - the position of the comment in the collection
  def click_reply_button(driver, index_position)
    wait_until(timeout=WebDriverUtils.page_load_wait) { !reply_button_element(driver, index_position).nil? }
    reply_button_element(driver, index_position).click
  end

  # Returns the text area for replying to a comment
  # @param index_position [Integer]             - the position of the comment in the collection of comments
  # @return [Selenium::WebDriver::Element]      - the text area element
  def reply_input_element(index_position)
    comment_elements[index_position].text_area_element(:id => 'assetlibrary-item-addcomment-body')
  end

  # Returns the reply button for confirming adding a reply to a comment
  # @param index_position [Integer]             - the position of the comment in the collection
  # @return [Selenium::WebDriver::Element]      - the button element
  def reply_add_button_element(index_position)
    comment_elements[index_position].button_element(:xpath => '//span[text()="Reply"]/..')
  end

  # Adds a reply to a comment at a given position in the collection of comments
  # @param driver [Selenium::WebDriver]         - the browser
  # @param index_position [Integer]             - the position of the comment in the collection
  # @param reply_body [String]                  - the text of the reply
  def reply_to_comment(driver, index_position, reply_body)
    click_reply_button(driver, index_position)
    WebDriverUtils.wait_for_element_and_type(reply_input_element(index_position), reply_body)
    reply_add_button_element(index_position).click
  end

  # Returns the edit button at a given position in the collection of comments
  # @param driver [Selenium::WebDriver]         - the browser
  # @param index_position [Integer]             - the position of the comment in the collection
  # @return [Selenium::WebDriver::Element]      - the edit button element
  def edit_button_element(driver, index_position)
    driver.find_element(:xpath => "//div[@data-ng-repeat='comment in asset.comments'][#{(index_position + 1).to_s}]//button[contains(.,'Edit')]")
  rescue Selenium::WebDriver::Error::NoSuchElementError
    nil
  end

  # Clicks the edit button for a comment at a given position in the collection of comments
  # @param driver [Selenium::WebDriver]         - the browser
  # @param index_position [Integer]             - the position of the comment in the collection
  def click_edit_button(driver, index_position)
    wait_until(timeout=WebDriverUtils.page_load_wait) { !edit_button_element(driver, index_position).nil? }
    edit_button_element(driver, index_position).click
  end

  # Returns the text area for editing a comment
  # @param index_position [Integer]             - the position of the comment in the collection of comments
  # @return [Selenium::WebDriver::Element]      - the text area element
  def edit_input_element(index_position)
    comment_elements[index_position].text_area_element(:id => 'assetlibrary-item-editcomment-body')
  end

  # Returns the button for saving an edit to a comment
  # @param index_position [Integer]             - the position of the comment in the collection of comments
  # @return [Selenium::WebDriver::Element]      - the edit button element
  def edit_save_button_element(index_position)
    comment_elements[index_position].button_element(:xpath => '//button[contains(.,"Save Changes")]')
  end

  # Edits a comment at a given position in the collection of comments
  # @param driver [Selenium::WebDriver]         - the browser
  # @param index_position [Integer]             - the position of the comment in the collection of comments
  # @param edited_body [String]                 - the new text of the edited comment
  def edit_comment(driver, index_position, edited_body)
    click_edit_button(driver, index_position)
    WebDriverUtils.wait_for_element_and_type(edit_input_element(index_position), edited_body)
    edit_save_button_element(index_position).click
  end

  # Returns the button for canceling a reply or an edit to a comment
  # @param index_position [Integer]             - the position of the comment in the collection of comments
  def cancel_button_element(index_position)
    comment_elements[index_position].button_element(:xpath => '//button[contains(.,"Cancel")]')
  end

  # Returns the button for deleting a comment at a given position in the collection of comments
  # @param driver [Selenium::WebDriver]         - the browser
  # @param index_position [Integer]             - the position of the comment in the collection of comments
  # @return [Selenium::WebDriver::Element]      - the delete button element
  def delete_button_element(driver, index_position)
    driver.find_element(:xpath => "//div[@data-ng-repeat='comment in asset.comments'][#{(index_position + 1).to_s}]//button[contains(.,'Delete')]")
  rescue Selenium::WebDriver::Error::NoSuchElementError
    nil
  end

  # Clicks the delete button for a comment at a given position in the collection of comments
  # @param driver [Selenium::WebDriver]         - the browser
  # @param index_position [Integer]             - the position of the comment in the collection
  def click_delete_button(driver, index_position)
    wait_until(timeout=WebDriverUtils.page_load_wait) { !delete_button_element(driver, index_position).nil? }
    delete_button_element(driver, index_position).click
  end

  # Deletes a comment at a given position in the collection of comments
  # @param driver [Selenium::WebDriver]         - the browser
  # @param index_position [Integer]             - the position of the comment in the collection
  def delete_comment(driver, index_position)
    confirm(true) { click_delete_button(driver, index_position) }
  end

  # Clicks the 'Back to Asset Library' link on the asset detail view
  def click_back_to_asset_library_link
    WebDriverUtils.wait_for_element_and_click back_to_library_link_element
    search_input_element.when_visible(timeout=WebDriverUtils.page_update_wait)
  end

end
