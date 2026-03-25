require("dotenv").config();
const { Builder, By, until } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");

const QANDLE_URL = "https://creospan.qandle.com/";
const DASHBOARD_URL = "https://creospan.qandle.com/dashboard";
const TIMEOUT = 20_000;

function isCI() {
  return process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true";
}

function createDriver(headless) {
  if (headless === undefined) headless = isCI();
  const options = new chrome.Options();
  if (headless) options.addArguments("--headless=new");
  options.addArguments(
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--window-size=1920,1080",
  );
  return new Builder().forBrowser("chrome").setChromeOptions(options).build();
}

function getHolidays() {
  const raw = process.env.HOLIDAYS || "";
  return raw
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean);
}

function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function isHoliday(date) {
  const holidays = getHolidays();
  const fmt = date.toISOString().slice(0, 10); // YYYY-MM-DD
  // Also check DD-MM-YYYY and DD/MM/YYYY formats
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  const altFmt1 = `${dd}-${mm}-${yyyy}`;
  const altFmt2 = `${dd}/${mm}/${yyyy}`;
  return holidays.some((h) => h === fmt || h === altFmt1 || h === altFmt2);
}

function shouldSkipToday(date) {
  if (isWeekend(date)) {
    console.log(
      `Skipping — today is ${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getDay()]} (weekend).`,
    );
    return true;
  }
  if (isHoliday(date)) {
    console.log(
      `Skipping — today (${date.toISOString().slice(0, 10)}) is a holiday.`,
    );
    return true;
  }
  return false;
}

async function login(driver) {
  const email = process.env.QANDLE_EMAIL;
  const password = process.env.QANDLE_PASSWORD;

  if (!email || !password) {
    throw new Error("Set QANDLE_EMAIL and QANDLE_PASSWORD in your .env file.");
  }

  console.log("Opening login page...");
  await driver.get(QANDLE_URL);

  const workEmailLabel = await driver.wait(
    until.elementLocated(By.css('label[for="login-via-work-email"]')),
    TIMEOUT,
  );
  await workEmailLabel.click();
  console.log("Selected Work Email radio button.");

  const emailInput = await driver.wait(
    until.elementLocated(By.id("login-email")),
    TIMEOUT,
  );
  await emailInput.clear();
  await emailInput.sendKeys(email);
  console.log("Entered email.");

  const passwordInput = await driver.wait(
    until.elementLocated(By.id("login-password")),
    TIMEOUT,
  );
  await passwordInput.clear();
  await passwordInput.sendKeys(password);
  console.log("Entered password.");

  const signInBtn = await driver.wait(
    until.elementLocated(By.id("signInSubmit")),
    TIMEOUT,
  );
  await signInBtn.click();
  console.log("Clicked Sign In. Waiting for dashboard...");

  await driver.wait(until.urlContains("/dashboard"), TIMEOUT);
  console.log("Logged in successfully.");
}

async function goToOverview(driver) {
  await driver.get(DASHBOARD_URL);
  await driver.wait(until.elementLocated(By.css("h2.ds-overview")), TIMEOUT);
  console.log("Overview section loaded.");
}

async function clockIn(driver) {
  const btn = await driver.wait(
    until.elementLocated(
      By.xpath(
        '//button[contains(@class,"lmbtn") and contains(@class,"bg-blue-500") and contains(.,"Clock In")]',
      ),
    ),
    TIMEOUT,
  );
  await driver.wait(until.elementIsVisible(btn), TIMEOUT);
  await btn.click();
  console.log("Clocked IN successfully!");
}

async function clockOut(driver) {
  const btn = await driver.wait(
    until.elementLocated(
      By.xpath(
        '//button[contains(@class,"lmbtn") and contains(@class,"bg-red-500") and contains(.,"Clock Out")]',
      ),
    ),
    TIMEOUT,
  );
  await driver.wait(until.elementIsVisible(btn), TIMEOUT);
  await btn.click();
  console.log("Clicked Clock Out button. Waiting for confirmation modal...");

  // Wait for the confirmation modal to appear
  const modal = await driver.wait(
    until.elementLocated(By.css('.ant-modal-wrap .ant-modal[role="dialog"]')),
    TIMEOUT,
  );
  await driver.wait(until.elementIsVisible(modal), TIMEOUT);
  console.log("Confirmation modal appeared.");

  // Click the "Yes" button to confirm clock out
  const yesBtn = await modal.findElement(
    By.xpath('.//button[contains(@class,"ant-btn") and .//span[text()="Yes"]]'),
  );
  await driver.wait(until.elementIsVisible(yesBtn), TIMEOUT);
  await yesBtn.click();
  console.log("Confirmed clock out. Clocked OUT successfully!");
}

async function detectState(driver) {
  // Returns "clocked-out" if the Clock In button is present,
  //         "clocked-in"  if the Clock Out button is present.
  const clockInButtons = await driver.findElements(
    By.xpath(
      '//button[contains(@class,"lmbtn") and contains(@class,"bg-blue-500") and contains(.,"Clock In")]',
    ),
  );
  if (clockInButtons.length > 0) return "clocked-out";
  return "clocked-in";
}

module.exports = {
  createDriver,
  login,
  goToOverview,
  clockIn,
  clockOut,
  detectState,
  shouldSkipToday,
  isWeekend,
  isHoliday,
  TIMEOUT,
};
