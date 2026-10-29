"use strict";

// Wraps the mobile export into a landscape, immersive-fullscreen Android APK (android/ holds the wrapper).
// Uses the SDK and JDK bundled with Unity's Android module, so it needs no Gradle and no network.
// Set ANDROID_HOME / JAVA_HOME to use another SDK or JDK.
// Usage: node tools/build-android-apk.cjs [mobile.html] [output.apk]
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const html = path.resolve(process.argv[2] || path.join(root, "outputs/Drift_Bastion_Mobile.html"));
const output = path.resolve(process.argv[3] || path.join(root, "outputs/Bastion_Android.apk"));
const wrapper = path.join(root, "android");
const stage = path.join(wrapper, "build");
const MIN_SDK = 24;
const TARGET_SDK = 35;
// A playtest key like Android's debug keystore, not a release key. Keep the file (it is git-ignored because the
// repository is public): Android only installs an update over an existing copy, and its saves, with the same key.
const KEYSTORE = path.join(wrapper, "playtest.keystore");
const KEY_ALIAS = "bastion";
const KEY_PASSWORD = "bastion-playtest";

function newestDirectory(parent) {
  if (!fs.existsSync(parent)) return null;
  const names = fs.readdirSync(parent, { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => entry.name);
  names.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  return names.length ? path.join(parent, names[names.length - 1]) : null;
}

function unityAndroidPlayer() {
  const editors = "C:/Program Files/Unity/Hub/Editor";
  if (!fs.existsSync(editors)) return null;
  const players = fs.readdirSync(editors).map(name => path.join(editors, name, "Editor/Data/PlaybackEngines/AndroidPlayer"))
    .filter(candidate => fs.existsSync(path.join(candidate, "SDK")) && fs.existsSync(path.join(candidate, "OpenJDK")));
  players.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  return players.length ? players[players.length - 1] : null;
}

const player = unityAndroidPlayer();
const sdk = process.env.ANDROID_HOME || (player && path.join(player, "SDK"));
const jdk = process.env.JAVA_HOME || (player && path.join(player, "OpenJDK"));
if (!sdk || !jdk) throw new Error("No Android SDK/JDK found. Install Unity's Android module or set ANDROID_HOME and JAVA_HOME.");
const buildTools = newestDirectory(path.join(sdk, "build-tools"));
const platform = path.join(sdk, "platforms", "android-" + TARGET_SDK, "android.jar");
if (!buildTools || !fs.existsSync(platform)) throw new Error("Android build-tools or android-" + TARGET_SDK + " platform missing in " + sdk);
const exe = name => path.join(buildTools, process.platform === "win32" ? name + ".exe" : name);
const java = path.join(jdk, "bin", "java");
const jdkTool = name => path.join(jdk, "bin", name);

function run(command, args, options) {
  execFileSync(command, args, Object.assign({ stdio: ["ignore", "inherit", "inherit"] }, options));
}

function filesUnder(directory, extension) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(full, extension) : (full.endsWith(extension) ? [full] : []);
  });
}

if (!fs.existsSync(html)) throw new Error("Mobile build missing: " + html + " (run node tools/build-mobile-standalone.js first)");
const page = fs.readFileSync(html, "utf8");
const buildMatch = page.match(/var GAME_BUILD = "([^"]+)"/);
const versionName = (buildMatch ? buildMatch[1] : "dev") + "-android";
// Minutes since 2026 keep version codes rising across rebuilds, so a new APK installs over the old one.
const versionCode = Math.floor((Date.now() - Date.UTC(2026, 0, 1)) / 60000);

fs.rmSync(stage, { recursive: true, force: true });
["res", "assets", "gen", "classes", "dex"].forEach(name => fs.mkdirSync(path.join(stage, name), { recursive: true }));
fs.cpSync(path.join(wrapper, "res"), path.join(stage, "res"), { recursive: true });
fs.mkdirSync(path.join(stage, "res/mipmap-xxxhdpi"), { recursive: true });
fs.copyFileSync(path.join(root, "icon-192.png"), path.join(stage, "res/mipmap-xxxhdpi/ic_launcher.png"));
fs.copyFileSync(html, path.join(stage, "assets/index.html"));

const unsigned = path.join(stage, "unsigned.apk");
const aligned = path.join(stage, "aligned.apk");
run(exe("aapt2"), ["compile", "--dir", path.join(stage, "res"), "-o", path.join(stage, "res.zip")]);
run(exe("aapt2"), ["link", "-o", unsigned, "-I", platform, "--manifest", path.join(wrapper, "AndroidManifest.xml"),
  "--min-sdk-version", String(MIN_SDK), "--target-sdk-version", String(TARGET_SDK),
  "--version-code", String(versionCode), "--version-name", versionName,
  "-A", path.join(stage, "assets"), "--java", path.join(stage, "gen"), path.join(stage, "res.zip")]);
run(jdkTool("javac"), ["-source", "8", "-target", "8", "-Xlint:-options", "-encoding", "UTF-8", "-bootclasspath", platform,
  "-d", path.join(stage, "classes"), ...filesUnder(path.join(stage, "gen"), ".java"), ...filesUnder(path.join(wrapper, "src"), ".java")]);
run(java, ["-cp", path.join(buildTools, "lib/d8.jar"), "com.android.tools.r8.D8", "--release", "--min-api", String(MIN_SDK),
  "--lib", platform, "--output", path.join(stage, "dex"), ...filesUnder(path.join(stage, "classes"), ".class")]);
run(exe("aapt"), ["add", unsigned, "classes.dex"], { cwd: path.join(stage, "dex"), stdio: ["ignore", "ignore", "inherit"] });
run(exe("zipalign"), ["-f", "4", unsigned, aligned]);

if (!fs.existsSync(KEYSTORE)) {
  run(jdkTool("keytool"), ["-genkeypair", "-keystore", KEYSTORE, "-storetype", "PKCS12", "-alias", KEY_ALIAS,
    "-storepass", KEY_PASSWORD, "-keypass", KEY_PASSWORD, "-keyalg", "RSA", "-keysize", "2048", "-validity", "10000",
    "-dname", "CN=Bastion Playtest, O=Nightforge Games"]);
}
fs.mkdirSync(path.dirname(output), { recursive: true });
run(java, ["-jar", path.join(buildTools, "lib/apksigner.jar"), "sign", "--ks", KEYSTORE, "--ks-key-alias", KEY_ALIAS,
  "--ks-pass", "pass:" + KEY_PASSWORD, "--key-pass", "pass:" + KEY_PASSWORD, "--out", output, aligned]);
run(java, ["-jar", path.join(buildTools, "lib/apksigner.jar"), "verify", output]);
console.log(output + " (" + versionName + ", code " + versionCode + ", " + (fs.statSync(output).size / 1048576).toFixed(1) + " MB)");
