# Copyright ©2015. The Regents of the University of California (Regents). All Rights Reserved.
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
