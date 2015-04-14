require_relative '../spec/spec_helper'

class CalNetPage

  include PageObject

  text_area(:username_input, :id => 'username')
  text_area(:password_input, :id => 'password')
  button(:sign_in_button, :xpath => '//input[@value="Sign In"]')

  def log_in(username, password)
    username_input_element.when_visible(timeout=WebDriverUtils.page_load_wait)
    self.username_input = username
    self.password_input = password
    WebDriverUtils.wait_for_element_and_click sign_in_button_element
  end

end
