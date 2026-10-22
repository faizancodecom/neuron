import os
import json
import time
import threading
from flask import Flask, render_template, request, jsonify, Response
from flask_sock import Sock
from werkzeug.utils import secure_filename

from engine import SimulationEngine, get_preset_map, NeuralNetwork

app = Flask(__name__)
sock = Sock(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, 'saved_models')
MAPS_DIR = os.path.join(BASE_DIR, 'saved_maps')

os.makedirs(MODELS_DIR, exist_ok=True)
os.makedirs(MAPS_DIR, exist_ok=True)

# -------------------------------------------------------------
# Initialize Live Python AI Simulation Engine
# -------------------------------------------------------------
engine = SimulationEngine(population_size=80, mutation_rate=0.12, episode_duration=28)
engine_lock = threading.Lock()


def simulation_worker():
    """
    Background worker executing the Python AI neural network loop.
    Prints terminal outputs and advances generations continuously.
    """
    target_dt = 1.0 / 60.0  # 60 FPS physics tick
    while True:
        t0 = time.time()
        with engine_lock:
            if engine.is_running:
                # Execute speed_multiplier steps per tick
                for _ in range(engine.speed_multiplier):
                    engine.step()

        elapsed = time.time() - t0
        sleep_time = max(0.001, target_dt - elapsed)
        time.sleep(sleep_time)


# Start the background Python AI simulation thread
sim_thread = threading.Thread(target=simulation_worker, daemon=True, name="Python-AI-Engine")
sim_thread.start()


# -------------------------------------------------------------
# WebSocket: Real-Time Stream to HTML Frontend
# -------------------------------------------------------------
@sock.route('/ws')
def ws_stream(ws):
    """
    Real-time bidirectional WebSocket stream between Python AI and HTML frontend.
    Sends car coordinates, neural network decisions, and telemetry at ~30-60 FPS.
    """
    print("[WEBSOCKET] HTML client connected to Python AI stream.")
    try:
        while True:
            # Check for incoming client commands (non-blocking)
            try:
                msg = ws.receive(timeout=0.033)
                if msg:
                    payload = json.loads(msg)
                    handle_client_action(payload)
            except Exception:
                pass

            # Capture current Python AI engine state
            with engine_lock:
                state = engine.get_state()

            # Push state frame to HTML frontend
            ws.send(json.dumps(state))

    except Exception as e:
        pass
    finally:
        print("[WEBSOCKET] HTML client disconnected.")


def handle_client_action(payload):
    """
    Processes user actions triggered from HTML interface.
    """
    action = payload.get('action')
    with engine_lock:
        if action == 'toggle_pause':
            engine.toggle_pause()
        elif action == 'set_speed':
            engine.set_speed(payload.get('speed', 1))
        elif action == 'set_population':
            engine.set_population(payload.get('size', 80))
        elif action == 'set_map_preset':
            preset_id = payload.get('preset', 'boulevard')
            data = get_preset_map(preset_id)
            engine.set_map(data)
        elif action == 'set_custom_map':
            map_data = payload.get('map_data')
            if map_data:
                engine.set_map(map_data)
        elif action == 'reset':
            engine.reset()
        elif action == 'apply_brain':
            brain_data = payload.get('brain')
            if brain_data:
                brain = NeuralNetwork.from_dict(brain_data)
                if brain:
                    engine.apply_trained_brain(brain)


# -------------------------------------------------------------
# HTTP Routes
# -------------------------------------------------------------
@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/state', methods=['GET'])
def get_state():
    with engine_lock:
        return jsonify(engine.get_state())


@app.route('/api/command', methods=['POST'])
def post_command():
    payload = request.get_json(force=True, silent=True)
    if payload:
        handle_client_action(payload)
        return jsonify({'success': True})
    return jsonify({'success': False, 'error': 'No payload'}), 400


@app.route('/api/status')
def status():
    return jsonify({
        'status': 'online',
        'service': 'Neuron AI Autonomous Driving Lab (Python Engine Active)',
        'version': '2.0.0',
        'generation': engine.generation,
        'population': len(engine.cars),
        'saved_models_count': len([f for f in os.listdir(MODELS_DIR) if f.endswith('.json')]),
        'saved_maps_count': len([f for f in os.listdir(MAPS_DIR) if f.endswith('.json')])
    })


