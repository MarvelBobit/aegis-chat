# AETHER // End-to-End Encrypted Quantum Social Matrix

> **Sovereign, Zero-Knowledge Social & Ephemeral Comms Platform (Web + Mobile)**  
> Built with **W3C Web Cryptography API** (`ECDH P-256`, `AES-GCM-256`, `SHA-256`), **React 19**, **Vite**, **Tailwind CSS**, and **Node.js WebSocket Blind Relay**.

---

## 🌟 Concept & Philosophy

Traditional social networks harvest communication data, profile behavior, and inspect unencrypted direct messages and media. **AETHER** inverts this model:

- **Mathematical Zero-Knowledge**: Every message, voice note, and signal is encrypted on-device with AES-GCM-256 before leaving browser memory. The server is completely blind—it never sees private keys, plaintexts, or raw payloads.
- **Cyber-Luminescent "Obsidian Matrix" Theme**: Built on deep OLED black (`#05070a`), frosted glassmorphic panels, and neon holographic accents:
  - **Cipher Cyan** (`#00f0ff`): Primary signals and verified nodes
  - **Quantum Violet** (`#8b5cf6`): Active E2EE session encryption
  - **Solar Amber** (`#f59e0b`): 24-hour decaying ephemeral stories
  - **Glitch Crimson** (`#ef4444`): Ghost Protocol self-destruct messages
- **Seamless Web & Phone Architecture**:
  - Full desktop dashboard with navigation rail, dual-pane encrypted chat, and live feed.
  - Mobile ergonomics with bottom dock, touch-friendly story carousel, and mobile camera capture.
  - **Live Phone Simulator**: Toggle between full desktop widescreen and an authentic iPhone frame right within your desktop browser with a single click.

---

## 🚀 Key Features

### 1. Ephemeral Stories ("Signals")
- **Active Story Rings**: Pulsing cyan/violet/amber glowing gradient borders indicating unread stories.
- **Instagram-Style Story Viewer**: Fullscreen view with segmented progress bars, pause-on-hold, tap left/right navigation, and audio/visual filters.
- **Story Creator**: Direct webcam capture or media upload with live Cyberpunk filters (*Thermal, Cyber-Cyan, Neon-Violet, Monochrome Noir*) and custom decay durations (1h, 6h, 24h).
- **Direct Story Reactions & Encrypted Replies**: Quick reaction emojis (🔥, ⚡, 🛡️, 💎, 👁️) with confetti and encrypted DM replies.

### 2. End-to-End Encrypted Direct Messaging ("Neural Comms")
- **Pairwise ECDH Key Exchange**: Client-side elliptic-curve Diffie-Hellman P-256 key agreement.
- **AES-GCM-256 Symmetric Encryption**: Dynamic 12-byte initialization vectors per transmission.
- **Ghost Protocol (Self-Destruct Messages)**: Optional burn timers (5s, 30s, 1m). Messages evaporate permanently from memory once opened.
- **Encrypted Voice Notes**: In-browser microphone recording with real-time animated frequency visualizer.
- **Live Typing & Delivery Receipts**: Real-time WebSocket transmission status.

### 3. Cryptographic Safety Numbers
- Visual safety verification modal comparing deterministic SHA-256 fingerprints across contact public keys.
- Holographic QR code comparison to prevent Man-in-the-Middle (MITM) attacks.

### 4. Visual Feed & Discovery
- Feed of encrypted transmissions with like animations, expandable comment drawers, and media bookmarks.
- Explore grid with node discovery, trending quantum mesh tags, and filter categories.

---

## 🛠️ Quick Start

### 1. Run the Startup Script
Double-click `start.bat` or run:
```powershell
.\start.ps1
```

### 2. Or Start Manually:
```bash
# Terminal 1: Blind Relay Server
cd server
node server.js

# Terminal 2: Web & Mobile Frontend
cd client
npm run dev
```

Navigate to: `http://localhost:3001`

---

## 🧪 Testing Real-Time E2EE Messaging

Aether includes a built-in **Persona Switcher**:
1. Open `http://localhost:3001` in **Window 1** (Active persona: `@cipher_nova`).
2. Open `http://localhost:3001` in **Window 2** or an Incognito window, and switch the persona in the top-right menu to `@valkyrie_x`.
3. In Window 1, go to **Comms** and click on `@valkyrie_x`.
4. Type an encrypted message or record a voice note and press send.
5. Watch the message instantly arrive, decrypt with ECDH in Window 2, and inspect the server terminal to verify that **only raw ciphertext and IV were transmitted**!
