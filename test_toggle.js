const {
  createDriver,
  login,
  goToOverview,
  clockIn,
  clockOut,
  detectState,
} = require("./qandle");

const INTERVAL_MS = 30_000; // 30 seconds
const DURATION_MS = 5 * 60_000; // 5 minutes

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const driver = await createDriver();

  try {
    await login(driver);
    await goToOverview(driver);

    const startTime = Date.now();
    let cycle = 1;

    while (Date.now() - startTime < DURATION_MS) {
      // Refresh the overview to get the latest button state
      await goToOverview(driver);
      await driver.sleep(2000);

      const state = await detectState(driver);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
      console.log(
        `\n[Cycle ${cycle}] ${elapsed}s elapsed | Current state: ${state}`,
      );

      if (state === "clocked-out") {
        await clockIn(driver);
      } else {
        await clockOut(driver);
      }

      cycle++;

      // Wait the remaining interval time
      const waited = Date.now() - startTime;
      const nextTick = cycle * INTERVAL_MS;
      const delay = Math.max(0, nextTick - waited);
      if (Date.now() + delay - startTime >= DURATION_MS) break;
      console.log(`Waiting ${(delay / 1000).toFixed(0)}s until next toggle...`);
      await sleep(delay);
    }

    console.log("\n=== Test complete. 5-minute run finished. ===");
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
