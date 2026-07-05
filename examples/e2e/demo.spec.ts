import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const LONDON_BRIDGE: [number, number] = [51.5079, -0.0877];
const ST_PAULS: [number, number] = [51.5138, -0.0984];

function collectPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  return errors;
}

async function overlayCanvas(page: Page) {
  const canvas = page.locator(".leaflet-pixi-overlay canvas").first();
  await expect(canvas).toBeVisible();
  return canvas;
}

async function clickMapCenter(page: Page) {
  const map = page.locator(".leaflet-container");
  const box = (await map.boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

function project([lat, lng]: [number, number], zoom: number) {
  const sin = Math.sin((lat * Math.PI) / 180);
  const scale = 256 * 2 ** zoom;
  return {
    x: (scale * (lng + 180)) / 360,
    y: scale * (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)),
  };
}

async function clickProjectedMarker(
  page: Page,
  position: [number, number],
  center: [number, number],
  zoom: number,
) {
  const map = page.locator(".leaflet-container");
  const box = (await map.boundingBox())!;
  const centerPoint = project(center, zoom);
  const markerPoint = project(position, zoom);
  await page.mouse.click(
    box.x + box.width / 2 + markerPoint.x - centerPoint.x,
    box.y + box.height / 2 + markerPoint.y - centerPoint.y - 10,
  );
}

test("basic demo renders markers and opens an interactive React popup", async ({
  page,
}) => {
  const errors = collectPageErrors(page);
  await page.goto("/");
  await overlayCanvas(page);

  // the "center" marker sits exactly at the map center; its pin tip
  // (anchor [0.5, 1]) is at the center point, so click a few px above it
  const map = page.locator(".leaflet-container");
  const box = (await map.boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2 - 10);

  await expect(page.locator(".leaflet-popup")).toBeVisible();
  await expect(page.getByTestId("status")).toHaveText("selected: london-bridge");

  // React state works inside the portal popup
  const button = page.getByTestId("popup-button");
  await expect(button).toHaveText("Clicked 0 times");
  await button.click();
  await expect(button).toHaveText("Clicked 1 times");

  // closing via the X re-enables re-opening (regression for the
  // same-reference setState bail-out bug)
  await page.locator(".leaflet-popup-close-button").click();
  await expect(page.locator(".leaflet-popup")).toBeHidden();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2 - 10);
  await expect(page.locator(".leaflet-popup")).toBeVisible();

  expect(errors).toEqual([]);
});

test("basic demo markers remain clickable at projected positions after zoom", async ({
  page,
}) => {
  const errors = collectPageErrors(page);
  await page.goto("/");
  await overlayCanvas(page);
  await page.locator(".leaflet-control-zoom-out").click();
  await page.waitForTimeout(600);
  await page.locator(".leaflet-control-zoom-out").click();
  await page.waitForTimeout(800);

  await clickProjectedMarker(page, ST_PAULS, LONDON_BRIDGE, 12);
  await expect(page.getByTestId("status")).toHaveText("selected: st-pauls");

  expect(errors).toEqual([]);
});

test("demo source preview toggles and follows the selected example", async ({
  page,
}) => {
  const errors = collectPageErrors(page);
  await page.goto("/");
  await overlayCanvas(page);

  await page.getByTestId("code-toggle").click();
  await expect(page.getByTestId("code-preview")).toContainText("const BasicDemo");

  await page.getByRole("link", { name: "Clustering" }).click();
  await expect(page.getByTestId("code-preview")).toContainText("const ClusterDemo");

  expect(errors).toEqual([]);
});

test("stress demo renders 10k markers without errors", async ({ page }) => {
  const errors = collectPageErrors(page);
  await page.goto("/#/stress");
  await overlayCanvas(page);
  await expect(page.getByTestId("status")).toContainText("10,000 markers");
  // give the overlay a moment to load textures and draw
  await page.waitForTimeout(1500);
  expect(errors).toEqual([]);
});

test("cluster demo clusters markers and zooms in on cluster click", async ({
  page,
}) => {
  const errors = collectPageErrors(page);
  await page.goto("/#/cluster");
  await overlayCanvas(page);
  await expect(page.getByTestId("status")).toContainText("clustered");
  await page.waitForTimeout(1500);

  // the view is centered on the marker field, so a central cluster bubble
  // should be at or near the map center
  await clickMapCenter(page);
  await expect(page.getByTestId("status")).toContainText("cluster of", {
    timeout: 5_000,
  });

  expect(errors).toEqual([]);
});

test("draw demo renders the custom PIXI.Graphics route", async ({ page }) => {
  const errors = collectPageErrors(page);
  await page.goto("/#/draw");
  await overlayCanvas(page);
  await expect(page.getByTestId("status")).toContainText("PIXI.Graphics");
  await page.waitForTimeout(1500);
  expect(errors).toEqual([]);
});
