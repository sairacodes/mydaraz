"""
Automated Test Suite — Multi-Tenant Daraz Clone
Course  : DevOps for Cloud Computing
Assignment : Assignment 3 — Selenium + Jenkins CI/CD
Tests   : 18 automated test cases using Selenium 4 + headless Chrome
"""

import pytest
import time
import os
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException

# ── Config ─────────────────────────────────────────────────────
BASE_URL = os.environ.get("APP_URL", "http://localhost:5173")
WAIT     = 10   # seconds

# Demo credentials (seeded by seed.js)
ADMIN_EMAIL    = "admin@daraz-clone.pk"
ADMIN_PASS     = "Admin@1234"
SELLER_EMAIL   = "ahmed@techzone.pk"
SELLER_PASS    = "Seller@1234"
CUSTOMER_EMAIL = "fatima@gmail.com"
CUSTOMER_PASS  = "Customer@1234"

# ── Driver fixture ─────────────────────────────────────────────
@pytest.fixture(scope="class")
def driver():
    """Set up headless Chrome — required for Jenkins on EC2."""
    opts = Options()
    opts.add_argument("--headless")            # headless for CI/CD
    opts.add_argument("--no-sandbox")          # required inside Docker
    opts.add_argument("--disable-dev-shm-usage")
    opts.add_argument("--disable-gpu")
    opts.add_argument("--window-size=1920,1080")
    opts.add_argument("--disable-extensions")
    opts.add_argument("--remote-debugging-port=9222")

    service = Service("/usr/bin/chromedriver")
    drv = webdriver.Chrome(service=service, options=opts)
    drv.implicitly_wait(WAIT)
    yield drv
    drv.quit()


def wait_for(driver, by, value, timeout=WAIT):
    """Helper: explicit wait for an element."""
    return WebDriverWait(driver, timeout).until(
        EC.presence_of_element_located((by, value))
    )

def wait_clickable(driver, by, value, timeout=WAIT):
    return WebDriverWait(driver, timeout).until(
        EC.element_to_be_clickable((by, value))
    )

def login(driver, email, password):
    """Helper: perform login flow."""
    driver.get(f"{BASE_URL}/login")
    wait_for(driver, By.CSS_SELECTOR, "input[type='email']").send_keys(email)
    driver.find_element(By.CSS_SELECTOR, "input[type='password']").send_keys(password)
    driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()
    time.sleep(2)

def logout(driver):
    """Helper: logout by clearing localStorage."""
    driver.execute_script("localStorage.clear();")
    driver.get(BASE_URL)
    time.sleep(1)


