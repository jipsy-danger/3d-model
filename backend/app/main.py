from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from .processing.lidar import build_demo_frame

app = FastAPI(title="Foveated LiDAR Mapping Backend", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
state = {"heading": 32.0, "pitch": -28.0, "zoom": 1.0, "pan_x": 0.0, "pan_y": 0.0}
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

@app.websocket("/ws/state")
async def ws_state(ws: WebSocket):
    await ws.accept(); clients.add(ws)
    try:
        await ws.send_json({"type": "state", "state": state})
        while True:
            msg = await ws.receive_json()
            if msg.get("type") == "view_state":
                state.update({k: float(msg[k]) for k in state if k in msg})
                packet = {"type": "state", "state": state}
                for client in list(clients):
                    try: await client.send_json(packet)
                    except Exception: clients.discard(client)
    except WebSocketDisconnect:
        clients.discard(ws)
