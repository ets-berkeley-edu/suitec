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
    @course_id = @canvas.create_complete_test_course(test_id, WebDriverUtils.mapped_test_users)
    @canvas.masquerade_as(teacher, @course_id)
    @canvas.load_course_site @course_id
    @assignment_url = @canvas.create_assignment(@course_id, assignment_name)
    @canvas.stop_masquerading
    @asset_library = AssetLibraryPage.new @driver
    @asset_library_url = @canvas.click_asset_library_link @driver
    @engagement_index = EngagementIndexPage.new @driver
    @engagement_index_url = @canvas.click_engagement_index_link @driver

    students.each do |student|
      @canvas.masquerade_as(student, @course_id)
      @canvas.load_course_site @course_id
      @canvas.submit_assignment(@assignment_url, student)
      @canvas.stop_masquerading
    end
  end

  describe 'JPEG file' do

    let(:student) { students.find { |user| user['submission'] == 'JPEG' } }

    it 'earns "Submit an Assignment to the Gallery" points on the Engagement Index' do
      expect(@engagement_index.user_score_updated?(@driver, @engagement_index_url, student, '20')).to be true
    end

    it 'shows "submit_assignment" activity on the CSV export' do
      scores = @engagement_index.download_csv(@driver, @engagement_index_url)
      expect(scores).to include("#{student['fullName']}, submit_assignment, 20")
    end

    it 'appears in the Asset Library' do
      @asset_library.load_page(@driver, @asset_library_url)
      @asset_library.advanced_search(nil, nil, student['fullName'], 'File')
      @asset_library.wait_until(timeout) { @asset_library.gallery_asset_elements.length == 1 }
      @asset_library.wait_until(timeout) { @asset_library.gallery_asset_owner_name_elements[0] == student['fullName'] }
      # TODO: verify asset title, link, source, description, category
    end
  end

  describe 'animated GIF file' do

    let(:student) { students.find { |user| user['submission'] == 'GIF' } }

    it 'earns "Submit an Assignment to the Gallery" points on the Engagement Index' do
      expect(@engagement_index.user_score_updated?(@driver, @engagement_index_url, student, '20')).to be true
    end

    it 'shows "submit_assignment" activity on the CSV export' do
      scores = @engagement_index.download_csv(@driver, @engagement_index_url)
      expect(scores).to include("#{student['fullName']}, submit_assignment, 20")
    end

    it 'appears in the Asset Library' do
      @asset_library.load_page(@driver, @asset_library_url)
      @asset_library.advanced_search(nil, nil, student['fullName'], 'File')
      @asset_library.wait_until(timeout) { @asset_library.gallery_asset_elements.length == 1 }
      @asset_library.wait_until(timeout) { @asset_library.gallery_asset_owner_name_elements[0] == student['fullName'] }
      # TODO: verify asset title, link, source, description, category
    end
  end

  describe 'PNG file' do

    let(:student) { students.find { |user| user['submission'] == 'PNG' } }

    it 'earns "Submit an Assignment to the Gallery" points on the Engagement Index' do
      expect(@engagement_index.user_score_updated?(@driver, @engagement_index_url, student, '20')).to be true
    end

    it 'shows "submit_assignment" activity on the CSV export' do
      scores = @engagement_index.download_csv(@driver, @engagement_index_url)
      expect(scores).to include("#{student['fullName']}, submit_assignment, 20")
    end

    it 'appears in the Asset Library' do
      @asset_library.load_page(@driver, @asset_library_url)
      @asset_library.advanced_search(nil, nil, student['fullName'], 'File')
      @asset_library.wait_until(timeout) { @asset_library.gallery_asset_elements.length == 1 }
      @asset_library.wait_until(timeout) { @asset_library.gallery_asset_owner_name_elements[0] == student['fullName'] }
      # TODO: verify asset title, link, source, description, category
    end
  end

  describe 'SVG file' do

    let(:student) { students.find { |user| user['submission'] == 'SVG' } }

    it 'earns "Submit an Assignment to the Gallery" points on the Engagement Index' do
      expect(@engagement_index.user_score_updated?(@driver, @engagement_index_url, student, '20')).to be true
    end

    it 'shows "submit_assignment" activity on the CSV export' do
      scores = @engagement_index.download_csv(@driver, @engagement_index_url)
      expect(scores).to include("#{student['fullName']}, submit_assignment, 20")
    end

    it 'appears in the Asset Library' do
      @asset_library.load_page(@driver, @asset_library_url)
      @asset_library.advanced_search(nil, nil, student['fullName'], 'File')
      @asset_library.wait_until(timeout) { @asset_library.gallery_asset_elements.length == 1 }
      @asset_library.wait_until(timeout) { @asset_library.gallery_asset_owner_name_elements[0] == student['fullName'] }
      # TODO: verify asset title, link, source, description, category
    end
  end

  describe 'BMP file' do

    let(:student) { students.find { |user| user['submission'] == 'BMP' } }

    it 'earns "Submit an Assignment to the Gallery" points on the Engagement Index' do
      expect(@engagement_index.user_score_updated?(@driver, @engagement_index_url, student, '20')).to be true
    end

    it 'shows "submit_assignment" activity on the CSV export' do
      scores = @engagement_index.download_csv(@driver, @engagement_index_url)
      expect(scores).to include("#{student['fullName']}, submit_assignment, 20")
    end

    it 'appears in the Asset Library' do
      @asset_library.load_page(@driver, @asset_library_url)
      @asset_library.advanced_search(nil, nil, student['fullName'], 'File')
      @asset_library.wait_until(timeout) { @asset_library.gallery_asset_elements.length == 1 }
      @asset_library.wait_until(timeout) { @asset_library.gallery_asset_owner_name_elements[0] == student['fullName'] }
      # TODO: verify asset title, link, source, description, category
    end
  end

  describe 'very large image file' do

    let(:student) { students.find { |user| user['submission'] == 'BIG' } }

    it 'earns "Submit an Assignment to the Gallery" points on the Engagement Index' do
      expect(@engagement_index.user_score_updated?(@driver, @engagement_index_url, student, '20')).to be true
    end

    it 'shows "submit_assignment" activity on the CSV export' do
      scores = @engagement_index.download_csv(@driver, @engagement_index_url)
      expect(scores).to include("#{student['fullName']}, submit_assignment, 20")
    end

    it 'appears in the Asset Library' do
      @asset_library.load_page(@driver, @asset_library_url)
      @asset_library.advanced_search(nil, nil, student['fullName'], 'File')
      @asset_library.wait_until(timeout) { @asset_library.gallery_asset_elements.length == 1 }
      @asset_library.wait_until(timeout) { @asset_library.gallery_asset_owner_name_elements[0] == student['fullName'] }
      # TODO: verify asset title, link, source, description, category
    end
  end

  describe 'PDF file' do

    let(:student) { students.find { |user| user['submission'] == 'PDF' } }

    it 'earns "Submit an Assignment to the Gallery" points on the Engagement Index' do
      expect(@engagement_index.user_score_updated?(@driver, @engagement_index_url, student, '20')).to be true
    end

    it 'shows "submit_assignment" activity on the CSV export' do
      scores = @engagement_index.download_csv(@driver, @engagement_index_url)
      expect(scores).to include("#{student['fullName']}, submit_assignment, 20")
    end

    it 'appears in the Asset Library' do
      @asset_library.load_page(@driver, @asset_library_url)
      @asset_library.advanced_search(nil, nil, student['fullName'], 'File')
      @asset_library.wait_until(timeout) { @asset_library.gallery_asset_elements.length == 1 }
      @asset_library.wait_until(timeout) { @asset_library.gallery_asset_owner_name_elements[0] == student['fullName'] }
      # TODO: verify asset title, link, source, description, category
    end
  end

  describe 'Word file' do

    let(:student) { students.find { |user| user['submission'] == 'DOC' } }

    it 'earns "Submit an Assignment to the Gallery" points on the Engagement Index' do
      expect(@engagement_index.user_score_updated?(@driver, @engagement_index_url, student, '20')).to be true
    end

    it 'shows "submit_assignment" activity on the CSV export' do
      scores = @engagement_index.download_csv(@driver, @engagement_index_url)
      expect(scores).to include("#{student['fullName']}, submit_assignment, 20")
    end

    it 'appears in the Asset Library' do
      @asset_library.load_page(@driver, @asset_library_url)
      @asset_library.advanced_search(nil, nil, student['fullName'], 'File')
      @asset_library.wait_until(timeout) { @asset_library.gallery_asset_elements.length == 1 }
      @asset_library.wait_until(timeout) { @asset_library.gallery_asset_owner_name_elements[0] == student['fullName'] }
      # TODO: verify asset title, link, source, description, category
    end
  end

  describe 'YouTube video' do

    let(:student) { students.find { |user| user['submission'] == 'YOUTUBE' } }

    it 'earns "Submit an Assignment to the Gallery" points on the Engagement Index' do
      expect(@engagement_index.user_score_updated?(@driver, @engagement_index_url, student, '20')).to be true
    end

    it 'shows "submit_assignment" activity on the CSV export' do
      scores = @engagement_index.download_csv(@driver, @engagement_index_url)
      expect(scores).to include("#{student['fullName']}, submit_assignment, 20")
    end

    it 'appears in the Asset Library' do
      @asset_library.load_page(@driver, @asset_library_url)
      @asset_library.advanced_search(nil, nil, student['fullName'], 'Link')
      @asset_library.wait_until(timeout) { @asset_library.gallery_asset_elements.length == 1 }
      @asset_library.wait_until(timeout) { @asset_library.gallery_asset_owner_name_elements[0] == student['fullName'] }
      # TODO: verify asset title, link, source, description, category
    end
  end

  describe 'Vimeo file' do

    let(:student) { students.find { |user| user['submission'] == 'VIMEO' } }

    it 'earns "Submit an Assignment to the Gallery" points on the Engagement Index' do
      expect(@engagement_index.user_score_updated?(@driver, @engagement_index_url, student, '20')).to be true
    end

    it 'shows "submit_assignment" activity on the CSV export' do
      scores = @engagement_index.download_csv(@driver, @engagement_index_url)
      expect(scores).to include("#{student['fullName']}, submit_assignment, 20")
    end

    it 'appears in the Asset Library' do
      @asset_library.load_page(@driver, @asset_library_url)
      @asset_library.advanced_search(nil, nil, student['fullName'], 'Link')
      @asset_library.wait_until(timeout) { @asset_library.gallery_asset_elements.length == 1 }
      @asset_library.wait_until(timeout) { @asset_library.gallery_asset_owner_name_elements[0] == student['fullName'] }
      # TODO: verify asset title, link, source, description, category
    end
  end

  describe 'non-media website URL' do

    let(:student) { students.find { |user| user['submission'] == 'NEWHIVE' } }

    it 'earns "Submit an Assignment to the Gallery" points on the Engagement Index' do
      expect(@engagement_index.user_score_updated?(@driver, @engagement_index_url, student, '20')).to be true
    end

    it 'shows "submit_assignment" activity on the CSV export' do
      scores = @engagement_index.download_csv(@driver, @engagement_index_url)
      expect(scores).to include("#{student['fullName']}, submit_assignment, 20")
    end

    it 'appears in the Asset Library' do
      @asset_library.load_page(@driver, @asset_library_url)
      @asset_library.advanced_search(nil, nil, student['fullName'], 'Link')
      @asset_library.wait_until(timeout) { @asset_library.gallery_asset_elements.length == 1 }
      @asset_library.wait_until(timeout) { @asset_library.gallery_asset_owner_name_elements[0] == student['fullName'] }
      # TODO: verify asset title, link, source, description, category
    end
  end

# TODO: add tests for other file types if necessary, e.g., media (audio, video)

  after(:all) { @driver.quit }

end
