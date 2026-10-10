"use strict";

const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: true, ignoreDefaultArgs:["--hide-scrollbars"] });
  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.addInitScript(() => localStorage.setItem("drift-bastion-save-v2", JSON.stringify({
      version: 9, fragments: 100, settings: { muted: true }, training: { completed: true }
    })));
    const gamePath = path.resolve(process.argv[2] || "outputs/Drift_Bastion_Playtest.html");
    await page.goto(pathToFileURL(gamePath).href);
    await page.locator("#hangarMenuButton").click();
    await page.locator("#hangarWeaponTab").click();
    assert.equal(await page.locator("#modulePreviewDialog, #buildModulePreview").count(), 0);

    await page.locator('#weaponPicker [data-module="scatter"]').click();
    assert.match(await page.locator("#hangarModuleDetails").innerText(), /Scatter Array/i);
    await page.screenshot({ path: path.join(path.dirname(gamePath), "hangar-module-details.png") });
    assert.equal(await page.locator(".armory-pager, #armoryPagePrevious, #armoryPageNext, #armoryPageCount").count(), 0);
    const modules = await page.locator("#weaponPicker .pick-button").evaluateAll(cards => cards.map(card => card.dataset.module));
    for (const type of modules) {
      const layout = await page.evaluate(moduleType => {
        document.querySelector(`#weaponPicker [data-module="${moduleType}"]`).click();
        const picker = document.getElementById("weaponPicker"), detail = document.getElementById("hangarModuleDetails");
        const description = detail.querySelector(".armory-detail-description").getBoundingClientRect();
        const actions = detail.querySelector(".armory-detail-actions").getBoundingClientRect();
        return { pickerBar:getComputedStyle(picker).scrollbarWidth, detailOverflow:getComputedStyle(detail).overflowY,
          catalogScrollable:picker.scrollHeight>picker.clientHeight, detailHeight:detail.clientHeight, detailContent:detail.scrollHeight,
          descriptionBottom:description.bottom, actionsTop:actions.top, actionsBottom:actions.bottom, panelBottom:detail.getBoundingClientRect().bottom };
      }, type);
      assert.equal(layout.pickerBar, "thin");
      assert.equal(layout.catalogScrollable, true);
      assert.equal(layout.detailOverflow, "hidden");
      assert.ok(layout.detailContent <= layout.detailHeight + 1, `${type}: inspector content is clipped`);
      assert.ok(layout.descriptionBottom <= layout.actionsTop + 1, `${type}: details overlap`);
      assert.ok(layout.actionsBottom <= layout.panelBottom + 1, `${type}: actions clipped`);
    }
    await page.locator('#weaponPicker [data-module="scatter"]').evaluate(card => card.click());
    await page.locator("#weaponPicker").hover();
    await page.mouse.wheel(0, 650);
    await page.waitForFunction(() => document.getElementById("weaponPicker").scrollTop > 10);
    assert.equal(await page.locator("#hangarModuleDetails").evaluate(panel => panel.scrollTop), 0);
    await page.screenshot({ path: path.join(path.dirname(gamePath), "hangar-catalog-scrolled-1080.png") });
    await page.locator("#weaponPicker").evaluate(picker => picker.scrollTop = 0);
    await page.waitForFunction(() => document.getElementById("weaponPicker").scrollTop < 10);
    assert.equal(await page.locator('#weaponPicker [data-module="scatter"]').getAttribute("aria-pressed"), "true");
    const unlock = page.locator("#hangarModuleDetails .armory-detail-action.primary");
    assert.equal(await unlock.isEnabled(), true);
    await unlock.click();
    const afterUnlock = await page.evaluate(() => window.__driftBastion.getState());
    assert.equal(afterUnlock.fragments, 92);
    assert.ok(afterUnlock.progression.purchasedModules.includes("scatter"));
    await page.locator("#hangarModuleDetails .armory-detail-action.primary").click();
    await page.locator("#closeHangar").click();
    assert.match(await page.locator("#startWeaponName").innerText(), /Scatter Array/i);

    await page.locator("#startButton").click();
    await page.locator("#buildButton").click();
    assert.equal(await page.locator("#buildModulePreview").count(), 0);
    assert.deepEqual(errors, []);
    console.log(`PASS at 1920x1080: ${modules.length} module inspectors fit; catalog scrollbar/wheel; no pagination; license purchase; starting loadout; Build without mechanic preview`);
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
