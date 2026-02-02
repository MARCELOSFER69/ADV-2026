from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By
from selenium.webdriver.remote.webdriver import WebDriver
from selenium.common.exceptions import TimeoutException, NoSuchElementException
import time

class BasePage:
    def __init__(self, driver: WebDriver, logger=None):
        self.driver = driver
        self.logger = logger
        self.default_timeout = 15

    def open_url(self, url):
        self.log(f"Navigating to {url}", "NAVIGATE")
        self.driver.get(url)

    def find(self, locator, timeout=None):
        timeout = timeout if timeout else self.default_timeout
        return WebDriverWait(self.driver, timeout).until(
            EC.presence_of_element_located(locator)
        )

    def click(self, locator, timeout=None):
        try:
            timeout = timeout if timeout else self.default_timeout
            element = WebDriverWait(self.driver, timeout).until(
                EC.element_to_be_clickable(locator)
            )
            element.click()
        except TimeoutException:
            self.error(f"Failed to click element {locator}", "CLICK_ERROR")
            raise

    def type_text(self, locator, text, timeout=None):
        try:
            timeout = timeout if timeout else self.default_timeout
            element = self.find(locator, timeout)
            element.clear()
            element.send_keys(text)
        except TimeoutException:
            self.error(f"Failed to type text into {locator}", "TYPE_ERROR")
            raise

    def wait_for_visible(self, locator, timeout=None):
        timeout = timeout if timeout else self.default_timeout
        return WebDriverWait(self.driver, timeout).until(
            EC.visibility_of_element_located(locator)
        )
    
    def exists(self, locator, timeout=3):
        try:
            WebDriverWait(self.driver, timeout).until(
                EC.presence_of_element_located(locator)
            )
            return True
        except TimeoutException:
            return False

    def js_click(self, element):
        self.driver.execute_script("arguments[0].click();", element)

    def scroll_into_view(self, element):
        self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", element)

    def log(self, message, step=None):
        if self.logger:
            self.logger.info(message, step)
        else:
            print(f"[INFO] {message}")

    def error(self, message, step=None):
        if self.logger:
            self.logger.error(message, step)
        else:
            print(f"[ERROR] {message}")
