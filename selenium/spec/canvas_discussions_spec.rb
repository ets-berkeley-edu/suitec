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

describe 'A Canvas discussion', :order => :defined do

  test_id = WebDriverUtils.test_course_name(self)
  test_users = WebDriverUtils.mapped_test_users
  discussion_name = 'Discussion Topic'
  teacher_1 = test_users['Teacher 1']
  teacher_2 = test_users['Teacher 2']

  before(:all) do
    @driver = WebDriverUtils.driver
    @canvas = CanvasPage.new @driver
    @canvas.load_homepage
    @cal_net= CalNetPage.new @driver
    @cal_net.log_in(WebDriverUtils.admin_username, WebDriverUtils.admin_password)
    @course_id = @canvas.create_complete_test_course(test_id, test_users)
    @engagement_index = EngagementIndexPage.new @driver
    @engagement_index_url = @canvas.click_engagement_index_link @driver
    @canvas.log_out @driver
    @cal_net.logout_success_message_element.when_visible WebDriverUtils.page_load_wait
    @canvas.load_homepage
    @cal_net.log_in(teacher_1['username'], WebDriverUtils.test_user_password)
    @canvas.load_course_site @course_id
    @discussion_url = @canvas.create_discussion(@course_id, discussion_name)
  end

  it 'earns "Add a new topic in Discussions" Engagement Index points for the discussion creator' do
    expect(@engagement_index.user_score_updated?(@driver, @engagement_index_url, teacher_1, '5')).to be true
  end

  it 'adds "discussion_topic" activity to the CSV export for the discussion creator' do
    scores = @engagement_index.download_csv(@driver, @course_id, @engagement_index_url)
    expect(scores).to include("#{teacher_1['fullName']}, discussion_topic, 5, 5")
  end

  describe 'reply' do

    context 'when added by the discussion creator' do

      before(:all) do
        @canvas.add_reply(@discussion_url, nil, 'A reply entry by the discussion creator')
      end

      it 'earns "Add an entry on a topic in Discussions" Engagement Index points for the discussion creator' do
        expect(@engagement_index.user_score_updated?(@driver, @engagement_index_url, teacher_1, '8')).to be true
      end
      it 'adds "discussion_entry" activity to the CSV export for the discussion creator' do
        scores = @engagement_index.download_csv(@driver, @course_id, @engagement_index_url)
        expect(scores).to include("#{teacher_1['fullName']}, discussion_entry, 3, 8")
      end
    end

    context 'when added by someone other than the discussion creator' do

      before(:all) do
        @canvas.log_out @driver
        @cal_net.logout_success_message_element.when_visible WebDriverUtils.page_load_wait
        @canvas.load_homepage
        @cal_net.log_in(teacher_2['username'], WebDriverUtils.test_user_password)
        @canvas.load_course_site @course_id
        @canvas.accept_login_messages @course_id
        @canvas.add_reply(@discussion_url, nil, 'A reply entry by somebody other than the discussion creator')
      end

      it 'earns "Add an entry on a topic in Discussions" Engagement Index points for the user adding the entry' do
        expect(@engagement_index.user_score_updated?(@driver, @engagement_index_url, teacher_2, '3')).to be true
      end
      it 'adds "discussion_entry" activity to the CSV export for the user adding the entry' do
        scores = @engagement_index.download_csv(@driver, @course_id, @engagement_index_url)
        expect(scores).to include("#{teacher_2['fullName']}, discussion_entry, 3, 3")
      end
    end

    describe 'reply-to-reply' do

      context 'when added by the user who created the original reply' do

        before(:all) do
          @canvas.log_out @driver
          @cal_net.logout_success_message_element.when_visible WebDriverUtils.page_load_wait
          @canvas.load_homepage
          @cal_net.log_in(teacher_1['username'], WebDriverUtils.test_user_password)
          @canvas.load_course_site @course_id
          @canvas.add_reply(@discussion_url, 0, 'A reply to a reply made by the same user')
        end

        it 'earns "Add an entry on a topic in Discussions" Engagement Index points for the user adding the reply-to-reply' do
          expect(@engagement_index.user_score_updated?(@driver, @engagement_index_url, teacher_1, '12')).to be true
        end

        it 'earns "Receive a reply on an entry in Discussions" Engagement Index points for the user adding the reply-to-reply' do
          expect(@engagement_index.user_score_updated?(@driver, @engagement_index_url, teacher_1, '12')).to be true
        end

        it 'adds "discussion_entry" activity to the CSV export for the user adding the reply-to-reply' do
          scores = @engagement_index.download_csv(@driver, @course_id, @engagement_index_url)
          expect(scores).to include("#{teacher_1['fullName']}, discussion_entry, 3, 11")
        end

        it 'adds "get_discussion_entry_reply" activity to the CSV export for the user adding the reply-to-reply' do
          scores = @engagement_index.download_csv(@driver, @course_id, @engagement_index_url)
          expect(scores).not_to include("#{teacher_1['fullName']}, get_discussion_entry_reply, 1, 12")
        end
      end

      context 'when added by by someone other than the original reply creator' do

        before(:all) do
          @canvas.log_out @driver
          @cal_net.logout_success_message_element.when_visible WebDriverUtils.page_load_wait
          @canvas.load_homepage
          @cal_net.log_in(teacher_2['username'], WebDriverUtils.test_user_password)
          @canvas.load_course_site @course_id
          @canvas.add_reply(@discussion_url, 1, 'A reply to a reply made by a different user')
        end

        it 'earns "Add an entry on a topic in Discussions" Engagement Index points for the user adding the reply-to-reply' do
          expect(@engagement_index.user_score_updated?(@driver, @engagement_index_url, teacher_2, '6')).to be true
        end

        it 'earns "Receive a reply on an entry in Discussions" Engagement Index points for the user who added the original reply' do
          expect(@engagement_index.user_score_updated?(@driver, @engagement_index_url, teacher_1, '13')).to be true
        end

        it 'adds "discussion_entry" activity to the CSV export for the user adding the reply-to-reply' do
          scores = @engagement_index.download_csv(@driver, @course_id, @engagement_index_url)
          expect(scores).to include("#{teacher_1['fullName']}, discussion_entry, 3, 6")
        end

        it 'adds "get_discussion_entry_reply" activity to the CSV export for the user who added the original reply' do
          scores = @engagement_index.download_csv(@driver, @course_id, @engagement_index_url)
          expect(scores).to include("#{teacher_1['fullName']}, get_discussion_entry_reply, 1, 13")
        end

      end
    end
  end

  after(:all) { @driver.quit }

end
