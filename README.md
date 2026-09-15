<div align="center">

# 🚌 SmartBus

### Real-Time Transit Tracking for Tier-2 Cities

*Live bus tracking, dynamic ETAs, and authenticated driver telemetry — built for low-bandwidth networks.*

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![Socket.io](https://img.shields.io/badge/Socket.io-WebSockets-010101?logo=socket.io&logoColor=white)](https://socket.io/)
[![Leaflet](https://img.shields.io/badge/Leaflet-Maps-199900?logo=leaflet&logoColor=white)](https://leafletjs.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

[Overview](#overview) • [Features](#-key-features) • [Architecture](#-system-architecture) • [Quick Start](#-quick-start) • [Usage](#-usage) • [Roadmap](#-roadmap)

</div>

---

## Overview

Most public transport in small towns and tier-2 cities runs without any digital presence — commuters wait at stops with no idea when the next bus will arrive, or whether it is running at all.

**SmartBus** closes that gap with an event-driven tracking platform that streams live vehicle positions from drivers' smartphones to a commuter-facing map, computes arrival estimates in real time, and keeps working even when a driver's device goes offline by falling back to a road-accurate simulation.

The entire stack is tuned for 2G/3G conditions and low-end Android devices — no native app, no heavy framework, no expensive GPS hardware.

---

## ✨ Key Features

| Feature | Description |
| :--- | :--- |
| 📡 **Live GPS + Simulation Fallback** | Streams real telemetry from authenticated drivers via the HTML5 Geolocation API, and seamlessly switches to OSRM-based kinematic simulation when live telemetry goes inactive. |
| ⏱️ **Dynamic ETA Engine** | Computes per-stop arrival times in real time along OSRM road polylines using the Haversine distance formula with adaptive traffic velocity throttling. |
| 🔐 **Driver Authentication Portal** | Server-verified 4-digit PIN authentication gates `/driver.html`, preventing unauthorized or spoofed telemetry updates. |
| 📶 **Low-Bandwidth Optimization** | Compressed WebSocket payloads pushed through targeted Socket.io rooms, so each client only receives the routes it subscribes to. |
| 🎨 **Responsive UI & Theming** | Mobile-first Leaflet.js interface with Plus Jakarta Sans / Outfit typography and a pure neutral charcoal dark theme toggle. |

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Backend Runtime** | Node.js, Express.js |
| **Real-Time Transport** | Socket.io (WebSockets) |
| **Mapping & GIS** | Leaflet.js, OpenStreetMap tiles |
| **Routing Geometry** | Open Source Routing Machine (OSRM) API |
| **Telemetry Source** | HTML5 Geolocation API |
| **Frontend** | Vanilla HTML5, CSS3, JavaScript |

---

## 🏗️ System Architecture

```
┌─────────────────────────────┐
│   Driver Portal             │
│   (driver.html)             │
│                             │
│   1. PIN Authentication ────┼──► verified server-side
│   2. Live GPS Telemetry ────┼──► emitted over WebSocket
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────────────────────────┐
│      Node.js / Express + Socket.io Server       │
│                                                 │
│   ├─ [Telemetry Active]  ─► stream real GPS     │
│   │                         position            │
│   │                                             │
│   └─ [Driver Offline]    ─► OSRM path           │
│                             simulation loop     │
│                                                 │
│   ETA Engine: Haversine + adaptive velocity     │
└──────────────────────┬──────────────────────────┘
                       │  broadcast to route room
                       ▼
┌─────────────────────────────┐
│   Commuter Live Map         │
│   (index.html)              │
│                             │
│   • Live bus markers        │
│   • Route polyline          │
│   • Per-stop ETAs           │
└─────────────────────────────┘
```

**How the fallback works:** the server tracks the last telemetry timestamp for every active bus. If no GPS update arrives within the staleness window, the vehicle is handed to the simulation loop, which advances a virtual position along the OSRM polyline at a throttled velocity. The commuter map treats both sources identically, so the transition is invisible to the rider.

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** v18 or higher
- **npm** (bundled with Node.js)

### Installation

**1. Clone the repository**

```bash
git clone https://github.com/4rch13-v/SmartBus.git
cd SmartBus
```

**2. Install dependencies**

```bash
npm install
```

**3. Start the server**

```bash
npm start
```

**4. Open in your browser**

| Interface | URL |
| :--- | :--- |
| 🗺️ Commuter Map | `http://localhost:3000` |
| 🚍 Driver Portal | `http://localhost:3000/driver.html` |

> **Note:** browsers only expose the Geolocation API over secure origins. `localhost` is treated as secure, but if you want to test the driver portal from a phone on your local network, tunnel it over HTTPS (e.g. `ngrok http 3000`) or the GPS permission prompt will never appear.

---

## 📖 Usage

### For Drivers

1. Open the driver portal on a smartphone.
2. Select your assigned bus and route.
3. Enter your 4-digit PIN to authenticate.
4. Grant location permission and toggle sharing **on**. Keep the screen awake while driving — background tabs throttle GPS updates.

### For Commuters

1. Open the commuter map — no login required.
2. Pick a route to see every active bus on it.
3. Tap a stop to view its live ETA.
4. Use the theme toggle to switch between light and dark mode.

---

## 🗺️ Roadmap

- [ ] Multi-city route configuration
- [ ] Historical trip playback and delay analytics
- [ ] Push notifications for "bus approaching your stop"
- [ ] Offline-first PWA shell with cached route geometry
- [ ] Admin dashboard for fleet operators
- [ ] Crowd-sourced occupancy reporting

---

## 🤝 Contributing

Contributions are welcome. To propose a change:

1. Fork the repository
2. Create a feature branch — `git checkout -b feature/your-feature`
3. Commit your changes — `git commit -m "Add your feature"`
4. Push the branch — `git push origin feature/your-feature`
5. Open a Pull Request

For larger changes, please open an issue first to discuss the approach.

---

## 📄 License

Released under the MIT License. See [`LICENSE`](LICENSE) for details.

---

## 🙏 Acknowledgements

- [OpenStreetMap](https://www.openstreetmap.org/) contributors for map data
- [OSRM](http://project-osrm.org/) for routing geometry
- [Leaflet.js](https://leafletjs.com/) for lightweight interactive maps

---

<div align="center">

**Built for the commuters who deserve to know when the bus is coming.**

</div>
