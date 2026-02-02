from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from pages.base_page import BasePage
import time

class MonthlyReportPage(BasePage):
    # Locators template
    ACCORDION_BTN = "//button[contains(normalize-space(), '{}')]"
    CHECKBOX_HOUVE_PESCA = "input[name='informesMensais.{}.houvePesca'][value='true']"
    CHECKBOX_NAO_HOUVE_PESCA = "input[name='informesMensais.{}.houvePesca'][value='false']"
    INPUT_DIAS_TRABALHADOS = "input[name='informesMensais.{}.diasTrabalhados']"
    
    MESES_MAPPING = {
        "Janeiro": 0, "Fevereiro": 1, "Março": 2, "Abril": 3, "Maio": 4, "Junho": 5,
        "Julho": 6, "Agosto": 7, "Setembro": 8, "Outubro": 9, "Novembro": 10, "Dezembro": 11
    }

    def fill_month(self, month_name, data_row, is_defeso):
        idx = self.MESES_MAPPING.get(month_name)
        if idx is None:
            self.error(f"Invalid month: {month_name}", "FILL_MONTH_ERROR")
            return False

        self.log(f"Filling data for {month_name}", "FILL_MONTH", {"is_defeso": is_defeso})

        try:
            # 1. Open Accordion
            btn_xpath = self.ACCORDION_BTN.format(month_name)
            btn = self.find((By.XPATH, btn_xpath))
            self.scroll_into_view(btn)
            
            if "collapsed" in btn.get_attribute("class"):
                self.js_click(btn)
                time.sleep(0.5) # Animation wait

            # 2. Houve Pesca?
            if is_defeso:
                 # Logic for Defeso (No Fishing)
                 chk_locator = (By.CSS_SELECTOR, self.CHECKBOX_NAO_HOUVE_PESCA.format(idx))
                 self.js_click(self.find(chk_locator))
                 
                 # Justification (Ex: 1 - Defeso)
                 just_locator = (By.CSS_SELECTOR, f"input[name='informesMensais.{idx}.justificativasNaoDeclaracao'][value='1']")
                 if self.exists(just_locator):
                     chk_just = self.find(just_locator)
                     if not chk_just.is_selected():
                         self.js_click(chk_just)
            else:
                # Logic for Fishing
                chk_locator = (By.CSS_SELECTOR, self.CHECKBOX_HOUVE_PESCA.format(idx))
                self.js_click(self.find(chk_locator))
                
                # Fill Days
                dias_locator = (By.NAME, f"informesMensais.{idx}.diasTrabalhados")
                self.type_text(dias_locator, str(data_row.get('DIAS', 20)))

                # TODO: Implement filling of location, equipment, species (similar logic to old script but cleaner)
                # Keep it simple for this V1 refactor verify
                self.fill_production_details(idx, data_row)

            # 3. Close Accordion
            if "collapsed" not in btn.get_attribute("class"):
                self.js_click(btn)
                
            return True

        except Exception as e:
            self.error(f"Error filling {month_name}: {e}", "FILL_MONTH_EXCEPTION")
            return False

    def fill_production_details(self, idx, data_row):
        # Placeholder for complex table filling
        # This would iterate over the species inputs
        pass