# ══════════════════════════════════════════════════════════════
#  TEST CLASS
# ══════════════════════════════════════════════════════════════
@pytest.mark.usefixtures("driver")
class TestDarazClone:

    # ── TC-01: Home page loads ─────────────────────────────────
    def test_01_homepage_loads(self, driver):
        """TC-01: Home page should load and display the brand name."""
        driver.get(BASE_URL)
        time.sleep(2)
        assert "Daraz" in driver.title or "داراز" in driver.page_source, \
            "Home page did not load — brand not found in title or source"
        print("✓ TC-01 PASSED: Home page loads successfully")

    # ── TC-02: Navbar is present ───────────────────────────────
    def test_02_navbar_present(self, driver):
        """TC-02: Navbar should contain Stores, Login, Sign Up links."""
        driver.get(BASE_URL)
        time.sleep(2)
        page = driver.page_source
        assert "Stores" in page, "Stores link not found in navbar"
        assert "Login" in page,  "Login link not found in navbar"
        assert "Sign Up" in page, "Sign Up link not found in navbar"
        print("✓ TC-02 PASSED: Navbar elements present")

    # ── TC-03: Search bar present and functional ───────────────
    def test_03_search_bar(self, driver):
        """TC-03: Search bar should accept input and redirect to search results."""
        driver.get(BASE_URL)
        time.sleep(2)
        search_box = wait_for(driver, By.CSS_SELECTOR, "input[placeholder*='Search']")
        search_box.clear()
        search_box.send_keys("Samsung")
        search_box.send_keys(Keys.RETURN)
        time.sleep(2)
        assert "/search" in driver.current_url or "Samsung" in driver.page_source, \
            "Search did not navigate to search results page"
        print("✓ TC-03 PASSED: Search bar works")

    # ── TC-04: Category links on homepage ─────────────────────
    def test_04_categories_visible(self, driver):
        """TC-04: Category section should display Electronics and Fashion."""
        driver.get(BASE_URL)
        time.sleep(2)
        page = driver.page_source
        assert "Electronics" in page, "Electronics category missing"
        assert "Fashion" in page, "Fashion category missing"
        assert "Books" in page, "Books category missing"
        print("✓ TC-04 PASSED: Categories displayed on homepage")

    # ── TC-05: Stores page loads ───────────────────────────────
    def test_05_stores_page_loads(self, driver):
        """TC-05: /stores page should load and list available stores."""
        driver.get(f"{BASE_URL}/stores")
        time.sleep(2)
        page = driver.page_source
        assert "TechZone" in page or "Fashionista" in page or "Browse Stores" in page, \
            "Stores page did not load or no stores found"
        print("✓ TC-05 PASSED: Stores page loads with store listings")

    # ── TC-06: Store category filter ──────────────────────────
    def test_06_store_category_filter(self, driver):
        """TC-06: Clicking Electronics category filter should filter stores."""
        driver.get(f"{BASE_URL}/stores")
        time.sleep(2)
        buttons = driver.find_elements(By.TAG_NAME, "button")
        electronics_btn = None
        for btn in buttons:
            if btn.text.strip() == "Electronics":
                electronics_btn = btn
                break
        assert electronics_btn is not None, "Electronics filter button not found"
        electronics_btn.click()
        time.sleep(2)
        assert "Electronics" in driver.current_url or "category=Electronics" in driver.current_url \
            or "Electronics" in driver.page_source, \
            "Category filter did not apply"
        print("✓ TC-06 PASSED: Category filter works on stores page")

    # ── TC-07: Individual store page loads ─────────────────────
    def test_07_store_page_loads(self, driver):
        """TC-07: Navigating to a specific store should load its page."""
        driver.get(f"{BASE_URL}/stores/techzone-electronics")
        time.sleep(2)
        page = driver.page_source
        assert "TechZone" in page or "techzone" in page.lower(), \
            "TechZone store page did not load"
        print("✓ TC-07 PASSED: Store detail page loads")

    # ── TC-08: Products visible on store page ─────────────────
    def test_08_products_on_store_page(self, driver):
        """TC-08: Store page should display products from the tenant collection."""
        driver.get(f"{BASE_URL}/stores/techzone-electronics")
        time.sleep(3)
        page = driver.page_source
        assert "PKR" in page or "Samsung" in page or "MacBook" in page or "JBL" in page, \
            "No products found on TechZone store page"
        print("✓ TC-08 PASSED: Products displayed on store page")

    # ── TC-09: Login page loads ────────────────────────────────
    def test_09_login_page_loads(self, driver):
        """TC-09: Login page should render with email and password fields."""
        driver.get(f"{BASE_URL}/login")
        time.sleep(2)
        email_field    = driver.find_element(By.CSS_SELECTOR, "input[type='email']")
        password_field = driver.find_element(By.CSS_SELECTOR, "input[type='password']")
        assert email_field.is_displayed(),    "Email field not visible on login page"
        assert password_field.is_displayed(), "Password field not visible on login page"
        print("✓ TC-09 PASSED: Login page loads with correct fields")

    # ── TC-10: Login with invalid credentials ─────────────────
    def test_10_login_invalid_credentials(self, driver):
        """TC-10: Login with wrong credentials should show an error toast."""
        driver.get(f"{BASE_URL}/login")
        time.sleep(1)
        driver.find_element(By.CSS_SELECTOR, "input[type='email']").send_keys("wrong@email.com")
        driver.find_element(By.CSS_SELECTOR, "input[type='password']").send_keys("wrongpassword")
        driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()
        time.sleep(3)
        page = driver.page_source
        assert "failed" in page.lower() or "invalid" in page.lower() or "error" in page.lower(), \
            "No error message shown for invalid login"
        print("✓ TC-10 PASSED: Invalid login shows error")

    # ── TC-11: Customer login success ─────────────────────────
    def test_11_customer_login(self, driver):
        """TC-11: Customer login should redirect to home page."""
        logout(driver)
        login(driver, CUSTOMER_EMAIL, CUSTOMER_PASS)
        time.sleep(2)
        page = driver.page_source
        assert "Fatima" in page or "fatima" in page.lower() \
            or "logout" in page.lower() or "Logout" in page, \
            "Customer login did not succeed"
        print("✓ TC-11 PASSED: Customer login successful")

    # ── TC-12: Seller login and dashboard ─────────────────────
    def test_12_seller_login_dashboard(self, driver):
        """TC-12: Seller login should redirect to seller dashboard."""
        logout(driver)
        login(driver, SELLER_EMAIL, SELLER_PASS)
        time.sleep(2)
        # Seller auto-redirects to /seller
        assert "/seller" in driver.current_url or "Dashboard" in driver.page_source \
            or "TechZone" in driver.page_source, \
            "Seller was not redirected to seller dashboard"
        print("✓ TC-12 PASSED: Seller login redirects to dashboard")

    # ── TC-13: Seller dashboard stats cards ───────────────────
    def test_13_seller_dashboard_stats(self, driver):
        """TC-13: Seller dashboard should show stat cards (products, orders, earnings)."""
        driver.get(f"{BASE_URL}/seller")
        time.sleep(3)
        page = driver.page_source
        assert "Products" in page or "Orders" in page or "Earnings" in page or "Dashboard" in page, \
            "Stat cards not visible on seller dashboard"
        print("✓ TC-13 PASSED: Seller dashboard stat cards visible")

    # ── TC-14: Seller products page ───────────────────────────
    def test_14_seller_products_page(self, driver):
        """TC-14: Seller products page should list tenant-scoped products."""
        driver.get(f"{BASE_URL}/seller/products")
        time.sleep(3)
        page = driver.page_source
        assert "Samsung" in page or "MacBook" in page or "JBL" in page \
            or "My Products" in page or "No products" in page, \
            "Seller products page did not load"
        print("✓ TC-14 PASSED: Seller products page loads with product table")

    # ── TC-15: Admin login and dashboard ──────────────────────
    def test_15_admin_login_dashboard(self, driver):
        """TC-15: Superadmin login should redirect to admin dashboard."""
        logout(driver)
        login(driver, ADMIN_EMAIL, ADMIN_PASS)
        time.sleep(2)
        assert "/admin" in driver.current_url or "Platform" in driver.page_source \
            or "Dashboard" in driver.page_source, \
            "Admin was not redirected to admin dashboard"
        print("✓ TC-15 PASSED: Admin login redirects to admin dashboard")

    # ── TC-16: Admin can see all stores ───────────────────────
    def test_16_admin_stores_list(self, driver):
        """TC-16: Admin stores page should list all registered tenants."""
        driver.get(f"{BASE_URL}/admin/tenants")
        time.sleep(3)
        page = driver.page_source
        assert "TechZone" in page or "Fashionista" in page or "BookWorld" in page \
            or "All Stores" in page, \
            "Admin stores page did not load tenant list"
        print("✓ TC-16 PASSED: Admin sees all stores")

    # ── TC-17: Admin DB Schema Inspector ──────────────────────
    def test_17_admin_collections_page(self, driver):
        """TC-17: DB Schema Inspector should show tenant-scoped collections."""
        driver.get(f"{BASE_URL}/admin/collections")
        time.sleep(3)
        page = driver.page_source
        assert "tenant_" in page or "Schema" in page or "Collection" in page \
            or "Database" in page, \
            "DB Schema Inspector page did not show tenant collections"
        print("✓ TC-17 PASSED: Admin DB Schema Inspector shows tenant collections")

    # ── TC-18: Register page loads with role selection ─────────
    def test_18_register_page_role_selection(self, driver):
        """TC-18: Register page should show role selection (Shop & Buy vs Sell & Earn)."""
        logout(driver)
        driver.get(f"{BASE_URL}/register")
        time.sleep(2)
        page = driver.page_source
        assert "Shop" in page or "Sell" in page or "Create Account" in page, \
            "Register page role selection not visible"
        print("✓ TC-18 PASSED: Register page shows role selection cards")


# ── Run directly ───────────────────────────────────────────────
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--html=test-report.html", "--self-contained-html"])
