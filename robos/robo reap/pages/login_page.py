from selenium.webdriver.common.by import By
from pages.base_page import BasePage
import time

class LoginPage(BasePage):
    URL = "https://sistemas.agricultura.gov.br/vitrine/entrar"
    
    # Locators
    BTN_GOV_BR = (By.XPATH, "//button[contains(text(), 'Entrar com gov.br')]")
    INPUT_CPF = (By.ID, "accountId")
    BTN_CONTINUAR_CPF = (By.XPATH, "//button[normalize-space()='Continuar']")
    INPUT_SENHA = (By.ID, "password")
    BTN_ENTRAR = (By.ID, "submit-button")
    
    def login(self, cpf, senha):
        self.log(f"Starting login for CPF {cpf}", "LOGIN_START")
        
        # Navigate to Gov.br
        self.open_url(self.URL)
        
        # Click Gov.br button
        if self.exists(self.BTN_GOV_BR):
            self.click(self.BTN_GOV_BR)
            
        # Fill CPF
        try:
            self.type_text(self.INPUT_CPF, cpf)
            self.click(self.BTN_CONTINUAR_CPF)
        except Exception as e:
            self.error(f"Error entering CPF: {e}", "LOGIN_CPF_ERROR")
            return False
            
        # Fill Password
        try:
            self.wait_for_visible(self.INPUT_SENHA)
            self.type_text(self.INPUT_SENHA, senha)
            self.click(self.BTN_ENTRAR)
        except Exception as e:
            self.error(f"Error entering password: {e}", "LOGIN_PWD_ERROR")
            return False
            
        # Check for success (simple check, refine based on actual success screen)    
        # Ideally, wait for Dashboard element
        time.sleep(3) # Short wait for redirect
        self.log("Login submitted", "LOGIN_SUBMITTED")
        return True
