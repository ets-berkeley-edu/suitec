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

class AssetLibraryPage

  include PageObject
  include Logging

  # SEARCH / FILTER
  text_area(:search_input, :id => 'assetlibrary-search')
  button(:advanced_search_button, :class => 'assetlibrary-search-advanced')
  text_area(:keyword_search_input, :id => 'assetlibrary-search-keywords')
  select_list(:category_select, :id => 'assetlibrary-search-category')
  select_list(:uploader_select, :id => 'assetlibrary-search-user')
  select_list(:asset_type_select, :id => 'assetlibrary-search-type')
  button(:search_button, :xpath => '//button[@title="Search"]')
  button(:advanced_search_submit, :xpath => '//button[text()="Search"]')

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
  elements(:gallery_asset, :list_item, :xpath => '//li[@data-ng-repeat="asset in assets"]')
  elements(:gallery_asset_link, :link, :xpath => '//li[@data-ng-repeat="asset in assets"]//a')
  elements(:gallery_asset_title, :h3, :xpath => '//li[@data-ng-repeat="asset in assets"]//h3')
  elements(:gallery_asset_owner_name, :element, :xpath => '//li[@data-ng-repeat="asset in assets"]//small')
  elements(:gallery_asset_like_button, :button, :xpath => '//button[@data-ng-click="like(asset)"]')
  elements(:gallery_asset_likes_count, :span, :xpath => '//span[@data-ng-bind="asset.likes | number"]')
  elements(:gallery_asset_comments_count, :span, :xpath => '//span[@data-ng-bind="asset.comment_count | number"]')

  # COMMENTS
  span(:asset_detail_comment_count, :xpath => '//div[@class="assetlibrary-item-metadata"]//span[@data-ng-bind="asset.comment_count | number"]')
  text_area(:comment_input, :id => 'assetlibrary-item-newcomment-body')
  button(:comment_add_button, :xpath => '//span[text()="Comment"]/..')
  elements(:comment, :div, :xpath => '//div[@data-ng-repeat="comment in asset.comments"]')

  link(:back_to_library_link, :text => 'Back to Asset Library')

  # Loads the asset library and puts browser focus in the iframe containing the tool
  # @param driver [Selenium::WebDriver]         - the active browser
  # @param url [String]                         - the asset library URL specific to the test course site
  def load_page(driver, url)
    navigate_to url
    wait_until(timeout=WebDriverUtils.page_load_wait) { self.title == 'Asset Library' }
    wait_until(timeout=WebDriverUtils.page_load_wait) { driver.find_element(:id, 'tool_content') }
    driver.switch_to.frame driver.find_element(:id, 'tool_content')
  end

  # Obtains the asset id from the first asset in the gallery list of assets
  # @return [String]                            - the ID of the asset
  def get_first_asset_id
    wait_until(timeout=WebDriverUtils.page_load_wait) { gallery_asset_link_elements.any? }
    gallery_asset_link_elements[0].attribute('href').sub("#{WebDriverUtils.collabosphere_base_url}/assetlibrary/", '')
  end

  # Waits for an asset with a specified id to become visible in the gallery view
  # @param driver [Selenium::WebDriver]         - the active browser
  # @param asset_id [String]                    - the id of the asset that should appear in the gallery
  def wait_for_asset_in_gallery(driver, asset_id)
    wait_until(timeout=WebDriverUtils.page_load_wait) { driver.find_element(:xpath, "//li[@data-ng-repeat='asset in assets']//a[contains(@href,'#{asset_id}')]")  }
  end

  # Combines the methods for loading the asset library and waiting for an asset with a specific title to appear
  # @param driver [Selenium::WebDriver]         - the browser
  # @param url [String]                         - the asset library URL specific to the test course site
  # @param asset_id [String]                    - the id of the asset that should appear in the gallery
  def load_gallery_asset(driver, url, asset_id)
    load_page(driver, url)
    wait_for_asset_in_gallery(driver, asset_id)
  end

  # Waits for and then clicks the asset gallery item at a specified position in the list of items
  # @param index_position [Integer]             - the position of the asset in the list of assets
  def click_asset_link(index_position)
    logger.info 'Clicking gallery thumbnail'
    WebDriverUtils.wait_for_element_and_click gallery_asset_link_elements[index_position]
  end

  # Waits for an asset with a specified title to become visible in the detail view
  # @param driver [Selenium::WebDriver]         - the active browser
  # @param asset_title [String]                 - the title of the asset that should appear in the detail view
  def wait_for_asset_detail(driver, asset_title)
    wait_until(timeout=WebDriverUtils.page_update_wait) { driver.find_element(:xpath, "//h2[contains(text(),'#{asset_title}')]").displayed? }
  end

  # Combines methods to load the asset library, click an asset, and wait for the asset detail to load
  # @param driver [Selenium::WebDriver]         - the browser
  # @param url [String]                         - the asset library URL specific to the test course site
  # @param asset_title [String]                 - the title of the asset that should appear in the gallery
  # @param index_position [Integer]             - the position of the asset in the list of assets
  def load_gallery_asset_detail(driver, url, asset_title, index_position)
    load_gallery_asset(driver, url, asset_title)
    click_asset_link index_position
    wait_for_asset_detail(driver, asset_title)
  end

  # Populates the advanced search form and submits the search
  # @param keyword [String]                     - the keyword string
  # @param category [String]                    - the category name from among the select options
  # @param uploader [String]                    - the uploader name from among the select options
  # @param asset_type [String]                  - the asset type from among the select options
  def advanced_search(keyword, category, uploader, asset_type)
    logger.info "Performing advanced search of asset library by keyword '#{keyword}', category '#{category}', uploader '#{uploader}', and asset type '#{asset_type}'."
    WebDriverUtils.wait_for_page_and_click advanced_search_button_element
    keyword_search_input_element.when_visible timeout=WebDriverUtils.page_update_wait
    self.keyword_search_input = keyword unless keyword.nil?
    self.category_select = category unless category.nil?
    self.uploader_select = uploader unless uploader.nil?
    self.asset_type_select = asset_type unless asset_type.nil?
    WebDriverUtils.wait_for_element_and_click advanced_search_submit_element
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
  # @param driver [Selenium::WebDriver]         - the active browser
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
    gallery_asset_like_button_elements.each { |button| buttons << button if button.enabled? }
    buttons
  end

  # Toggles the state of a specified 'like' button element in a collection of elements, from like to not-like or vice versa
  # @param index_position [Integer]             - the position of the button in the collection of buttons
  def toggle_gallery_item_like(index_position)
    WebDriverUtils.wait_for_element_and_click gallery_asset_like_button_elements[index_position]
  end

  # COMMENTS

  # Adds a new comment on the asset detail view
  # @param comment_body [String]                - the text of the new comment
  def add_comment(comment_body)
    WebDriverUtils.wait_for_element_and_click comment_input_element
    self.comment_input = comment_body
    wait_until(timeout=WebDriverUtils.page_update_wait) { comment_add_button_element.enabled? }
    comment_add_button
  end

  # Returns the comment count displayed for an asset at a specified position in the list of assets
  # @param index_position [Integer]             - the position of the asset in the list of assets
  def asset_comment_count(index_position)
    gallery_asset_elements[index_position].span_element(:xpath => '//span[@data-ng-bind="asset.comment_count | number"]').text
  end

  # Returns the comment text for an existing comment
  # @param index_position [Integer]             - the position of the comment in the list of comments
  def comment_body(index_position)
    comment_elements[index_position].paragraph_element.text
  end

  # Returns the commenter name displayed for an existing comment
  # @param index_position [Integer]             - the position of the comment in the list of comments
  def commenter_name(index_position)
    comment_elements[index_position].link_element.text
  end

  # Returns the first link within the body of an existing comment
  # @param index_position [Integer]             - the position of the comment in the list of comments
  # @param link_text [String]                   - the text of the link
  def comment_body_link(index_position, link_text)
    comment_elements[index_position].paragraph_element.link_element(:text => link_text)
  end

  # Returns the reply button for a comment
  # @param index_position [Integer]             - the position of the comment in the list of comments
  def reply_button_element(index_position)
    comment_elements[index_position].button_element(:xpath => '//button[@title="Reply to this comment"]')
  end

  # Returns the text area for replying to a comment
  # @param index_position [Integer]             - the position of the comment in the list of comments
  def reply_input_element(index_position)
    comment_elements[index_position].text_area_element(:id => 'assetlibrary-item-addcomment-body')
  end

  # Returns the button for adding a reply to a comment
  # @param index_position [Integer]             - the position of the comment in the list of comments
  def reply_add_button_element(index_position)
    comment_elements[index_position].button_element(:xpath => '//span[text()="Reply"]/..')
  end

  # Adds a reply to a comment
  # @param index_position [Integer]             - the position of the comment in the list of comments
  # @param reply_body [String]                  - the text of the reply
  def reply_to_comment(index_position, reply_body)
    WebDriverUtils.wait_for_element_and_click reply_button_element(index_position)
    WebDriverUtils.wait_for_element_and_type(reply_input_element(index_position), reply_body)
    reply_add_button_element(index_position).click
  end

  # Returns the edit button for a comment
  # @param index_position [Integer]             - the position of the comment in the list of comments
  def edit_button_element(index_position)
    comment_elements[index_position].button_element(:xpath => '//button[@title="Edit this comment"]')
  end

  # Returns the text area for editing a comment
  # @param index_position [Integer]             - the position of the comment in the list of comments
  def edit_input_element(index_position)
    comment_elements[index_position].text_area_element(:id => 'assetlibrary-item-editcomment-body')
  end

  # Returns the button for saving an edit to a comment
  # @param index_position [Integer]             - the position of the comment in the list of comments
  def edit_save_button_element(index_position)
    comment_elements[index_position].button_element(:xpath => '//button[contains(.,"Save Changes")]')
  end

  # Edits an existing comment
  # @param index_position [Integer]             - the position of the comment in the list of comments
  # @param edited_body [String]                 - the new text of the edited comment
  def edit_comment(index_position, edited_body)
    WebDriverUtils.wait_for_element_and_click edit_button_element(index_position)
    WebDriverUtils.wait_for_element_and_type(edit_input_element(index_position), edited_body)
    edit_save_button_element(index_position).click
  end

  # Returns the button for canceling a reply or an edit to a comment
  # @param index_position [Integer]             - the position of the comment in the list of comments
  def cancel_button_element(index_position)
    comment_elements[index_position].button_element(:xpath => '//button[text()="Cancel"]')
  end

  # Returns the button for deleting a comment
  # @param index_position [Integer]             - the position of the comment in the list of comments
  def delete_button_element(index_position)
    comment_elements[index_position].button_element(:xpath => '//button[@title="Delete this comment"]')
  end

  # Deletes an existing comment
  # @param index_position [Integer]             - the position of the comment in the list of comments
  def delete_comment(index_position)
    confirm(true) { WebDriverUtils.wait_for_element_and_click delete_button_element(index_position) }
  end

  # Clicks the 'Back to Asset Library' link on the asset detail view
  def click_back_to_gallery_link
    WebDriverUtils.wait_for_element_and_click back_to_library_link_element
    search_input_element.when_visible(timeout=WebDriverUtils.page_update_wait)
  end

end
