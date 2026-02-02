from selenium.webdriver.common.by import By
from pages.base_page import BasePage

class DashboardPage(BasePage):
    # Locators
    LINK_REAP = (By.XPATH, "//a[contains(text(), 'REAP')]")
    LINK_NOVA_DECLARACAO = (By.XPATH, "//a[contains(text(), 'Nova Declaração')]")
    
    def navigate_to_reap(self):
        self.log("Navigating to REAP system", "NAV_REAP")
        try:
            # Assuming we are on the main portal, find the REAP Access
            # This logic needs to align with the actual portal structure
            # If direct URL is better, use open_url
            if self.exists(self.LINK_REAP):
                self.click(self.LINK_REAP)
            else:
                 # Fallback direct navigation if link not found (Robustness)
                 self.open_url("https://sistemas.agricultura.gov.br/reap")
            
            return True
        except Exception as e:
            self.error(f"Failed to navigate to REAP: {e}", "NAV_REAP_ERROR")
            return False

    def start_new_declaration(self):
        self.log("Starting new declaration", "NEW_DECLARATION")
        try:
            self.click(self.LINK_NOVA_DECLARACAO)
            return True
        except Exception as e:
            self.error(f"Failed to click New Declaration: {e}", "NEW_DECL_ERROR")
            return False
