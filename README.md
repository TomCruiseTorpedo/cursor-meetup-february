# WebXR Surgical Training MVP

A web-based immersive VR app for guided surgical skills practice. Users interact through natural 3D actions—hand gestures, controller input, and direct object manipulation—without keyboard or mouse.

## Requirements

- **WebXR-capable browser**: Chrome 79+, Edge 79+, or Firefox Reality
- **HTTPS**: WebXR requires a secure context (localhost is allowed for development)
- **VR headset** (for immersive mode): Meta Quest, Valve Index, or other WebXR-compatible device
- **Hand tracking** (optional): Meta Quest supports hand tracking; otherwise use controllers

## Running Locally

### Option 1: Simple HTTP server (development)

WebXR requires HTTPS in production. For local development, use a server that supports HTTPS or serve over localhost:

```bash
# Using Python 3
python3 -m http.server 8080

# Then open http://localhost:8080 in a WebXR-capable browser
# Note: Some WebXR features may require HTTPS even locally
```

### Option 2: HTTPS with a local certificate

For full WebXR support locally (e.g., testing on a Quest via network), use a server with HTTPS:

```bash
# Using npx (Node.js)
npx serve -s . --listen 8080
# Or with HTTPS: npx serve -s . --listen 8443 --ssl-cert cert.pem --ssl-key key.pem
```

## Deployment

### GitHub Pages

1. Push this repository to GitHub.
2. Go to **Settings → Pages**.
3. Set **Source** to `main` (or your default branch) and `/` (root).
4. Save. The site will be available at `https://<username>.github.io/<repo>/`.

### Netlify

1. Connect the repository to Netlify.
2. Set **Build command** to empty (static site).
3. Set **Publish directory** to `.` (root).
4. Deploy.

## Input Patterns

| Input | Action |
|-------|--------|
| **Desktop (mouse/trackpad)** | Point at the needle, click and hold, then drag. Release over each green circle to complete each suture pass. |
| **Hand tracking (pinch)** | Pinch to grab the needle. Release over each green target zone. |
| **Controllers** | Use trigger to select (laser-controls). Full grab support requires hand tracking. |
| **Enter VR** | Click "Enter VR" in the browser, or use the headset’s browser to open the URL. |

## Guided Procedure (7 Steps)

1. **Pick up the needle** – Point, click and hold, then drag.
2. **First pass** – Drag to the LEFT green circle on the wound, then release.
3. **Second pass** – Drag to the RIGHT green circle (criss-cross), then release.
4. **Third pass** – Drag to the CENTER green circle, then release.
5. **Complete** – Success sound and completion message.

## Project Structure

```
├── index.html           # Main scene and entities
├── js/
│   ├── surgical-guide.js   # State machine and procedure logic
│   └── desktop-drag.js     # Mouse/trackpad drag for desktop
├── assets/
│   ├── models/          # glTF models (placeholders used for MVP)
│   └── audio/           # Audio assets (optional)
└── README.md
```

## Technology

- [A-Frame](https://aframe.io/) 1.7.0
- [WebXR Device API](https://immersiveweb.dev/)
- Hand tracking (pinch-to-grab) and laser controls (controller fallback)

## License

Apache-2.0
