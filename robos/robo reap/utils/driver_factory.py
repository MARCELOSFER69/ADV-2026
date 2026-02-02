import os
import undetected_chromedriver as uc
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.chrome.service import Service

def get_driver(headless=False, profile_dir=None):
    """
    Creates and returns a configured undetected_chromedriver instance.
    Uses webdriver_manager to automatically download the correct driver version.
    """
    options = uc.ChromeOptions()
    
    if profile_dir:
        os.makedirs(profile_dir, exist_ok=True)
        options.add_argument(f"--user-data-dir={profile_dir}")
    
    if headless:
        options.add_argument("--headless")
    
    options.add_argument("--start-maximized")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")
    options.add_argument("--disable-popup-blocking")

    # Use webdriver_manager to get the driver path
    # UC normally handles this, but explicit path helps dependency hell
    try:
        driver_path = ChromeDriverManager().install()
    except Exception as e:
        print(f"Error downloading driver: {e}")
        # Fallback to UC default handling if manager fails
        driver_path = None

    # UC requires version_main if not providing driver_executable_path for auto-match,
    # but providing the executable path from manager is safer.
    
    if driver_path:
        driver = uc.Chrome(options=options, driver_executable_path=driver_path)
    else:
        # Fallback to pure UC
        driver = uc.Chrome(options=options)
        
    return driver
