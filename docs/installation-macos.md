# Installing MaPlume on macOS

## Download

1. Go to the [Releases page](https://github.com/yurug/maplume/releases)
2. Download the latest `.dmg` file (e.g., `MaPlume-0.2.0.dmg`)

## Installation

1. **Open the .dmg file**
   - Double-click the downloaded `.dmg` file
   - A new Finder window will appear

2. **Drag MaPlume to Applications**
   - Drag the MaPlume icon to the Applications folder shortcut in the window

3. **Eject the disk image**
   - Right-click the "MaPlume" disk on your desktop or Finder sidebar
   - Select "Eject"

## First Launch - Important!

Because MaPlume is not signed with an Apple Developer certificate, macOS will block it. You'll see one of these errors:

- *"MaPlume is damaged and can't be opened"*
- *"MaPlume can't be opened because it is from an unidentified developer"*

### Solution

Open **Terminal** (you can find it in Applications → Utilities → Terminal) and run this command:

```bash
xattr -cr /Applications/MaPlume.app
```

Then open MaPlume from your Applications folder. It should work now!

### Alternative Method

If you see *"can't be opened because it is from an unidentified developer"*:

1. **Right-click** (or Control+click) on MaPlume in Applications
2. Select **Open** from the menu
3. Click **Open** in the dialog that appears

You only need to do this once.

---

## Why This Extra Step?

Apple requires developers to pay **$99/year** for an Apple Developer account to sign and notarize their apps. Without this, macOS treats the app as potentially dangerous.

This creates a barrier for free, open-source software like MaPlume. While we understand Apple's security concerns, this policy makes it harder for independent developers to distribute free software to Mac users.

### Help Us Get an Apple Developer Certificate

If you'd like to help us provide a smoother installation experience for Mac users, consider sponsoring the project:

<a href="https://github.com/sponsors/yurug">
  <img src="https://img.shields.io/badge/Sponsor-❤️-ea4aaa?style=for-the-badge&logo=github-sponsors" alt="Sponsor on GitHub" />
</a>

With $99/year in sponsorships, we can sign and notarize MaPlume so Mac users won't see these security warnings.

---

## Updating MaPlume

MaPlume checks for updates automatically. When a new version is available:

1. You'll see a notification in the app
2. The update will download automatically
3. Restart MaPlume to apply the update

You should **not** need to run the `xattr` command again for updates.

---

## Uninstalling

1. Open Finder → Applications
2. Drag MaPlume to the Trash
3. Empty the Trash

Your data (projects, entries) is stored in the folder you chose during setup, so it won't be deleted with the app.
