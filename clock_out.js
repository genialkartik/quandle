const {
  createDriver,
  login,
  goToOverview,
  clockOut,
  shouldSkipToday,
} = require("./qandle");

const MAX_DELAY_MIN = 8;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function getISTNow() {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
  );
}

async function main() {
  const now = getISTNow();
  if (shouldSkipToday(now)) return;

  // Wait until (CLOCK_OUT_END_AT - 10 min) if cron fired early
  const endAt = process.env.CLOCK_OUT_END_AT;
  if (endAt) {
    const [h, m] = endAt.split(":").map(Number);
    const target = new Date(now);
    target.setHours(h, m, 0, 0);
    target.setMinutes(target.getMinutes() - MAX_DELAY_MIN - 2);
    const waitMs = target - now;
    if (waitMs > 0 && waitMs <= 30 * 60 * 1000) {
      console.log(
        `Waiting ${(waitMs / 60000).toFixed(1)} min until target clock-out window...`,
      );
      await sleep(waitMs);
    }
  }

  const delayMs = Math.floor(Math.random() * MAX_DELAY_MIN * 60 * 1000);
  console.log(
    `Random delay: ${(delayMs / 60000).toFixed(1)} min before clocking out...`,
  );
  await sleep(delayMs);

  const driver = await createDriver();
  try {
    await login(driver);
    await goToOverview(driver);
    await clockOut(driver);
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
