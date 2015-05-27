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

class CalNetPage

  include PageObject
  include Logging

  text_area(:username_input, :id => 'username')
  text_area(:password_input, :id => 'password')
  button(:sign_in_button, :xpath => '//input[@value="Sign In"]')
  h3(:logout_success_message, :xpath => '//h3[text()="Logout Successful"]')

  # Authenticates via the CalNet SSO service
  # @param username [String]                   - the CalNet username
  # @param password [String]                   - the CalNet password
  def log_in(username, password)
    username_input_element.when_visible(timeout=WebDriverUtils.page_load_wait)
    self.username_input = username
    self.password_input = password
    WebDriverUtils.wait_for_element_and_click sign_in_button_element
  end

end
