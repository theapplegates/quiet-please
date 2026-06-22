<<<<<<< HEAD
<<<<<<< HEAD
#!/usr/bin/env node
/**
 * Upload an image to Cloudinary, request responsive breakpoints, merge the
 * resulting widths into src/data/cloudinary-breakpoints.json, and print a
 * ready-to-paste <cloudinary-picture> snippet (intrinsic width/height pulled
 * from the upload response) to stdout.
 *
 * Usage:
 *   npm run cloudinary:breakpoints -- src/assets/images/my-photo.jpg
 *
 * The Cloudinary public ID is derived from the file path by dropping the
 * leading "src/" segment and the file extension, e.g.
 *   src/assets/images/my-photo.jpg -> assets/images/my-photo
 *
 * Requires CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET
 * in .env (or the surrounding process environment). The build does NOT need the
 * API key/secret -- only this upload script does.
 */
import { createRequire } from "node:module";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, extname, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const cloudinary = require("cloudinary").v2;

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BREAKPOINTS_FILE = resolve(ROOT, "src/data/cloudinary-breakpoints.json");

/** Minimal .env loader so this script has no extra dependency. */
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
    // Don't clobber real environment variables.
    if (!(key in process.env)) process.env[key] = value;
  }
}

/** src/assets/images/my-photo.jpg -> assets/images/my-photo */
function derivePublicId(filePath) {
  const rel = relative(ROOT, resolve(ROOT, filePath)).replace(/\\/g, "/");
  const withoutSrc = rel.startsWith("src/") ? rel.slice(4) : rel;
  const ext = extname(withoutSrc);
  return ext ? withoutSrc.slice(0, -ext.length) : withoutSrc;
}

async function readBreakpoints() {
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
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Usage: npm run cloudinary:breakpoints -- <path-to-image>");
    process.exit(1);
  }

  await loadEnv();

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    console.error(
      "Missing Cloudinary credentials. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in .env."
    );
    process.exit(1);
  }

  const absPath = resolve(ROOT, filePath);
  if (!existsSync(absPath)) {
    console.error(`Image not found: ${absPath}`);
    process.exit(1);
  }

  const publicId = derivePublicId(filePath);

  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });

  console.log(`Uploading "${absPath}" as public_id "${publicId}"...`);

  const result = await cloudinary.uploader.upload(absPath, {
    public_id: publicId,
    unique_filename: false,
    overwrite: true,
    resource_type: "image",
    responsive_breakpoints: [
      {
        create_derived: false,
        breakpoints: {
          min_width: 200,
          max_width: 2000,
          max_images: 6,
          auto_optimal_breakpoints: true,
        },
      },
    ],
  });

  const widths =
    result.responsive_breakpoints?.[0]?.breakpoints?.map((bp) => bp.width) ?? [];

  if (widths.length === 0) {
    console.error("Cloudinary returned no breakpoints. Full response:");
    console.error(JSON.stringify(result, null, 2));
    process.exit(1);
  }

  const sorted = [...new Set(widths)].sort((a, b) => a - b);

  const data = await readBreakpoints();
  data[publicId] = sorted;
  await writeBreakpoints(data);

  console.log(
    `Wrote ${sorted.length} breakpoints for "${publicId}" to ${relative(ROOT, BREAKPOINTS_FILE)}`
  );
  console.log(sorted.join(", "));

  // Intrinsic dimensions come from the upload response. The rehype plugin
  // reads width/height/sizes/breakpoints/picture-class off the element and
  // builds JXL -> AVIF -> WebP sources + a WebP <img> fallback. Replace the
  // alt text (the plugin rejects an empty alt) before publishing.
  const intrinsicWidth = result.width;
  const intrinsicHeight = result.height;
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

  console.log("\nPaste this into your .md post (replace the alt text):\n");
  console.log(snippet);
  console.log("");
}

main().catch((err) => {
  console.error(err?.message || err);
  process.exit(1);
});
=======
=======
>>>>>>> main
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { basename, dirname, extname, relative, resolve } from "node:path";
import { v2 as cloudinary } from "cloudinary";

const imageRefs = process.argv.slice(2).filter(Boolean);
const outputPath = resolve("src/data/cloudinary-breakpoints.json");

const cloudName =
  process.env.CLOUDINARY_CLOUD_NAME || process.env.PUBLIC_CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (!imageRefs.length) {
  console.error(
<<<<<<< HEAD
    "Usage: pnpm cloudinary:breakpoints <cloudinary-public-id-or-local-file> [...]"
=======
	"Usage: pnpm cloudinary:breakpoints <cloudinary-public-id-or-local-file> [...]"
>>>>>>> main
  );
  process.exit(1);
}

