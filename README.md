# NetMonitor Pro v2.0 – Network Monitoring Dashboard

## 📌 Overview

NetMonitor is a real-time local network monitoring dashboard designed for Windows systems. It provides deep insights into active connections, bandwidth usage, latency, connected devices, and basic security indicators.

The application is built using a modern full-stack architecture with a focus on performance, real-time updates, and a clean user interface.

---

## 🏗️ Architecture

### Frontend

* React (Vite)
* Tailwind CSS
* Recharts (data visualization)
* Framer Motion (animations)

### Backend

* Node.js
* Express.js
* WebSocket (real-time communication)
* systeminformation (system metrics)
* Native Windows tools:

  * `netstat`
  * `arp`

---

## ⚙️ How It Works

### Backend (server.js)

The backend collects and processes network data every 3 seconds and pushes updates via WebSocket.

#### Data Sources:

* **Active Connections**

  * `netstat -n -p TCP`
* **Device Discovery**

  * `arp -a`
* **Bandwidth Stats**

  * `systeminformation.networkStats()`
* **Internet Latency**

  * `systeminformation.inetLatency('8.8.8.8')`

#### WebSocket Payload (`NETWORK_UPDATE`)

```json
{
  "connections": [],
  "bandwidth": {},
  "internet": {},
  "devices": []
}
```

---

### Frontend (App.jsx)

* Establishes WebSocket connection to `ws://localhost:3001`
* Stores incoming data in React state:

  * `connections`
  * `devices`
  * `internet`
  * `bandwidthHistory`
  * `stats`

#### Derived Data (useMemo):

* Protocol categorization (Web, DB, SSH/Admin, FTP, Other)
* Top destinations / hosts
* Alerts (latency, connection spikes)
* Server summaries
* Security insights (admin & insecure ports)

---

## 🧭 Application Pages

### 1. Dashboard

* Key metrics:

  * Network uptime
  * Active connections
  * Bandwidth (Mbps)
  * Average latency
* Charts:

  * Bandwidth usage
  * Latency trends
* Sections:

  * Protocol categories
  * Connected devices
  * Top hosts
  * Live anomalies
  * Traffic table

---

### 2. Servers

* Aggregated server list (destination IPs)
* Displays:

  * Ports used
  * Last seen timestamp
* Click to filter traffic by server
* Detailed traffic table per server

---

### 3. Network

* Summary cards:

  * Active connections
  * Unique servers
  * Devices discovered
* Live bandwidth chart
* Full traffic table

---

### 4. Analytics

* Peak download/upload stats
* Total connection count
* Protocol distribution grid

---

### 5. Alerts

* Real-time alerts:

  * High connection count
  * Latency warnings
* Visual alert cards with context

---

### 6. Security

* Security insights:

  * Admin ports (22, 23, 3389)
  * Insecure services (FTP, Telnet, SMB)
* Summary cards + guidance notes

---

## 📊 Network Traffic Table

### Features

* Displays:

  * Source IP:Port
  * Destination IP:Port
  * Protocol
  * Packets
  * Data size (KB/MB/GB)
  * Status (Active / Closed)

### Controls

* Filters: All / Active / Closed
* Search: IP, protocol, destination

### UX

* Responsive layout
* Horizontal scroll support
* Optimized column widths

---

## 🖧 Connected Devices Panel

### Displays:

* IP Address
* MAC Address
* Device Type (dynamic/static/unknown)

### Behavior:

* Auto-adjust height
* Scroll enabled when device count increases

---

## 🎨 UI & UX Design

### Styling

* Tailwind-based design system
* Animated gradient background
* Glow effects and noise overlay
* Custom themed scrollbars

### Animations

* Framer Motion:

  * Smooth card transitions
  * Table row animations
* Recharts:

  * Gradient area charts
  * Smooth transitions

### Layout

* Desktop sidebar navigation
* Mobile responsive hamburger menu

---

## 🚀 Getting Started

### 1. Install Dependencies

```bash
npm install
```

---

### 2. Start Backend

```bash
node server.js
```

* Runs on: `http://localhost:3001`

#### If port is busy:

```bash
taskkill /IM node.exe /F
```

---

### 3. Start Frontend

```bash
npm run dev
```

* Open browser at:

  ```
  http://localhost:5173
  ```

---

## 🔍 Key Capabilities

* Real-time monitoring of network connections
* Bandwidth and latency tracking
* Device discovery within local network
* Protocol-based traffic classification
* Detection of unusual patterns and anomalies
* Basic security analysis (admin & insecure ports)

---

## 💡 Use Cases

* Personal system monitoring
* Developer debugging tool
* Small network diagnostics
* Learning network behavior in real-time
* Lightweight alternative to enterprise monitoring tools

---

## 🔗 Repository

GitHub:
https://github.com/rajansingh07/Network-monitoring

---

## 📈 Future Improvements

* ICMP ping-based host monitoring
* Email / Telegram alert integration
* Role-based authentication
* Historical data storage
* AI-based anomaly detection

---

## 👨‍💻 Author

Rajan Kumar
Frontend Developer

Aditya Singh
Backend Developer

---