@app.route('/api/models', methods=['GET'])
def list_models():
    models = []
    for filename in sorted(os.listdir(MODELS_DIR), reverse=True):
        if filename.endswith('.json'):
            filepath = os.path.join(MODELS_DIR, filename)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    models.append({
                        'filename': filename,
                        'name': data.get('name', filename),
                        'generation': data.get('generation', 0),
                        'fitness': data.get('fitness', 0),
                        'timestamp': data.get('timestamp', os.path.getmtime(filepath)),
                        'date_str': data.get('date_str', time.ctime(os.path.getmtime(filepath))),
                        'map_name': data.get('map_name', 'Unknown')
                    })
            except Exception as e:
                models.append({
                    'filename': filename,
                    'name': filename,
                    'error': str(e)
                })
    return jsonify({'success': True, 'models': models})


@app.route('/api/save_model', methods=['POST'])
def save_model():
    payload = request.get_json(force=True, silent=True)
    if not payload or 'brain' not in payload:
        return jsonify({'success': False, 'error': 'Missing brain payload'}), 400

    name = payload.get('name', 'model').strip()
    safe_name = secure_filename(name.replace(' ', '_'))
    if not safe_name:
        safe_name = f"model_{int(time.time())}"

    filename = f"{safe_name}_{int(time.time())}.json"
    filepath = os.path.join(MODELS_DIR, filename)

    record = {
        'name': payload.get('name', safe_name),
        'generation': payload.get('generation', engine.generation),
        'fitness': round(float(payload.get('fitness', engine.champion_fitness)), 2),
        'timestamp': time.time(),
        'date_str': time.strftime("%Y-%m-%d %H:%M:%S"),
        'map_name': payload.get('map_name', engine.map_data.get('name', 'Default')),
        'brain': payload.get('brain')
    }

    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(record, f, indent=2)

    print(f"[PERSISTENCE] Saved trained brain '{record['name']}' to {filename}")
    return jsonify({'success': True, 'filename': filename, 'record': record})


@app.route('/api/load_model/<filename>', methods=['GET'])
def load_model(filename):
    safe_name = secure_filename(filename)
    filepath = os.path.join(MODELS_DIR, safe_name)
    if not os.path.exists(filepath):
        return jsonify({'success': False, 'error': 'Model not found'}), 404

    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)

    if 'brain' in data:
        with engine_lock:
            brain = NeuralNetwork.from_dict(data['brain'])
            if brain:
                engine.apply_trained_brain(brain)
        print(f"[PERSISTENCE] Loaded and deployed brain model: {data.get('name')}")

    return jsonify({'success': True, 'model': data})


@app.route('/api/delete_model/<filename>', methods=['DELETE', 'POST'])
def delete_model(filename):
    safe_name = secure_filename(filename)
    filepath = os.path.join(MODELS_DIR, safe_name)
    if os.path.exists(filepath):
        os.remove(filepath)
        return jsonify({'success': True, 'message': f'Deleted {safe_name}'})
    return jsonify({'success': False, 'error': 'Model not found'}), 404


@app.route('/api/maps', methods=['GET'])
def list_maps():
    maps = []
    for filename in sorted(os.listdir(MAPS_DIR)):
        if filename.endswith('.json'):
            filepath = os.path.join(MAPS_DIR, filename)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    maps.append({
                        'filename': filename,
                        'name': data.get('name', filename),
                        'data': data.get('data')
                    })
            except Exception:
                pass
    return jsonify({'success': True, 'maps': maps})


@app.route('/api/save_map', methods=['POST'])
def save_map():
    payload = request.get_json(force=True, silent=True)
    if not payload or 'name' not in payload or 'data' not in payload:
        return jsonify({'success': False, 'error': 'Invalid map data'}), 400

    safe_name = secure_filename(payload['name'].replace(' ', '_'))
    if not safe_name:
        safe_name = f"map_{int(time.time())}"

    filename = f"{safe_name}.json"
    filepath = os.path.join(MAPS_DIR, filename)
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(payload, f, indent=2)

    print(f"[PERSISTENCE] Saved custom track layout: '{payload['name']}'")
    return jsonify({'success': True, 'filename': filename})


@app.route('/api/load_map/<filename>', methods=['GET'])
def load_map(filename):
    safe_name = secure_filename(filename)
    filepath = os.path.join(MAPS_DIR, safe_name)
    if not os.path.exists(filepath):
        return jsonify({'success': False, 'error': 'Map not found'}), 404
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
    return jsonify({'success': True, 'map': data})


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