if (!cloudName || !apiKey || !apiSecret) {
  console.error(
<<<<<<< HEAD
    "Missing Cloudinary credentials. Set CLOUDINARY_CLOUD_NAME or PUBLIC_CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET."
=======
	"Missing Cloudinary credentials. Set CLOUDINARY_CLOUD_NAME or PUBLIC_CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET."
>>>>>>> main
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
  create_derived: true,
  bytes_step: Number(process.env.CLOUDINARY_BREAKPOINT_BYTES_STEP || 20000),
  min_width: Number(process.env.CLOUDINARY_BREAKPOINT_MIN_WIDTH || 200),
  max_width: Number(process.env.CLOUDINARY_BREAKPOINT_MAX_WIDTH || 2000),
  max_images: Number(process.env.CLOUDINARY_BREAKPOINT_MAX_IMAGES || 10),
};

const readExistingBreakpoints = async () => {
  try {
<<<<<<< HEAD
    return JSON.parse(await readFile(outputPath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return {};
    throw error;
=======
	return JSON.parse(await readFile(outputPath, "utf8"));
  } catch (error) {
	if (error?.code === "ENOENT") return {};
	throw error;
>>>>>>> main
  }
};

const getWidths = result =>
  result.responsive_breakpoints?.[0]?.breakpoints
<<<<<<< HEAD
    ?.map(breakpoint => breakpoint.width)
    .filter(width => Number.isFinite(width))
    .sort((a, b) => a - b);

const isLocalFile = async imageRef => {
  try {
    return (await stat(resolve(imageRef))).isFile();
  } catch {
    return false;
=======
	?.map(breakpoint => breakpoint.width)
	.filter(width => Number.isFinite(width))
	.sort((a, b) => a - b);

const isLocalFile = async imageRef => {
  try {
	return (await stat(resolve(imageRef))).isFile();
  } catch {
	return false;
>>>>>>> main
  }
};

const getPublicIdFromPath = imagePath => {
  const absolutePath = resolve(imagePath);
  const relativeToProject = relative(process.cwd(), absolutePath);
  const withoutExtension = relativeToProject.slice(
<<<<<<< HEAD
    0,
    -extname(relativeToProject).length
  );

  if (!withoutExtension.startsWith("..")) {
    return withoutExtension.replace(/^src\/assets\/images\//, "assets/images/");
=======
	0,
	-extname(relativeToProject).length
  );

  if (!withoutExtension.startsWith("..")) {
	return withoutExtension.replace(/^src\/assets\/images\//, "assets/images/");
>>>>>>> main
  }

  return basename(imagePath, extname(imagePath));
};

const breakpointsByPublicId = await readExistingBreakpoints();

for (const imageRef of imageRefs) {
  const localFile = await isLocalFile(imageRef);
  const publicId = localFile ? getPublicIdFromPath(imageRef) : imageRef;
  const result = localFile
<<<<<<< HEAD
    ? await cloudinary.uploader.upload(resolve(imageRef), {
        public_id: publicId,
        overwrite: true,
        resource_type: "image",
        responsive_breakpoints: [breakpointRequest],
      })
    : await cloudinary.uploader.explicit(publicId, {
        type: "upload",
        resource_type: "image",
        responsive_breakpoints: [breakpointRequest],
      });
  const widths = getWidths(result);

  if (!widths?.length) {
    throw new Error(`Cloudinary did not return breakpoints for ${imageRef}`);
=======
	? await cloudinary.uploader.upload(resolve(imageRef), {
		public_id: publicId,
		overwrite: true,
		resource_type: "image",
		responsive_breakpoints: [breakpointRequest],
	  })
	: await cloudinary.uploader.explicit(publicId, {
		type: "upload",
		resource_type: "image",
		responsive_breakpoints: [breakpointRequest],
	  });
  const widths = getWidths(result);

  if (!widths?.length) {
	throw new Error(`Cloudinary did not return breakpoints for ${imageRef}`);
>>>>>>> main
  }

  breakpointsByPublicId[publicId] = widths;
  console.log(
<<<<<<< HEAD
    `${publicId}${localFile ? ` (uploaded from ${imageRef})` : ""}: ${widths.join(", ")}`
=======
	`${publicId}${localFile ? ` (uploaded from ${imageRef})` : ""}: ${widths.join(", ")}`
>>>>>>> main
  );
}

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(
  outputPath,
  `${JSON.stringify(breakpointsByPublicId, null, 2)}\n`
);
<<<<<<< HEAD
>>>>>>> main
=======
>>>>>>> main
