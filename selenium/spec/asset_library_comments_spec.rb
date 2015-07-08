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

describe 'An asset library comment', :order => :defined do

  test_id = WebDriverUtils.test_course_name(self)
  test_users = WebDriverUtils.mapped_test_users
  timeout = WebDriverUtils.page_update_wait
  asset_creator = test_users['Teacher 1']
  asset_viewer = test_users['Teacher 2']
  asset_title = 'Remarkable Asset'

  comment_1_uploader = 'Asset uploader comment'
  comment_1_uploader_reply = 'Asset uploader reply to self'
  comment_1_viewer_reply = 'Asset viewer reply to asset creator'
  comment_2_viewer = 'Asset viewer comment'
  comment_2_viewer_reply = 'Asset viewer reply to self'
  comment_2_viewer_edit = 'Asset viewer comment edited'
  comment_3_viewer = 'Asset viewer comment with link http://www.google.com'

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
  end

  context 'by the asset creator' do

    before(:all) do
      @canvas.load_homepage
      @cal_net.log_in(asset_creator['username'], WebDriverUtils.test_user_password)
      @canvas.load_course_site @course_id
      @canvas.accept_login_messages @course_id
      @asset_library.load_page(@driver, @asset_library_url)
      @asset_library.click_add_site_link
      @asset_library.enter_url_metadata('www.google.com', asset_title, nil, nil)
      @asset_library.click_add_url_button
      @asset_library.wait_for_asset_in_gallery(@driver, asset_title)
    end
    it 'can be added on the detail view' do
      @asset_library.load_gallery_asset_detail(@driver, @asset_library_url, asset_title, 0)
      @asset_library.add_comment comment_1_uploader
      @asset_library.wait_until(timeout) { @asset_library.comment_elements.count == 1 }
      @asset_library.wait_until(timeout) { @asset_library.asset_detail_comment_count == '1' }
      expect(@asset_library.comment_body(0)).to eql(comment_1_uploader)
      expect(@asset_library.commenter_name(0)).to include(asset_creator['fullName'])
      @asset_library.click_back_to_gallery_link
      expect(@asset_library.asset_comment_count(0)).to eql('1')
    end
    it 'can be added as a reply to an existing comment' do
      @asset_library.load_gallery_asset_detail(@driver, @asset_library_url, asset_title, 0)
      @asset_library.reply_to_comment(0, comment_1_uploader_reply)
      @asset_library.wait_until(timeout) { @asset_library.comment_elements.count == 2 }
      @asset_library.wait_until(timeout) { @asset_library.asset_detail_comment_count == '2' }
      expect(@asset_library.comment_body(0)).to eql(comment_1_uploader)
      expect(@asset_library.commenter_name(0)).to include(asset_creator['fullName'])
      expect(@asset_library.comment_body(1)).to eql(comment_1_uploader_reply)
      expect(@asset_library.commenter_name(1)).to include(asset_creator['fullName'])
      @asset_library.click_back_to_gallery_link
      expect(@asset_library.asset_comment_count(0)).to eql('2')
    end
    it 'cannot be added as a reply to a reply' do
      expect(@asset_library.reply_button_element(0).exists?).to be true
      expect(@asset_library.reply_button_element(1).exists?).to be false
    end
    it 'does not earn commenting points on the engagement index' do
      @engagement_index.load_page(@driver, @engagement_index_url)
      @engagement_index.search_for_user asset_creator
      expect(@engagement_index.user_score asset_creator).to eql('5')
    end
    it 'does not show "Comment on a Gallery Submission" activity on the CSV export' do
      scores = @engagement_index.download_csv(@driver, @engagement_index_url)
      # TODO: insert CSV expectation once comment activity is tracked
    end
    it 'does not show "Receive a Comment on a Gallery Submission" activity on the CSV export' do
      scores = @engagement_index.download_csv(@driver, @engagement_index_url)
      # TODO: insert CSV expectation once comment activity is tracked
    end
    after(:all) do
      @canvas.load_homepage
      @canvas.log_out
    end
  end

  context 'by a user who is not the asset creator' do

    before(:all) do
      @canvas.load_course_site @course_id
      @cal_net.log_in(asset_viewer['username'], WebDriverUtils.test_user_password)
      @canvas.accept_login_messages @course_id
    end
    it 'can be added on the detail view' do
      @asset_library.load_gallery_asset_detail(@driver, @asset_library_url, asset_title, 0)
      @asset_library.add_comment comment_2_viewer
      @asset_library.wait_until(timeout) { @asset_library.comment_elements.count == 3 }
      @asset_library.wait_until(timeout) { @asset_library.asset_detail_comment_count == '3' }
      expect(@asset_library.comment_body(0)).to eql(comment_2_viewer)
      expect(@asset_library.commenter_name(0)).to include(asset_viewer['fullName'])
      expect(@asset_library.comment_body(1)).to eql(comment_1_uploader)
      expect(@asset_library.commenter_name(1)).to include(asset_creator['fullName'])
      expect(@asset_library.comment_body(2)).to eql(comment_1_uploader_reply)
      expect(@asset_library.commenter_name(2)).to include(asset_creator['fullName'])
      @asset_library.click_back_to_gallery_link
      expect(@asset_library.asset_comment_count(0)).to eql('3')
    end
    it 'can be added as a reply to the user\'s own comment' do
      @asset_library.load_gallery_asset_detail(@driver, @asset_library_url, asset_title, 0)
      @asset_library.reply_to_comment(0, comment_2_viewer_reply)
      @asset_library.wait_until(timeout) { @asset_library.comment_elements.count == 4 }
      @asset_library.wait_until(timeout) { @asset_library.asset_detail_comment_count == '4' }
      expect(@asset_library.comment_body(0)).to eql(comment_2_viewer)
      expect(@asset_library.commenter_name(0)).to include(asset_viewer['fullName'])
      expect(@asset_library.comment_body(1)).to eql(comment_2_viewer_reply)
      expect(@asset_library.commenter_name(1)).to include(asset_viewer['fullName'])
      expect(@asset_library.comment_body(2)).to eql(comment_1_uploader)
      expect(@asset_library.commenter_name(2)).to include(asset_creator['fullName'])
      expect(@asset_library.comment_body(3)).to eql(comment_1_uploader_reply)
      expect(@asset_library.commenter_name(3)).to include(asset_creator['fullName'])
      @asset_library.click_back_to_gallery_link
      expect(@asset_library.asset_comment_count(0)).to eql('4')
    end
    it 'can be added as a reply to another user\'s comment' do
      @asset_library.load_gallery_asset_detail(@driver, @asset_library_url, asset_title, 0)
      @asset_library.reply_to_comment(2, comment_1_viewer_reply)
      @asset_library.wait_until(timeout) { @asset_library.comment_elements.count == 5 }
      @asset_library.wait_until(timeout) { @asset_library.asset_detail_comment_count == '5' }
      expect(@asset_library.comment_body(0)).to eql(comment_2_viewer)
      expect(@asset_library.commenter_name(0)).to include(asset_viewer['fullName'])
      expect(@asset_library.comment_body(1)).to eql(comment_2_viewer_reply)
      expect(@asset_library.commenter_name(1)).to include(asset_viewer['fullName'])
      expect(@asset_library.comment_body(2)).to eql(comment_1_uploader)
      expect(@asset_library.commenter_name(2)).to include(asset_creator['fullName'])
      expect(@asset_library.comment_body(3)).to eql(comment_1_viewer_reply)
      expect(@asset_library.commenter_name(3)).to include(asset_viewer['fullName'])
      expect(@asset_library.comment_body(4)).to eql(comment_1_uploader_reply)
      expect(@asset_library.commenter_name(4)).to include(asset_creator['fullName'])
      @asset_library.click_back_to_gallery_link
      expect(@asset_library.asset_comment_count(0)).to eql('5')
    end
    it 'can be canceled when a reply' do
      @asset_library.load_gallery_asset_detail(@driver, @asset_library_url, asset_title, 0)
      WebDriverUtils.wait_for_element_and_click @asset_library.reply_button_element(0)
      @asset_library.reply_input_element(0).when_visible timeout
      @asset_library.cancel_button_element(0).click
      @asset_library.reply_input_element(0).when_not_visible timeout
    end
    it 'earns "Comment on a Gallery Submission" points on the engagement index for the user adding a comment or reply' do
      @engagement_index.load_page(@driver, @engagement_index_url)
      @engagement_index.search_for_user asset_viewer
      # TODO: insert expected scores once comments earn points
    end
    it 'earns "Receive a Comment on a Gallery Submission" points on the engagement index for the user receiving the comment or reply' do
      # TODO: insert expected scores once comments earn points
      @engagement_index.load_page(@driver, @engagement_index_url)
      @engagement_index.search_for_user asset_creator
      # TODO: insert expected scores once comments earn points
    end
    it 'shows "Comment on a Gallery Submission" activity on the CSV export for the user adding the comment or reply' do
      scores = @engagement_index.download_csv(@driver, @engagement_index_url)
      # TODO: insert CSV expectation once comment activity is tracked
    end
    it 'shows "Receive a Comment on a Gallery Submission" activity on the CSV export for the user receiving the comment or reply' do
      scores = @engagement_index.download_csv(@driver, @engagement_index_url)
      # TODO: insert CSV expectation once comment activity is tracked
    end
    it 'can include a link that opens in a new browser window' do
      @asset_library.load_gallery_asset_detail(@driver, @asset_library_url, asset_title, 0)
      @asset_library.add_comment comment_3_viewer
      @asset_library.wait_until(timeout) { @asset_library.comment_elements.count == 6 }
      WebDriverUtils.verify_external_link(@driver, @asset_library.comment_body_link(0, comment_3_viewer), 'Google')
    end
  end

  describe 'edit' do

    it 'can be done by the user who created the comment' do
      @asset_library.load_gallery_asset_detail(@driver, @asset_library_url, asset_title, 0)
      @asset_library.edit_comment(1, comment_2_viewer_edit)
      @asset_library.wait_until(timeout) { @asset_library.comment_body(3) == comment_2_viewer_edit }
      expect(@asset_library.asset_detail_comment_count).to eql('6')
      expect(@asset_library.comment_body(0)).to eql(comment_1_uploader)
      expect(@asset_library.comment_body(1)).to eql(comment_1_uploader_reply)
      expect(@asset_library.comment_body(2)).to eql(comment_1_viewer_reply)
      expect(@asset_library.comment_body(4)).to eql(comment_2_viewer_reply)
      expect(@asset_library.comment_body(5)).to eql(comment_3_viewer)
    end
    it 'can be done to any comment when the user is a teacher' do
      expect(@asset_library.edit_button_element(0).exists?).to be true
      expect(@asset_library.edit_button_element(1).exists?).to be true
      expect(@asset_library.edit_button_element(2).exists?).to be true
      expect(@asset_library.edit_button_element(3).exists?).to be true
      expect(@asset_library.edit_button_element(4).exists?).to be true
      expect(@asset_library.edit_button_element(5).exists?).to be true
    end
    it 'can be canceled' do
      @asset_library.load_gallery_asset_detail(@driver, @asset_library_url, asset_title, 0)
      WebDriverUtils.wait_for_element_and_click @asset_library.edit_button_element(1)
      @asset_library.edit_input_element(1).when_visible timeout
      @asset_library.cancel_button_element(1).click
      @asset_library.edit_input_element(1).when_not_visible timeout
    end
    it 'does not alter existing engagement scores' do
      @engagement_index.load_page(@driver, @engagement_index_url)
      @engagement_index.search_for_user asset_creator
      # TODO: insert expected scores once comments earn points
      @engagement_index.search_for_user asset_viewer
      # TODO: insert expected scores once comments earn points
    end
  end

  describe 'deletion' do

    it 'can be done by the user who created the comment' do
      @asset_library.load_gallery_asset_detail(@driver, @asset_library_url, asset_title, 0)
      @asset_library.delete_comment 5
      @asset_library.wait_until(timeout) { @asset_library.comment_elements.count == 5 }
      @asset_library.wait_until(timeout) { @asset_library.asset_detail_comment_count == '5' }
      expect(@asset_library.comment_body(0)).to eql(comment_1_uploader)
      expect(@asset_library.comment_body(1)).to eql(comment_1_uploader_reply)
      expect(@asset_library.comment_body(2)).to eql(comment_1_viewer_reply)
      expect(@asset_library.comment_body(3)).to eql(comment_2_viewer_edit)
      expect(@asset_library.comment_body(4)).to eql(comment_2_viewer_reply)
    end
    it 'cannot be done if the comment has associated replies' do
      expect(@asset_library.delete_button_element(0).exists?).to be false
      expect(@asset_library.delete_button_element(1).exists?).to be true
      expect(@asset_library.delete_button_element(2).exists?).to be true
      expect(@asset_library.delete_button_element(3).exists?).to be false
      expect(@asset_library.delete_button_element(4).exists?).to be true
    end
    it 'removes engagement index points earned for the comment' do
      @engagement_index.load_page(@driver, @engagement_index_url)
      @engagement_index.search_for_user asset_creator
      # TODO: insert expected scores once comments earn points
      @engagement_index.search_for_user asset_viewer
      # TODO: insert expected scores once comments earn points
    end
    it 'removes "comment" and "get_comment" activity on the CSV export' do
      # TODO: insert CSV expectation once comment activity is tracked
    end
  end

  after(:all) { @driver.quit }

end
