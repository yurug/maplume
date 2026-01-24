# MaPlume

A beautiful, distraction-free word tracker for novel writers. Track your daily writing progress, visualize your journey, and stay motivated to reach your goals.

![MaPlume](https://img.shields.io/badge/version-0.1.0-amber)
![License](https://img.shields.io/badge/license-MIT-green)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue)

## Features

- **Multiple Projects** - Track progress across different writing projects
- **Visual Progress** - Interactive chart showing your progress vs. target trajectory
- **Smart Statistics** - Daily averages, streaks, projected completion dates
- **Motivational Messages** - Encouraging prompts based on your writing trends
- **Dark Mode** - Easy on the eyes during late-night writing sessions
- **Local-First** - Your data stays on your machine, with optional cloud sync
- **Multi-Language** - Available in English and French

## Installation

### Windows

1. Download `MaPlume-Setup-0.1.0.exe` from the [latest release](https://github.com/yurug/maplume/releases/latest)
2. Run the installer
3. MaPlume will be available in your Start Menu

### macOS

1. Download `MaPlume-0.1.0.dmg` from the [latest release](https://github.com/yurug/maplume/releases/latest)
2. Open the DMG file
3. Drag MaPlume to your Applications folder
4. On first launch, right-click and select "Open" to bypass Gatekeeper (unsigned app)

### Linux

#### AppImage (Recommended)
1. Download `MaPlume-0.1.0.AppImage` from the [latest release](https://github.com/yurug/maplume/releases/latest)
2. Make it executable:
   ```bash
   chmod +x MaPlume-0.1.0.AppImage
   ```
3. Run it:
   ```bash
   ./MaPlume-0.1.0.AppImage
   ```

#### Optional: Desktop Integration
To add MaPlume to your application menu on Linux:
```bash
# Create desktop entry
cat > ~/.local/share/applications/maplume.desktop << EOF
[Desktop Entry]
Name=MaPlume
Exec=/path/to/MaPlume-0.1.0.AppImage
Icon=maplume
Type=Application
Categories=Office;WordProcessor;
EOF
```

## Auto-Updates

MaPlume automatically checks for updates and will notify you when a new version is available. Updates are downloaded and installed seamlessly.

## Building from Source

### Prerequisites
- Node.js 20+
- npm

### Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### Build
```bash
# Build for production
npm run build

# Create distributable for your platform
npm run dist

# Or build for a specific platform
npm run dist:win     # Windows
npm run dist:mac     # macOS
npm run dist:linux   # Linux
```

## Data Storage

MaPlume stores your data locally in a folder you choose during first launch. This makes it easy to:
- Back up your data
- Sync via cloud storage (Dropbox, Google Drive, OneDrive, etc.)
- Move your data between machines

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Support

If you find MaPlume helpful for your writing journey, consider [sponsoring the project](https://github.com/sponsors/yurug).
