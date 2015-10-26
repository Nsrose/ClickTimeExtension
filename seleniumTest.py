# from selenium import webdriver
# from selenium.webdriver.common.keys import Keys

# driver = webdriver.Chrome()
# driver.get("http://www.python.org")
# assert "Python" in driver.title
# elem = driver.find_element_by_name("q")
# elem.send_keys("pycon")
# elem.send_keys(Keys.RETURN)
# assert "No results found." not in driver.page_source
# driver.close()


import time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

chop = webdriver.ChromeOptions()
chop.add_extension('C:\ClickTimeExtension.crx')
chop.add_argument('--load_extension=C:\ClickTimeExtension.crx')



driver = webdriver.Chrome(chrome_options = chop)  # Optional argument, if not specified will search path.
# driver.get('http://www.google.com/xhtml');
driver.get('chrome-extension://eheoaemodnkcjibmcpopkchdjgmiflgp/login.html');
time.sleep(10) # Let the user actually see something!
search_box = driver.find_element_by_name('q')
search_box.send_keys('ChromeDriver')
search_box.submit()
time.sleep(10) # Let the user actually see something!
driver.quit()