require_relative 'spec_helper'

describe 'Canvas course sites' do

  test_id = WebDriverUtils.test_course_name(self)

  before(:all) do
    @driver = WebDriverUtils.driver
  end

  after(:all) do
    @driver.quit
  end

  it 'can be created with users and an asset library' do
    canvas = CanvasPage.new(@driver)
    canvas.load_homepage(@driver)
    cal_net= CalNetPage.new(@driver)
    cal_net.log_in(WebDriverUtils.admin_username, WebDriverUtils.admin_password)
    canvas.create_complete_test_course(@driver, test_id)
  end

end
