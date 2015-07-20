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

describe 'A Canvas assignment submission', :order => :defined do

  test_id = WebDriverUtils.test_course_name(self)
  students = WebDriverUtils.load_test_users.select { |user| user['role'] == 'Student' }
  assignment_name = 'Submission Assignment'
  teacher = WebDriverUtils.mapped_test_users['Teacher 1']
  timeout = WebDriverUtils.page_update_wait

  before(:all) do
    @driver = WebDriverUtils.driver
    @canvas = CanvasPage.new @driver
    @canvas.load_homepage
    @cal_net= CalNetPage.new @driver
    @cal_net.log_in(WebDriverUtils.super_admin_username, WebDriverUtils.super_admin_password)
    @course_id = '1354856'
    @assignment_url = 'https://ucberkeley.beta.instructure.com/courses/1354856/assignments/6455012'
    @asset_library = AssetLibraryPage.new @driver
    @asset_library_url = 'https://ucberkeley.beta.instructure.com/courses/1354856/external_tools/43959'
    @engagement_index = EngagementIndexPage.new @driver
    @engagement_index_url = 'https://ucberkeley.beta.instructure.com/courses/1354856/external_tools/43960'
  end

    students.each do |student|

      it 'earns "Submit an Assignment" points on the Engagement Index' do
        expect(@engagement_index.user_score_updated?(@driver, @engagement_index_url, student, '20')).to be true
      end

      it 'appears in the Asset Library' do
        @asset_library.load_page(@driver, @asset_library_url)
        @asset_library.advanced_search(@driver, nil, assignment_name, student['fullName'], student['submissionType'])
        @asset_library.wait_until(timeout) { @asset_library.list_view_asset_elements.length == 1 }
        @asset_library.wait_until(timeout) { @asset_library.list_view_asset_owner_name_elements[0].text.include? student['fullName'] }
        asset_id = @asset_library.get_first_asset_id
        @asset_library.click_asset_link(asset_id)
        @asset_library.wait_until(timeout) { @asset_library.detail_view_asset_owner_link == student['fullName'] }
        @asset_library.wait_until(timeout) { @asset_library.detail_view_asset_desc == 'No description' }
        @asset_library.wait_until(timeout) { @asset_library.detail_view_asset_category_elements[0].text == assignment_name }
        if student['submissionType'] == 'Link'
          @asset_library.wait_until(timeout) { @asset_library.detail_view_asset_source_element.text == student['testData'] }
        else
          @asset_library.wait_until(timeout) { @asset_library.detail_view_asset_nil_source == 'No source' }
        end
      end

    end

  after(:all) { @driver.quit }

end
