from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from .processing.lidar import build_demo_frame

app = FastAPI(title="Foveated LiDAR Mapping Backend", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
state = {"heading": 180.0, "pitch": -28.0, "zoom": 1.0, "pan_x": 0.0, "pan_y": 0.0}
clients: set[WebSocket] = set()

@app.get("/api/health")
def health():
    return {"status": "ok", "service": "lidar-backend"}

@app.get("/api/frame")
def frame():
    return build_demo_frame()

@app.get("/api/state")
def get_state():
    return state

async def handle_view_socket(ws: WebSocket):
    await ws.accept()
    clients.add(ws)
    try:
        await ws.send_json({"type": "view_state", "heading": state["heading"], "pitch": state["pitch"]})
        while True:
            msg = await ws.receive_json()
            if msg.get("type") != "view_state":
                continue
            if "heading" in msg:
                state["heading"] = float(msg["heading"]) % 360.0
            if "pitch" in msg:
                state["pitch"] = float(msg["pitch"])
            if "zoom" in msg:
                state["zoom"] = float(msg["zoom"])
            if "pan_x" in msg:
                state["pan_x"] = float(msg["pan_x"])
            if "pan_y" in msg:
                state["pan_y"] = float(msg["pan_y"])
            packet = {
                "type": "view_state",
                "heading": state["heading"],
                "pitch": state["pitch"],
            }
            for client in list(clients):
                try:
                    await client.send_json(packet)
                except Exception:
                    clients.discard(client)
    except WebSocketDisconnect:
        clients.discard(ws)

@app.websocket("/ws/view")
async def ws_view(ws: WebSocket):
    await handle_view_socket(ws)

@app.websocket("/ws/state")
async def ws_state(ws: WebSocket):
    await handle_view_socket(ws)
