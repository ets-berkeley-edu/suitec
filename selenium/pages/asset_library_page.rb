require_relative '../spec/spec_helper'

class AssetLibraryPage

  include PageObject
  include Logging

  # SEARCH
  text_area(:search_input, :id => 'assetlibrary-list-search')
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
  elements(:gallery_asset_link, :link, :xpath => '//li[@data-ng-repeat="asset in assets"]//a')
  elements(:gallery_asset_title, :h3, :xpath => '//li[@data-ng-repeat="asset in assets"]//h3')
  elements(:gallery_asset_owner_name, :element, :xpath => '//li[@data-ng-repeat="asset in assets"]//small')

  def load_page(driver, url)
    navigate_to url
    wait_until(timeout=WebDriverUtils.page_load_wait) { driver.find_element(:id, 'tool_content') }
    driver.switch_to.frame driver.find_element(:id, 'tool_content')
  end

  def wait_for_asset_in_gallery(driver, asset_title)
    wait_until(timeout=WebDriverUtils.page_load_wait) { driver.find_element(:xpath, "//li//h3[text()='#{asset_title}']").displayed? }
  end

  def click_asset_link(index_position)
    logger.info 'Clicking gallery thumbnail'
    WebDriverUtils.wait_for_element_and_click gallery_asset_link_elements[index_position]
  end

  def wait_for_asset_detail(driver, asset_title)
    wait_until(timeout=WebDriverUtils.page_update_wait) { driver.find_element(:xpath, "//h2[text()='#{asset_title}']").displayed? }
  end

  # ADD SITE

  def click_add_site_link
    logger.info 'Clicking Add Site link'
    WebDriverUtils.wait_for_page_and_click add_site_link_element
    add_url_heading_element.when_visible timeout=WebDriverUtils.page_update_wait
  end

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

  def click_add_url_button
    logger.info 'Confirming new URL'
    WebDriverUtils.wait_for_element_and_click add_url_button_element
  end

  def click_cancel_url_button
    logger.info 'Canceling new URL'
    WebDriverUtils.wait_for_element_and_click cancel_url_link_element
  end

  # MANAGE CATEGORIES

  def click_manage_categories_link
    logger.info 'Clicking Manage Categories link'
    WebDriverUtils.wait_for_page_and_click manage_categories_link_element
    manage_categories_heading_element.when_visible WebDriverUtils.page_update_wait
  end

  def add_category(title)
    logger.info "Adding category called #{title}"
    WebDriverUtils.wait_for_element_and_click category_input_element
    self.category_input = title
    WebDriverUtils.wait_for_element_and_click add_category_button_element
  end

  def delete_category(driver, index_position)
    logger.info 'Deleting category'
    wait_until(timeout=WebDriverUtils.page_update_wait) { delete_category_button_elements[index_position].exists? }
    WebDriverUtils.wait_for_element_and_click delete_category_button_elements[index_position]
    driver.switch_to.alert.accept
  end

end
