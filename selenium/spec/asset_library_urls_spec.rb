require_relative 'spec_helper'

describe 'Asset Library URLs' do

  test_id = WebDriverUtils.test_course_name(self)
  test_users = WebDriverUtils.load_test_users
  test_student = test_users['Student 4']

  before(:all) { @driver = WebDriverUtils.driver }

  before(:context) do
    @canvas = CanvasPage.new @driver
    @canvas.load_homepage
    @cal_net= CalNetPage.new @driver
    @cal_net.log_in(WebDriverUtils.admin_username, WebDriverUtils.admin_password)
    @course_id = @canvas.create_complete_test_course(test_id, test_users)
    @canvas.become_user test_student
    @canvas.load_course_site @course_id
    @canvas.accept_login_messages @course_id
    WebDriverUtils.wait_for_page_and_click @canvas.asset_library_link_element
  end

  context 'when uploaded' do

    it 'require that a user add a valid URL'

    it 'require that a user enter a title'

    it 'require that a user enter a description'

    it 'limit a user to X characters for a title'

    it 'limit a user to non-deleted categories only'

    it 'limit a user to X characters for a description'

    it 'allow a user to enter a title'

    it 'allow a user to select a category'

    it 'allow a user to enter a description'

    it 'allow a user to cancel adding a URL'

    it 'allow a user to confirm adding a URL'

  end

  after(:all) { @driver.quit }

end
