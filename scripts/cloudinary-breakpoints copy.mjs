#!/usr/bin/env node
/**
 * Uploads an image to Cloudinary (or updates an existing remote one), 
 * generates responsive breakpoints, merges them into src/data/cloudinary-breakpoints.json,
 * and prints a ready-to-paste component snippet.
 *
 * Usage:
 * npm run cloudinary:breakpoints -- src/assets/images/my-photo.jpg
 * or
 * pnpm cloudinary:breakpoints src/assets/images/my-photo.jpg
 */

import { createRequire } from "node:module";
import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, extname, resolve, relative, basename } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const cloudinary = require("cloudinary").v2;

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BREAKPOINTS_FILE = resolve(ROOT, "src/data/cloudinary-breakpoints.json");

/** Minimal .env loader fallback in case Node's built-in --env-file isn't loaded */
async function loadEnv() {
  const envPath = resolve(ROOT, ".env");
  if (!existsSync(envPath)) return;
  const text = await readFile(envPath, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

/** Determines if the reference point is a valid local file path */
async function isLocalFile(imageRef) {
  try {
    return (await stat(resolve(ROOT, imageRef))).isFile();
  } catch {
    return false;
  }
}

/** Translates local path to public ID: src/assets/images/my-photo.jpg -> assets/images/my-photo */
function getPublicIdFromPath(imagePath) {
  const absolutePath = resolve(ROOT, imagePath);
  const relativeToProject = relative(ROOT, absolutePath).replace(/\\/g, "/");
  const withoutExtension = relativeToProject.slice(0, -extname(relativeToProject).length);

  if (withoutExtension.startsWith("src/assets/images/")) {
    return withoutExtension.replace(/^src\/assets\/images\//, "assets/images/");
  }
  if (withoutExtension.startsWith("src/")) {
    return withoutExtension.slice(4);
  }
  return withoutExtension;
}

async function readExistingBreakpoints() {
  if (!existsSync(BREAKPOINTS_FILE)) return {};
  try {
    return JSON.parse(await readFile(BREAKPOINTS_FILE, "utf8"));
  } catch (err) {
    throw new Error(`Could not parse ${BREAKPOINTS_FILE}: ${err.message}`);
  }
}

async function writeBreakpoints(data) {
  await mkdir(dirname(BREAKPOINTS_FILE), { recursive: true });
  await writeFile(BREAKPOINTS_FILE, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function main() {
  const imageRefs = process.argv.slice(2).filter(Boolean);
  if (!imageRefs.length) {
    console.error("Usage: pnpm cloudinary:breakpoints <path-to-image-or-public-id>");
    process.exit(1);
  }

  await loadEnv();

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    console.error(
      "Missing Cloudinary credentials. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET."
    );
    process.exit(1);
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });

  const breakpointRequest = {
    create_derived: false,
    bytes_step: Number(process.env.CLOUDINARY_BREAKPOINT_BYTES_STEP || 20000),
    min_width: Number(process.env.CLOUDINARY_BREAKPOINT_MIN_WIDTH || 200),
    max_width: Number(process.env.CLOUDINARY_BREAKPOINT_MAX_WIDTH || 2000),
    max_images: Number(process.env.CLOUDINARY_BREAKPOINT_MAX_IMAGES || 10),
  };

  const breakpointsByPublicId = await readExistingBreakpoints();

  for (const imageRef of imageRefs) {
    const localFile = await isLocalFile(imageRef);
    const publicId = localFile ? getPublicIdFromPath(imageRef) : imageRef;

    console.log(`Processing "${imageRef}" using public_id "${publicId}"...`);

    let result;
    if (localFile) {
      result = await cloudinary.uploader.upload(resolve(ROOT, imageRef), {
        public_id: publicId,
        unique_filename: false,
        overwrite: true,
        resource_type: "image",
        responsive_breakpoints: [breakpointRequest],
      });
    } else {
      result = await cloudinary.uploader.explicit(publicId, {
        type: "upload",
        resource_type: "image",
        responsive_breakpoints: [breakpointRequest],
      });
    }

    const widths = result.responsive_breakpoints?.[0]?.breakpoints?.map((bp) => bp.width) ?? [];

    if (widths.length === 0) {
      console.error(`Cloudinary returned no breakpoints for ${imageRef}. Full response:`);
      console.error(JSON.stringify(result, null, 2));
      continue;
    }

    const sorted = [...new Set(widths)].sort((a, b) => a - b);
    breakpointsByPublicId[publicId] = sorted;

    console.log(`\nSuccessfully handled: ${publicId}`);
    console.log(`Breakpoints: ${sorted.join(", ")}`);

    // Output helpful Markdown snippet info for the terminal 
    const intrinsicWidth = result.width || "720";
    const intrinsicHeight = result.height || "480";
 const snippet = [
   `<cloudinary-picture`,
   `  src="${publicId}"`,
   `  alt="TODO: describe this image"`,
   `  width="${intrinsicWidth}"`,
   `  height="${intrinsicHeight}"`,
   `  sizes="(min-width: 768px) 720px, 100vw"`,
   `  breakpoints="${sorted.join(", ")}"`,
   `  picture-class="responsive-picture"`,
   `/>`,
 ].join("\n");

    console.log("\nPaste this into your markdown post:\n");
    console.log(snippet);
    console.log("\n" + "=".repeat(40) + "\n");
  }

  await writeBreakpoints(breakpointsByPublicId);
  console.log(`Updated breakpoints JSON database at src/data/cloudinary-breakpoints.json`);
}

main().catch((err) => {
  console.error(err?.message || err);
  process.exit(1);
});