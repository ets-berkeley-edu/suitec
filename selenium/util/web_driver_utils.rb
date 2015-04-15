require 'selenium-webdriver'
require 'page-object'
require 'json'

class WebDriverUtils

  @config = YAML.load_file File.join(ENV['HOME'], '/.collabosphere_selenium/settings.yml')

  def self.driver
    Selenium::WebDriver.for @config['webdriver'].to_sym
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
    @config['lti_url']
  end

  def self.test_course_name(spec)
    "#{spec.inspect.sub('RSpec::ExampleGroups::', '')}-#{Time.now.to_i.to_s}"
  end

  def self.load_test_users
    test_users = File.join(ENV['HOME'], '/.collabosphere_selenium/testUsers.json')
    users_array = JSON.parse(File.read(test_users))['users']
    users_array.inject({}) { |map, user| map[user['id']] = user; map }
  end

  def self.wait_for_element_and_click(element)
    element.when_visible timeout=page_update_wait
    element.click
  end

  def self.wait_for_page_and_click(element)
    element.when_visible timeout=page_load_wait
    element.click
  end

end
