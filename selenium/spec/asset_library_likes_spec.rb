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

require_relative 'spec_helper'

include Logging

describe 'Asset likes', :order => :defined do

  test_id = WebDriverUtils.test_course_name(self)
  test_users = WebDriverUtils.load_test_users
  test_uploader = test_users['Teacher 1']
  test_liker = test_users['Teacher 2']

  before(:all) do
    @driver = WebDriverUtils.driver
    @canvas = CanvasPage.new @driver
    @canvas.load_homepage
    @cal_net= CalNetPage.new @driver
    @cal_net.log_in(WebDriverUtils.admin_username, WebDriverUtils.admin_password)
    @course_id = @canvas.create_complete_test_course(test_id, test_users)
    @asset_library = AssetLibraryPage.new @driver
    @asset_library_url = @canvas.click_asset_library_link @driver
    @engagement_index = EngagementIndexPage.new @driver
    @engagement_index_url = @canvas.click_engagement_index_link @driver
    @canvas.log_out
    @cal_net.logout_success_message_element.when_visible WebDriverUtils.page_load_wait
    @canvas.load_homepage
    @cal_net.log_in(test_uploader['username'], WebDriverUtils.test_user_password)
    @canvas.load_course_site @course_id
    @canvas.accept_login_messages @course_id
    @asset_library.load_page(@driver, @asset_library_url)
    @asset_library.click_add_site_link
    @asset_title = 'Likable Asset'
    @asset_library.enter_url_metadata('www.google.com', @asset_title, nil, nil)
    @asset_library.click_add_url_button
    @asset_library.wait_for_asset_in_gallery(@driver, @asset_title)
  end

  context 'when the user is the asset creator' do
    it 'cannot be added on the gallery' do
      expect(@asset_library.enabled_like_buttons.any?).to be false
    end
    it 'cannot be added on the detail view' do
      @asset_library.click_asset_link 0
      @asset_library.wait_for_asset_detail(@driver, @asset_title)
      expect(@asset_library.enabled_like_buttons.any?).to be false
      @asset_library.click_back_to_gallery_link
    end
  end

  context 'when added on the gallery view' do
    before(:all) do
      @canvas.load_homepage
      @canvas.log_out
      @canvas.load_course_site @course_id
      @cal_net.log_in(test_liker['username'], WebDriverUtils.test_user_password)
      @canvas.accept_login_messages @course_id
      @asset_library.load_gallery_asset(@driver, @asset_library_url, @asset_title)
    end
    it 'increase the asset\'s total likes' do
      @asset_library.wait_until { @asset_library.gallery_asset_likes_count_elements[0].text == '0' }
      @asset_library.toggle_gallery_item_like 0
      @asset_library.wait_until { @asset_library.gallery_asset_likes_count_elements[0].text == '1' }
    end
    it 'earn Engagement Index "like" points for the liker' do
      @engagement_index.load_page(@driver, @engagement_index_url)
      @engagement_index.search_for_user test_liker
      expect(@engagement_index.users_table_element[1][3].text).to eql('1')
    end
    it 'earn Engagement Index "get_like" points for the asset creator' do
      @engagement_index.search_for_user test_uploader
      expect(@engagement_index.users_table_element[1][3].text).to eql('6')
    end
    it 'add the liker\'s "like" activity to the activities csv' do
      scores = @engagement_index.download_csv(@driver, @engagement_index_url)
      expect(scores).to include("#{test_liker['fullName']}, like, 1")
    end
    it 'add the asset creator\'s "get_like" activity to the activities csv' do
      scores = @engagement_index.download_csv(@driver, @engagement_index_url)
      expect(scores).to include("#{test_uploader['fullName']}, get_like, 1")
    end
  end

  context 'when removed on the gallery view' do
    it 'decrease the asset\'s total likes' do
      @asset_library.load_gallery_asset(@driver, @asset_library_url, @asset_title)
      @asset_library.toggle_gallery_item_like 0
      @asset_library.wait_until { @asset_library.gallery_asset_likes_count_elements[0].text == '0' }
    end
    it 'remove Engagement Index "like" points from the un-liker' do
      @engagement_index.load_page(@driver, @engagement_index_url)
      @engagement_index.search_for_user test_liker
      expect(@engagement_index.users_table_element[1][3].text).to eql('0')
    end
    it 'remove Engagement Index "get_like" points from the asset creator' do
      @engagement_index.search_for_user test_uploader
      expect(@engagement_index.users_table_element[1][3].text).to eql('5')
    end
    it 'remove the un-liker\'s "like" activity from the activities csv' do
      scores = @engagement_index.download_csv(@driver, @engagement_index_url)
      expect(scores).not_to include("#{test_liker['fullName']}, like, 1")
    end
    it 'remove the asset creator\'s "get_like" activity from the activities csv' do
      scores = @engagement_index.download_csv(@driver, @engagement_index_url)
      expect(scores).not_to include("#{test_uploader['fullName']}, get_like, 1")
    end
  end

  context 'when added on the detail view' do
    before(:all) do
      @asset_library.load_page(@driver, @asset_library_url)
      @asset_library.wait_for_asset_in_gallery(@driver, @asset_title)
      @asset_library.click_asset_link 0
      @asset_library.wait_for_asset_detail(@driver, @asset_title)
    end
    it 'increase the asset\'s total likes' do
      @asset_library.wait_until { @asset_library.gallery_asset_likes_count_elements[0].text == '0' }
      @asset_library.toggle_gallery_item_like 0
      @asset_library.wait_until { @asset_library.gallery_asset_likes_count_elements[0].text == '1' }
    end
    it 'earn Engagement Index "like" points for the liker' do
      @engagement_index.load_page(@driver, @engagement_index_url)
      @engagement_index.search_for_user test_liker
      expect(@engagement_index.users_table_element[1][3].text).to eql('1')
    end
    it 'earn Engagement Index "get_like" points for the asset creator' do
      @engagement_index.search_for_user test_uploader
      expect(@engagement_index.users_table_element[1][3].text).to eql('6')
    end
    it 'add the liker\'s "like" activity to the activities csv' do
      scores = @engagement_index.download_csv(@driver, @engagement_index_url)
      expect(scores).to include("#{test_liker['fullName']}, like, 1")
    end
    it 'add the asset creator\'s "get_like" activity to the activities csv' do
      scores = @engagement_index.download_csv(@driver, @engagement_index_url)
      expect(scores).to include("#{test_uploader['fullName']}, get_like, 1")
    end
  end

  context 'when removed on the detail view' do
    before(:all) do
      @asset_library.load_page(@driver, @asset_library_url)
      @asset_library.wait_for_asset_in_gallery(@driver, @asset_title)
      @asset_library.click_asset_link 0
      @asset_library.wait_for_asset_detail(@driver, @asset_title)
    end
    it 'decrease the asset\'s total likes' do
      @asset_library.toggle_gallery_item_like 0
      @asset_library.wait_until { @asset_library.gallery_asset_likes_count_elements[0].text == '0' }
      @asset_library.click_back_to_gallery_link
    end
    it 'remove Engagement Index "like" points from the un-liker' do
      @engagement_index.load_page(@driver, @engagement_index_url)
      @engagement_index.search_for_user test_liker
      expect(@engagement_index.users_table_element[1][3].text).to eql('0')
    end
    it 'remove Engagement Index "get_like" points from the asset creator' do
      @engagement_index.search_for_user test_uploader
      expect(@engagement_index.users_table_element[1][3].text).to eql('5')
    end
    it 'remove the un-liker\'s "like" activity from the activities csv' do
      scores = @engagement_index.download_csv(@driver, @engagement_index_url)
      expect(scores).not_to include("#{test_liker['fullName']}, like, 1")
    end
    it 'remove the asset creator\'s "get_like" activity from the activities csv' do
      scores = @engagement_index.download_csv(@driver, @engagement_index_url)
      expect(scores).not_to include("#{test_uploader['fullName']}, get_like, 1")
    end
  end

  after(:all) { @driver.quit }

end
