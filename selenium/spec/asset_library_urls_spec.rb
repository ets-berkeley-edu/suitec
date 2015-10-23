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

require_relative 'spec_helper'

describe 'Adding Asset Library URLs' do

  test_id = WebDriverUtils.test_course_name(self)
  test_users = WebDriverUtils.load_test_users
  test_teacher = test_users['Teacher 1']
  timeout=WebDriverUtils.page_update_wait

  before(:all) { @driver = WebDriverUtils.driver }

  before(:context) do
    canvas = CanvasPage.new @driver
    canvas.load_homepage
    cal_net= CalNetPage.new @driver
    cal_net.log_in(WebDriverUtils.admin_username, WebDriverUtils.admin_password)
    @course_id = canvas.create_complete_test_course(test_id, test_users)
    canvas.log_out
    cal_net.logout_success_message_element.when_visible WebDriverUtils.page_load_wait
    canvas.load_homepage
    cal_net.log_in(test_teacher['username'], WebDriverUtils.test_user_password)
    canvas.load_course_site @course_id
    canvas.accept_login_messages @course_id
    @asset_library = AssetLibraryPage.new @driver
    @asset_library_url = canvas.click_asset_library_link @driver
    @asset_library.load_page(@driver, @asset_library_url)
    @asset_library.click_manage_categories_link
    @asset_library.add_category 'Category 1'
    @asset_library.add_category 'Category 2'
    @asset_library.delete_category(@driver, 1)
  end

  before(:example) do
    @asset_library.load_page(@driver, @asset_library_url)
    @asset_library.click_add_site_link
  end

  it 'allows the user to add a URL, title, category, and description to the asset library' do
    @asset_library.enter_url_metadata('en.wikipedia.org', 'URL Title 1', 'Category 1', 'URL description')
    @asset_library.click_add_url_button
    @asset_library.wait_until(timeout) { @asset_library.list_view_asset_title_elements[0].text == 'URL Title 1' }
    expect(@asset_library.list_view_asset_owner_name_elements[0].text).to eql("by #{test_teacher['fullName']}")
    @asset_library.click_asset_link 0
    @asset_library.wait_for_asset_detail('URL Title 1')
    # TODO: verify asset category, description, and embedded URL once visible in the viewport
  end

  it 'allows the user to add a URL, title, and category to the asset library' do
    @asset_library.enter_url_metadata('en.wikipedia.org', 'URL Title 2', 'Category 1', nil)
    @asset_library.click_add_url_button
    @asset_library.wait_until(timeout) { @asset_library.list_view_asset_title_elements[0].text == 'URL Title 2' }
    expect(@asset_library.list_view_asset_owner_name_elements[0].text).to eql("by #{test_teacher['fullName']}")
    @asset_library.click_asset_link 0
    @asset_library.wait_for_asset_detail('URL Title 2')
    # TODO: verify asset category and embedded URL once visible in the viewport
  end

  it 'allows the user to add a URL and title to the asset library' do
    @asset_library.enter_url_metadata('en.wikipedia.org', 'URL Title 3', nil, 'URL description')
    @asset_library.click_add_url_button
    @asset_library.wait_until(timeout) { @asset_library.list_view_asset_title_elements[0].text == 'URL Title 3' }
    expect(@asset_library.list_view_asset_owner_name_elements[0].text).to eql("by #{test_teacher['fullName']}")
    @asset_library.click_asset_link 0
    @asset_library.wait_for_asset_detail('URL Title 3')
    # TODO: verify asset embedded URL once visible in the viewport
  end

  it 'allows the user to add a URL, title, and description to the asset library' do
    @asset_library.enter_url_metadata('en.wikipedia.org', 'URL Title 4', nil, 'URL description')
    @asset_library.click_add_url_button
    @asset_library.wait_until(timeout) { @asset_library.list_view_asset_title_elements[0].text == 'URL Title 4' }
    expect(@asset_library.list_view_asset_owner_name_elements[0].text).to eql("by #{test_teacher['fullName']}")
    @asset_library.click_asset_link 0
    @asset_library.wait_for_asset_detail('URL Title 4')
    # TODO: verify asset description and embedded URL once visible in the viewport
  end

  it 'requires the user to enter a URL' do
    @asset_library.enter_url_metadata(nil, 'URL Title 5', nil, nil)
    @asset_library.click_add_url_button
    @asset_library.missing_url_error_element.when_visible timeout=WebDriverUtils.page_update_wait
    expect(@asset_library.url_title_input).to eql('URL Title 5')
  end

  it 'requires the user to enter a valid URL' do
    @asset_library.enter_url_metadata('foo bar', 'URL Title 6', nil, nil)
    @asset_library.click_add_url_button
    @asset_library.bad_url_error_element.when_visible timeout=WebDriverUtils.page_update_wait
    expect(@asset_library.url_input).to eql('http://foo bar')
    expect(@asset_library.url_title_input).to eql('URL Title 6')
  end

  it 'requires the user to enter a title' do
    @asset_library.enter_url_metadata('www.google.com', nil, nil, nil)
    @asset_library.click_add_url_button
    @asset_library.missing_url_title_error_element.when_visible timeout=WebDriverUtils.page_update_wait
    expect(@asset_library.url_input).to eql('http://www.google.com')
  end

  it 'limits a title to X characters' do
    # TODO: verify max character validation if implemented
  end

  it 'does not offer a default category' do
    expect(@asset_library.url_category).to eql('Which assignment or topic is this related to')
  end

  it 'offers only non-deleted categories' do
    expect(@asset_library.url_category_options).to eql(['Which assignment or topic is this related to', 'Category 1'])
  end

  it 'allows the user to cancel adding a URL and return to the asset library' do
    @asset_library.enter_url_metadata('http://www.google.com', 'Title 5', 'Category 1', 'Description Text')
    @asset_library.click_cancel_url_button
    @asset_library.add_site_link_element.when_visible timeout=WebDriverUtils.page_update_wait
  end

  after(:all) { @driver.quit }

end
