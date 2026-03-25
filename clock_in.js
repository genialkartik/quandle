const {
  createDriver,
  login,
  goToOverview,
  clockIn,
  shouldSkipToday,
} = require("./qandle");

const MAX_DELAY_MIN = 8;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const now = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
  );
  if (shouldSkipToday(now)) return;

  const delayMs = Math.floor(Math.random() * MAX_DELAY_MIN * 60 * 1000);
  console.log(
    `Random delay: ${(delayMs / 60000).toFixed(1)} min before clocking in...`,
  );
  await sleep(delayMs);

  const driver = await createDriver();
  try {
    await login(driver);
    await goToOverview(driver);
    await clockIn(driver);
    await driver.sleep(2000);
  } catch (err) {
    console.error("Error:", err.message);
    const screenshot = await driver.takeScreenshot();
    require("fs").writeFileSync("error_screenshot.png", screenshot, "base64");
    console.log("Screenshot saved as error_screenshot.png");
  } finally {
    await driver.quit();
  }
}

main();
