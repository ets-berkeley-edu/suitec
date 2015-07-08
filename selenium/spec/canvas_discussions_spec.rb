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
    @canvas.log_out
    @cal_net.logout_success_message_element.when_visible WebDriverUtils.page_load_wait
    @canvas.load_homepage
    @cal_net.log_in(teacher_1['username'], WebDriverUtils.test_user_password)
    @canvas.load_course_site @course_id
    @discussion_url = @canvas.create_discussion(@course_id, discussion_name)
  end

  it 'earns "create a discussion" Engagement Index points for the creator' do
    expect(@engagement_index.user_score_updated?(@driver, @engagement_index_url, teacher_1, '5')).to be true
  end

  it 'adds "discussion_topic" activity to the CSV export' do
    scores = @engagement_index.download_csv(@driver, @engagement_index_url)
    expect(scores).to include("#{teacher_1['fullName']}, discussion_topic, 5")
  end

  describe 'reply' do

    context 'when created' do

      before(:all) do
        @canvas.post_discussion_reply(@discussion_url, 'A reply by the discussion creator')
        @canvas.log_out
        @cal_net.logout_success_message_element.when_visible WebDriverUtils.page_load_wait
        @canvas.load_homepage
        @cal_net.log_in(teacher_2['username'], WebDriverUtils.test_user_password)
        @canvas.load_course_site @course_id
        @canvas.accept_login_messages @course_id
        @canvas.post_discussion_reply(@discussion_url, 'A reply by somebody other than the discussion creator')
      end
      it 'earns Engagement Index points for a replier who created the discussion' do
        expect(@engagement_index.user_score_updated?(@driver, @engagement_index_url, teacher_1, '8')).to be true
      end
      it 'adds "discussion_entry" activity to the CSV export for a replier who created the discussion' do
        scores = @engagement_index.download_csv(@driver, @engagement_index_url)
        expect(scores).to include("#{teacher_1['fullName']}, discussion_entry, 3")
      end
      it 'earns Engagement Index points for a replier who did not create the discussion' do
        @engagement_index.load_page(@driver, @engagement_index_url)
        expect(@engagement_index.user_score_updated?(@driver, @engagement_index_url, teacher_2, '3')).to be true
      end
      it 'adds "discussion_entry" activity to the CSV export for a replier who did not create the discussion' do
        scores = @engagement_index.download_csv(@driver, @engagement_index_url)
        expect(scores).to include("#{teacher_2['fullName']}, discussion_entry, 3")
      end
    end
  end

  after(:all) { @driver.quit }

end
