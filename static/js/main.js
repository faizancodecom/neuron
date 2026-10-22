/**
 * NEURON - Frontend Controller & Real-Time Python AI Bridge
 * Streams simulation state, neural activations, and car telemetry directly from the Python AI engine.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Canvas Elements
    const simCanvas = document.getElementById('simCanvas');
    const simCtx = simCanvas.getContext('2d');

    const networkCanvas = document.getElementById('networkCanvas');
    const networkCtx = networkCanvas ? networkCanvas.getContext('2d') : null;

    const networkDetailCanvas = document.getElementById('networkDetailCanvas');
    const networkDetailCtx = networkDetailCanvas ? networkDetailCanvas.getContext('2d') : null;

    const chartCanvas = document.getElementById('chartCanvas');
    const chartCtx = chartCanvas ? chartCanvas.getContext('2d') : null;

    const editorCanvas = document.getElementById('editorCanvas');
    const editorCtx = editorCanvas ? editorCanvas.getContext('2d') : null;

    // Systems & Sound
    const mapSystem = new MapSystem();
    const sound = new SoundSystem();

    // Latest State from Python AI Engine
    let latestState = null;
    let lastGenRecorded = 0;
    let prevParkedCount = 0;
    let lastNetworkDrawTime = 0;

    // Viewport & Camera
    let camera = { x: 400, y: 500, zoom: 0.95 };
    let isDragging = false;
    let dragStart = { x: 0, y: 0 };
    let cameraMode = 'follow';

    // Controls State
    let isWarp = false;
    let isRunning = true;

    // Track Editor State
    let activeEditorTool = 'add_barrier_h';
    let editorMousePos = { x: 400, y: 500 };
    let editorMapData = null;
    let customSavedMaps = [];

    // Resize handlers
    function resizeCanvases() {
        const simContainer = document.getElementById('canvasContainer');
        if (simContainer && simCanvas) {
            simCanvas.width = simContainer.clientWidth;
            simCanvas.height = simContainer.clientHeight;
        }

        const netBox = document.querySelector('.neuron-card-body');
        if (netBox && networkCanvas) {
            networkCanvas.width = netBox.clientWidth;
            networkCanvas.height = netBox.clientHeight;
        }

        const netLargeWrap = document.querySelector('.neuron-large-canvas-wrap');
        if (netLargeWrap && networkDetailCanvas) {
            networkDetailCanvas.width = netLargeWrap.clientWidth;
            networkDetailCanvas.height = netLargeWrap.clientHeight;
        }

        const chartWrap = document.querySelector('.chart-canvas-wrap');
        if (chartWrap && chartCanvas) {
            chartCanvas.width = chartWrap.clientWidth;
            chartCanvas.height = chartWrap.clientHeight;
        }
    }

    window.addEventListener('resize', resizeCanvases);
    resizeCanvases();

    // -------------------------------------------------------------
    // WebSocket Connection to Python AI Engine
    // -------------------------------------------------------------
    let socket = null;
    let socketConnected = false;

    function connectWebSocket() {
        const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${location.host}/ws`;

        socket = new WebSocket(wsUrl);

        socket.onopen = () => {
            socketConnected = true;
            setText('hudEngineStatus', 'PYTHON LIVE [WS]');
            setText('simStatusText', 'PYTHON NEUROEVOLUTION ENGINE STREAMING');
        };

        socket.onmessage = (event) => {
            try {
                const state = JSON.parse(event.data);
                onPythonStateReceived(state);
            } catch (err) {
                console.error("Error parsing Python state frame:", err);
            }
        };

        socket.onclose = () => {
            socketConnected = false;
            setText('hudEngineStatus', 'RECONNECTING...');
            setText('simStatusText', 'WS DISCONNECTED &ndash; RECONNECTING TO PYTHON...');
            setTimeout(connectWebSocket, 1500);
        };

        socket.onerror = (err) => {
            socketConnected = false;
        };
    }

    function sendCommand(cmd) {
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify(cmd));
        } else {
            // Fallback to HTTP POST
            fetch('/api/command', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cmd)
            }).catch(() => {});
        }
    }

    connectWebSocket();

    // -------------------------------------------------------------
    // Python State Processing & Render Trigger
    // -------------------------------------------------------------
    function onPythonStateReceived(state) {
        latestState = state;

        // Sound cues based on Python AI state
        if (state.parked > prevParkedCount) {
            sound.playParkedFanfare();
        }
        prevParkedCount = state.parked;

        if (state.generation !== lastGenRecorded) {
            if (lastGenRecorded > 0) sound.playGenTick();
            lastGenRecorded = state.generation;
            prevParkedCount = 0;
        }

        // Sync local running state
        if (state.isRunning !== undefined && state.isRunning !== isRunning) {
            isRunning = state.isRunning;
            updatePlayButtonUI();
        }

        // Update HUD metrics
        updateHUDFromState(state);

        // Render Neural Network Visualizer (throttled to save CPU & avoid lag)
        const now = performance.now();
        if (networkCtx && state.leader && state.leader.brain && (now - lastNetworkDrawTime > 160)) {
            lastNetworkDrawTime = now;
            Visualizer.drawNetwork(networkCtx, state.leader.brain, false);
        }

        // Render Expanded Modal (if active)
        const neuronModal = document.getElementById('neuronDetailModal');
        if (neuronModal && neuronModal.classList.contains('open')) {
            if (networkDetailCtx && state.leader && state.leader.brain) {
                Visualizer.drawNetwork(networkDetailCtx, state.leader.brain, true);
            }
            if (chartCtx && state.fitnessHistory) {
                Visualizer.drawFitnessChart(chartCtx, state.fitnessHistory);
            }
            updateDetailModalStats(state);
        }
    }

    // -------------------------------------------------------------
    // Independent 60 FPS Animation & Render Loop
    // Guarantees smooth camera navigation and prevents freezing
    // -------------------------------------------------------------
    function renderLoop() {
        if (latestState) {
            renderSimulationFrame(latestState);
        }
        requestAnimationFrame(renderLoop);
    }
    requestAnimationFrame(renderLoop);

    // -------------------------------------------------------------
    // Render Simulation Canvas (Using Python Coordinates)
    // -------------------------------------------------------------
    function renderSimulationFrame(state) {
        simCtx.clearRect(0, 0, simCanvas.width, simCanvas.height);
        simCtx.save();

        // Camera Transform
        if (cameraMode === 'follow' && state.leader) {
            camera.x = lerp(camera.x, state.leader.x, 0.12);
            camera.y = lerp(camera.y, state.leader.y, 0.12);
            camera.zoom = lerp(camera.zoom, 1.15, 0.05);
        }

        simCtx.translate(simCanvas.width / 2, simCanvas.height / 2);
        simCtx.scale(camera.zoom, camera.zoom);
        simCtx.translate(-camera.x, -camera.y);

        // 1. Draw Map System with Live Traffic Light State
        mapSystem.draw(simCtx, state.trafficLights || []);

        // 2. Draw Leader Trail from Python
        if (state.leader && state.leader.trail && state.leader.trail.length > 1) {
            simCtx.save();
            simCtx.beginPath();
            simCtx.strokeStyle = "rgba(255, 255, 255, 0.25)";
            simCtx.lineWidth = 1.5;
            const t = state.leader.trail;
            for (let i = 0; i < t.length; i++) {
                if (i === 0) simCtx.moveTo(t[i].x, t[i].y);
                else simCtx.lineTo(t[i].x, t[i].y);
            }
            simCtx.stroke();
            simCtx.restore();
        }

        // 3. Draw All Population Cars (compact: [x, y, angle, steering_angle, status])
        // status: 0 = living, 1 = damaged, 2 = parked
        const cars = state.cars || [];
        for (let i = 0; i < cars.length; i++) {
            const car = cars[i];
            const cx = car[0];
            const cy = car[1];
            const cangle = car[2];
            const csteer = car[3] !== undefined ? car[3] : 0;
            const cstatus = car[4] !== undefined ? car[4] : (car[3] !== undefined && typeof car[3] === 'number' && Number.isInteger(car[3]) && car.length === 4 ? car[3] : 0);
            drawCarAt(simCtx, cx, cy, cangle, csteer, cstatus, false);
        }

        // 4. Draw Leader Champion Car on Top with Sensors
        if (state.leader) {
            const ld = state.leader;
            drawLeaderSensors(simCtx, ld);
            const steerAngle = ld.steering !== undefined ? ld.steering : (ld.steering_angle || 0);
            drawCarAt(simCtx, ld.x, ld.y, ld.angle, steerAngle, ld.parked ? 2 : (ld.damaged ? 1 : 0), true);
        }

        simCtx.restore();
    }

    function drawCarAt(ctx, x, y, angle, steeringAngle = 0, status = 0, isLeader = false) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(-angle);

        const w = 22;
        const h = 40;
        const steer = steeringAngle || 0;

        // -------------------------------------------------------------
        // Draw 4 Physical Wheels (Front Wheels Turn with Ackermann Steering)
        // -------------------------------------------------------------
        const wheelW = 5;
        const wheelH = 11;
        const frontY = -h * 0.30;
        const rearY = h * 0.30;
        const leftX = -w / 2 - 1.5;
        const rightX = w / 2 + 1.5;

        ctx.fillStyle = isLeader ? "#ffffff" : (status === 1 ? "#222222" : "#555555");
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 1;

        // 1. Rear-Left Wheel (Fixed Alignment)
        ctx.save();
        ctx.translate(leftX, rearY);
        ctx.fillRect(-wheelW / 2, -wheelH / 2, wheelW, wheelH);
        ctx.strokeRect(-wheelW / 2, -wheelH / 2, wheelW, wheelH);
        ctx.restore();

        // 2. Rear-Right Wheel (Fixed Alignment)
        ctx.save();
        ctx.translate(rightX, rearY);
        ctx.fillRect(-wheelW / 2, -wheelH / 2, wheelW, wheelH);
        ctx.strokeRect(-wheelW / 2, -wheelH / 2, wheelW, wheelH);
        ctx.restore();

        // 3. Front-Left Wheel (Physically turns with steering angle!)
        ctx.save();
        ctx.translate(leftX, frontY);
        ctx.rotate(steer);
        ctx.fillRect(-wheelW / 2, -wheelH / 2, wheelW, wheelH);
        ctx.strokeRect(-wheelW / 2, -wheelH / 2, wheelW, wheelH);
        ctx.restore();

        // 4. Front-Right Wheel (Physically turns with steering angle!)
        ctx.save();
        ctx.translate(rightX, frontY);
        ctx.rotate(steer);
        ctx.fillRect(-wheelW / 2, -wheelH / 2, wheelW, wheelH);
        ctx.strokeRect(-wheelW / 2, -wheelH / 2, wheelW, wheelH);
        ctx.restore();

        // -------------------------------------------------------------
        // Draw Car Body (High Contrast Sharp Monochrome)
        // -------------------------------------------------------------
        if (isLeader) {
            ctx.globalAlpha = 1.0;
            // Leader Body: Crisp White
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(-w / 2, -h / 2, w, h);
            ctx.strokeStyle = "#000000";
            ctx.lineWidth = 2;
            ctx.strokeRect(-w / 2, -h / 2, w, h);

            // Windshield
            ctx.fillStyle = "#0a0a0a";
            ctx.fillRect(-w * 0.35, -h * 0.28, w * 0.7, h * 0.22);

            // Headlights & Projection Beam
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(-w * 0.45, -h * 0.48, 4, 3);
            ctx.fillRect(w * 0.45 - 4, -h * 0.48, 4, 3);

            if (!status) {
                const beamGrad = ctx.createLinearGradient(0, -h * 0.5, 0, -h * 2.5);
                beamGrad.addColorStop(0, "rgba(255, 255, 255, 0.35)");
                beamGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
                ctx.fillStyle = beamGrad;
                ctx.beginPath();
                ctx.moveTo(-w * 0.4, -h * 0.5);
                ctx.lineTo(-w * 1.3, -h * 2.5);
                ctx.lineTo(w * 1.3, -h * 2.5);
                ctx.lineTo(w * 0.4, -h * 0.5);
                ctx.closePath();
                ctx.fill();
            }

            // Center pip
            ctx.fillStyle = "#000000";
            ctx.fillRect(-2, -2, 4, 4);

        } else if (status === 2) {
            // Parked Car
            ctx.globalAlpha = 0.95;
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(-w / 2, -h / 2, w, h);
            ctx.strokeStyle = "#000000";
            ctx.lineWidth = 2;
            ctx.strokeRect(-w / 2, -h / 2, w, h);
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 1;
            ctx.strokeRect(-w / 2 - 2, -h / 2 - 2, w + 4, h + 4);

        } else if (status === 1) {
            // Damaged Car
            ctx.globalAlpha = 0.12;
            ctx.fillStyle = "#181818";
            ctx.fillRect(-w / 2, -h / 2, w, h);
            ctx.strokeStyle = "#333333";
            ctx.lineWidth = 1;
            ctx.strokeRect(-w / 2, -h / 2, w, h);

        } else {
            // Normal Living Car
            ctx.globalAlpha = 0.28;
            ctx.fillStyle = "#222222";
            ctx.fillRect(-w / 2, -h / 2, w, h);
            ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
            ctx.lineWidth = 1;
            ctx.strokeRect(-w / 2, -h / 2, w, h);

            // Windshield
            ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
            ctx.fillRect(-w * 0.35, -h * 0.28, w * 0.7, h * 0.22);
        }

        ctx.restore();
    }

    function drawLeaderSensors(ctx, leader) {
        if (!leader.sensors) return;
        const rayCount = leader.sensors.length;
        const raySpread = Math.PI * 0.85;
        const rayLength = 220;

        ctx.save();
        for (let i = 0; i < rayCount; i++) {
            const t = rayCount === 1 ? 0.5 : i / (rayCount - 1);
            const rayAngle = lerp(raySpread / 2.0, -raySpread / 2.0, t) + leader.angle;

            const startX = leader.x + Math.sin(leader.angle) * (40 * 0.45);
            const startY = leader.y - Math.cos(leader.angle) * (40 * 0.45);

            const proximity = leader.sensors[i]; // 0 when open, 1 when touching
            const effectiveLen = (1.0 - proximity) * rayLength;

            const hitX = startX - Math.sin(rayAngle) * effectiveLen;
            const hitY = startY + Math.cos(rayAngle) * effectiveLen;

            // Ray Line
            ctx.beginPath();
            ctx.lineWidth = proximity > 0.7 ? 2 : 1;
            ctx.strokeStyle = proximity > 0 ? "rgba(255, 255, 255, 0.55)" : "rgba(255, 255, 255, 0.12)";
            ctx.moveTo(startX, startY);
            ctx.lineTo(hitX, hitY);
            ctx.stroke();

            // Hit Pip
            if (proximity > 0.01) {
                ctx.beginPath();
                ctx.arc(hitX, hitY, 3, 0, Math.PI * 2);
                ctx.fillStyle = "#ffffff";
                ctx.fill();

                if (proximity > 0.75) {
                    ctx.strokeStyle = "#ffffff";
                    ctx.lineWidth = 1;
                    ctx.strokeRect(hitX - 4, hitY - 4, 8, 8);
                }
            }
        }
        ctx.restore();
    }

    // -------------------------------------------------------------
    // HUD & Metrics
    // -------------------------------------------------------------
    function updateHUDFromState(state) {
        setText('hudGen', state.generation);
        setText('hudAlive', `${state.alive} / ${state.total}`);
        setText('hudParked', state.parked);
        setText('hudBestFit', state.bestFitness);
        setText('hudChampionFit', state.championFitness);
        setText('hudDist', state.distanceToTarget ? `${state.distanceToTarget}px` : '--');
        setText('hudTimer', `${state.timeRemaining}s`);

        const speedCar = state.leader ? Math.abs(state.leader.speed).toFixed(1) : "0.0";
        setText('hudSpeed', `${speedCar} px/f`);
    }

    function updateDetailModalStats(state) {
        setText('detailGen', state.generation);
        setText('detailChampFit', state.championFitness || state.bestFitness);
        setText('detailParkedTotal', state.parked);
        const successRate = state.total > 0 ? ((state.parked / state.total) * 100).toFixed(1) : "0.0";
        setText('detailSuccessRate', `${successRate}%`);
        setText('detailPopSize', `${state.total} CARS`);
    }

    function setText(id, text) {
        const el = document.getElementById(id);
        if (el && el.innerText !== String(text)) {
            el.innerText = text;
        }
    }

    // -------------------------------------------------------------
    // Essential Controls (Commands to Python AI)
    // -------------------------------------------------------------

    // 1. Play / Pause
    const btnPlay = document.getElementById('btnPlay');
    const playIcon = document.getElementById('playIcon');
    const playText = document.getElementById('playText');

    function updatePlayButtonUI() {
        if (isRunning) {
            btnPlay.classList.add('active');
            playIcon.innerHTML = `<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;
            playText.innerText = "PAUSE";
            setText('simStatusText', isWarp ? 'WARP SPEED (40X) ACTIVE IN PYTHON' : 'PYTHON AI ENGINE EXECUTING');
        } else {
            btnPlay.classList.remove('active');
            playIcon.innerHTML = `<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`;
            playText.innerText = "START";
            setText('simStatusText', 'PYTHON SIMULATION PAUSED');
        }
    }

    btnPlay.addEventListener('click', () => {
        isRunning = !isRunning;
        sendCommand({ action: 'toggle_pause' });
        updatePlayButtonUI();
    });

    // 2. Unified Speed & Population Settings Modal
    const btnSpeedConfig = document.getElementById('btnSpeedConfig');
    const speedConfigModal = document.getElementById('speedConfigModal');
    const simSpeedGrid = document.getElementById('simSpeedGrid');
    const popSizeGrid = document.getElementById('popSizeGrid');
    const btnApplySpeedSettings = document.getElementById('btnApplySpeedSettings');
    const btnReplayFromSettings = document.getElementById('btnReplayFromSettings');
    const speedConfigLabel = document.getElementById('speedConfigLabel');

    let currentSpeed = 1.0;
    let currentPopSize = 40;

    if (btnSpeedConfig && speedConfigModal) {
        btnSpeedConfig.addEventListener('click', () => {
            speedConfigModal.classList.add('open');
        });
    }

    if (simSpeedGrid) {
        const speedPills = simSpeedGrid.querySelectorAll('.speed-pill');
        speedPills.forEach(pill => {
            pill.addEventListener('click', () => {
                speedPills.forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                currentSpeed = parseFloat(pill.dataset.speed) || 1.0;
            });
        });
    }

    if (popSizeGrid) {
        const popPills = popSizeGrid.querySelectorAll('.pop-pill');
        popPills.forEach(pill => {
            pill.addEventListener('click', () => {
                popPills.forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                currentPopSize = parseInt(pill.dataset.size) || 40;
            });
        });
    }

    if (btnApplySpeedSettings) {
        btnApplySpeedSettings.addEventListener('click', () => {
            if (speedConfigModal) speedConfigModal.classList.remove('open');
            sendCommand({ action: 'set_speed', speed: currentSpeed });
            sendCommand({ action: 'set_population', size: currentPopSize });
            if (speedConfigLabel) speedConfigLabel.innerText = `SPEED: ${currentSpeed}X`;
            showToast(`Applied Settings: ${currentSpeed}X Speed | ${currentPopSize} Cars`);
        });
    }

    if (btnReplayFromSettings) {
        btnReplayFromSettings.addEventListener('click', () => {
            if (speedConfigModal) speedConfigModal.classList.remove('open');
            sendCommand({ action: 'replay', speed: currentSpeed });
            sendCommand({ action: 'set_population', size: currentPopSize });
            if (speedConfigLabel) speedConfigLabel.innerText = `SPEED: ${currentSpeed}X`;
            showToast(`Replaying simulation at ${currentSpeed}X speed (${currentPopSize} cars)...`);
        });
    }

    // 3. Reset Simulation
    const btnReset = document.getElementById('btnReset');
    if (btnReset) {
        btnReset.addEventListener('click', () => {
            if (confirm("Reset current simulation data and restart Python AI at Generation 1?")) {
                sendCommand({ action: 'reset' });
                showToast("Python AI reset to Generation 1.");
            }
        });
    }

    // 5. Audio Toggle (optional if present)
    const btnAudio = document.getElementById('btnAudio');
    if (btnAudio) {
        function updateAudioIcon() {
            if (sound.isMuted()) {
                btnAudio.classList.add('muted');
                btnAudio.title = "Unmute Audio";
            } else {
                btnAudio.classList.remove('muted');
                btnAudio.title = "Mute Audio";
            }
        }
        updateAudioIcon();
        btnAudio.addEventListener('click', () => {
            sound.toggleMute();
            updateAudioIcon();
        });
    }

    // -------------------------------------------------------------
    // Canvas Navigation (STRICTLY LOCKED FROM EDITING)
    // -------------------------------------------------------------
    simCanvas.addEventListener('mousedown', (e) => {
        isDragging = true;
        cameraMode = 'free';
        dragStart = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mousemove', (e) => {
        if (isDragging) {
            const dx = (e.clientX - dragStart.x) / camera.zoom;
            const dy = (e.clientY - dragStart.y) / camera.zoom;
            camera.x -= dx;
            camera.y -= dy;
            dragStart = { x: e.clientX, y: e.clientY };
        }
    });

    window.addEventListener('mouseup', () => {
        isDragging = false;
    });

    simCanvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomDelta = e.deltaY < 0 ? 1.1 : 0.9;
        camera.zoom = Math.max(0.4, Math.min(2.5, camera.zoom * zoomDelta));
    }, { passive: false });

    simCanvas.addEventListener('dblclick', () => {
        cameraMode = 'follow';
        showToast("Camera locked to leader car.");
    });

    // -------------------------------------------------------------
    // Expanded Neuron Map Modal (Bada karne pe poori information)
    // -------------------------------------------------------------
    const neuronPreviewCard = document.getElementById('neuronPreviewCard');
    const neuronDetailModal = document.getElementById('neuronDetailModal');
    const btnExpandNetwork = document.getElementById('btnExpandNetwork');

    function openNeuronDetailModal() {
        neuronDetailModal.classList.add('open');
        resizeCanvases();
        if (latestState && latestState.leader && latestState.leader.brain && networkDetailCtx) {
            Visualizer.drawNetwork(networkDetailCtx, latestState.leader.brain, true);
        }
        if (latestState && latestState.fitnessHistory && chartCtx) {
            Visualizer.drawFitnessChart(chartCtx, latestState.fitnessHistory);
        }
    }

    if (neuronPreviewCard) {
        neuronPreviewCard.addEventListener('click', openNeuronDetailModal);
    }
    if (btnExpandNetwork) {
        btnExpandNetwork.addEventListener('click', (e) => {
            e.stopPropagation();
            openNeuronDetailModal();
        });
    }

    // -------------------------------------------------------------
    // Map Studio Modal (Thumbnails Gallery + Obstacle Studio)
    // -------------------------------------------------------------
    const mapStudioModal = document.getElementById('mapStudioModal');
    const btnOpenMapModal = document.getElementById('btnOpenMapModal');
    const tabMapList = document.getElementById('tabMapList');
    const tabMapEditor = document.getElementById('tabMapEditor');
    const viewMapGallery = document.getElementById('viewMapGallery');
    const viewMapEditor = document.getElementById('viewMapEditor');
    const mapThumbnailsGrid = document.getElementById('mapThumbnailsGrid');

    const PRESETS = [
        { id: 'city', title: 'Metro City Grid', description: 'Full urban grid with multi-lane avenues, 4 intersections, traffic signals, and destination hub.', presetId: 'city' },
        { id: 'boulevard', title: 'Downtown Boulevard', description: 'Straight highway with dual sidewalk streetlights and traffic chicanes.', presetId: 'boulevard' },
        { id: 'chicane', title: 'Neon Highway Chicane', description: 'Winding S-curve mountain track with curved barriers.', presetId: 'chicane' },
        { id: 'maze', title: 'Cyber Alley Maze', description: 'Tight 90-degree urban corridor with obstacle dividers.', presetId: 'maze' },
        { id: 'plaza', title: 'Multi-Stall Plaza', description: 'Realistic parking lot challenge with parked vehicle obstacles.', presetId: 'plaza' }
    ];

    btnOpenMapModal.addEventListener('click', () => {
        mapStudioModal.classList.add('open');
        switchModalTab('gallery');
        renderThumbnailsGallery();
    });

    function switchModalTab(tab) {
        if (tab === 'gallery') {
            tabMapList.classList.add('active');
            tabMapEditor.classList.remove('active');
            viewMapGallery.style.display = 'flex';
            viewMapEditor.style.display = 'none';
            document.getElementById('mapModalTitle').innerText = 'SELECT TRACK ENVIRONMENT';
        } else {
            tabMapEditor.classList.add('active');
            tabMapList.classList.remove('active');
            viewMapGallery.style.display = 'none';
            viewMapEditor.style.display = 'flex';
            document.getElementById('mapModalTitle').innerText = 'TACTICAL OBSTACLE STUDIO';
            initEditorWorkspace();
        }
    }

    tabMapList.addEventListener('click', () => switchModalTab('gallery'));
    tabMapEditor.addEventListener('click', () => switchModalTab('editor'));

    function renderThumbnailsGallery() {
        mapThumbnailsGrid.innerHTML = '';
        const allMaps = [...PRESETS, ...customSavedMaps];

        allMaps.forEach(mapItem => {
            const card = document.createElement('div');
            card.className = `map-thumb-card ${mapSystem.currentMapId === mapItem.id ? 'active-map' : ''}`;
            
            card.innerHTML = `
                <div class="map-thumb-canvas-box">
                    <canvas class="map-thumb-canvas" width="220" height="180"></canvas>
                </div>
                <div class="map-card-info">
                    <div class="map-card-title">${escapeHtml(mapItem.title)}</div>
                    <div class="map-card-meta">${escapeHtml(mapItem.description || 'Custom User Track')}</div>
                </div>
                <div style="display:flex; gap: 6px; margin-top: auto;">
                    <button class="btn btn-sharp btn-primary btn-block btn-select-map" style="flex:1;">
                        ${mapSystem.currentMapId === mapItem.id ? 'ACTIVE' : 'SELECT TRACK'}
                    </button>
                    ${mapItem.isCustom ? `<button class="btn btn-sharp btn-danger btn-del-map" title="Delete Track">&times;</button>` : ''}
                </div>
            `;

            const thumbCanvas = card.querySelector('.map-thumb-canvas');
            if (mapItem.presetId) {
                MapSystem.drawThumbnail(thumbCanvas, mapItem.presetId);
            } else if (mapItem.data) {
                MapSystem.drawThumbnail(thumbCanvas, mapItem.data);
            }

            card.querySelector('.btn-select-map').addEventListener('click', (e) => {
                e.stopPropagation();
                deployTrack(mapItem);
            });
            card.addEventListener('click', () => {
                deployTrack(mapItem);
            });

            if (mapItem.isCustom) {
                card.querySelector('.btn-del-map').addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (confirm(`Delete custom track "${mapItem.title}"?`)) {
                        deleteCustomTrack(mapItem.id);
                    }
                });
            }

            mapThumbnailsGrid.appendChild(card);
        });
    }

    function deployTrack(mapItem) {
        if (mapItem.presetId) {
            mapSystem.loadPreset(mapItem.presetId);
            sendCommand({ action: 'set_map_preset', preset: mapItem.presetId });
        } else if (mapItem.data) {
            mapSystem.loadCustomMap(mapItem.data);
            sendCommand({ action: 'set_custom_map', map_data: mapItem.data });
        }
        
        mapStudioModal.classList.remove('open');
        document.getElementById('activeMapBadge').innerText = `[ ${mapItem.title.toUpperCase()} ]`;
        showToast(`Sent "${mapItem.title}" to Python AI Engine.`);
    }

    // -------------------------------------------------------------
    // Tactical Obstacle Studio (place obstacle add)
    // -------------------------------------------------------------
    document.getElementById('btnCreateNewTrackTop').addEventListener('click', () => {
        editorMapData = {
            name: `Track_${Date.now().toString().slice(-4)}`,
            spawnPoint: { x: 400, y: 910, angle: 0.0 },
            target: { x: 400, y: 110, radius: 46, name: "Parking Bay Target" },
            roadBorders: [
                [{ x: 120, y: 950 }, { x: 120, y: 60 }],
                [{ x: 680, y: 950 }, { x: 680, y: 60 }],
                [{ x: 120, y: 950 }, { x: 680, y: 950 }],
                [{ x: 120, y: 60 }, { x: 680, y: 60 }]
            ],
            obstacles: [],
            checkpoints: []
        };
        document.getElementById('customMapNameInput').value = editorMapData.name;
        switchModalTab('editor');
    });

    document.getElementById('btnBackToGallery').addEventListener('click', () => {
        switchModalTab('gallery');
        renderThumbnailsGallery();
    });

    function initEditorWorkspace() {
        if (!editorMapData) {
            editorMapData = mapSystem.getMapData();
            document.getElementById('customMapNameInput').value = editorMapData.name || 'Custom Course';
        }
        updateEditorStats();
        drawEditorCanvas();
    }

    const toolButtons = document.querySelectorAll('.tool-btn');
    toolButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            toolButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeEditorTool = btn.dataset.tool;
            drawEditorCanvas();
        });
    });

    document.getElementById('btnClearEditorObstacles').addEventListener('click', () => {
        if (confirm("Remove all placed obstacles from this track?")) {
            editorMapData.obstacles = [];
            updateEditorStats();
            drawEditorCanvas();
            showToast("Cleared all obstacles.");
        }
    });

    document.getElementById('btnResetToPreset').addEventListener('click', () => {
        const temp = new MapSystem();
        temp.loadPreset('boulevard');
        editorMapData = temp.getMapData();
        updateEditorStats();
        drawEditorCanvas();
        showToast("Reset track to Boulevard preset.");
    });

    function getEditorCoords(e) {
        const rect = editorCanvas.getBoundingClientRect();
        const scaleX = editorCanvas.width / rect.width;
        const scaleY = editorCanvas.height / rect.height;
        return {
            x: Math.round((e.clientX - rect.left) * scaleX),
            y: Math.round((e.clientY - rect.top) * scaleY)
        };
    }

    editorCanvas.addEventListener('mousemove', (e) => {
        const coords = getEditorCoords(e);
        editorMousePos = coords;
        document.getElementById('editorCursorCoords').innerText = `X: ${coords.x} | Y: ${coords.y}`;
        drawEditorCanvas();
    });

    editorCanvas.addEventListener('click', (e) => {
        const { x, y } = getEditorCoords(e);

        if (activeEditorTool === 'add_barrier_h') {
            editorMapData.obstacles.push({ type: 'barrier', x, y, width: 120, height: 22, angle: 0 });
            showToast(`Placed Horizontal Barrier at (${x}, ${y})`);
        } else if (activeEditorTool === 'add_barrier_v') {
            editorMapData.obstacles.push({ type: 'barrier', x, y, width: 22, height: 120, angle: 0 });
            showToast(`Placed Vertical Barrier at (${x}, ${y})`);
        } else if (activeEditorTool === 'add_light') {
            editorMapData.obstacles.push({ type: 'street_light', x, y, radius: 14, glowRadius: 110 });
            showToast(`Placed Street Light Pillar at (${x}, ${y})`);
        } else if (activeEditorTool === 'move_target') {
            editorMapData.target.x = x;
            editorMapData.target.y = y;
            showToast(`Moved Parking Target to (${x}, ${y})`);
        } else if (activeEditorTool === 'move_spawn') {
            editorMapData.spawnPoint.x = x;
            editorMapData.spawnPoint.y = y;
            showToast(`Moved Car Spawn Point to (${x}, ${y})`);
        } else if (activeEditorTool === 'erase_obstacle') {
            const idx = editorMapData.obstacles.findIndex(obs => Math.hypot(obs.x - x, obs.y - y) < 35);
            if (idx !== -1) {
                editorMapData.obstacles.splice(idx, 1);
                showToast("Removed obstacle.");
            }
        }

        updateEditorStats();
        drawEditorCanvas();
    });

    function updateEditorStats() {
        if (!editorMapData) return;
        setText('editorObsCount', editorMapData.obstacles.length);
        setText('editorSpawnPos', `${editorMapData.spawnPoint.x}, ${editorMapData.spawnPoint.y}`);
        setText('editorTargetPos', `${editorMapData.target.x}, ${editorMapData.target.y}`);
    }

    function drawEditorCanvas() {
        if (!editorCtx || !editorMapData) return;
        const ctx = editorCtx;
        const w = editorCanvas.width;
        const h = editorCanvas.height;

        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = "#0a0a0a";
        ctx.fillRect(0, 0, w, h);

        // Technical grid
        ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
        ctx.lineWidth = 1;
        for (let x = 0; x < w; x += 40) {
            ctx.beginPath();
            ctx.moveTo(x, 0); ctx.lineTo(x, h);
            ctx.stroke();
        }
        for (let y = 0; y < h; y += 40) {
            ctx.beginPath();
            ctx.moveTo(0, y); ctx.lineTo(w, y);
            ctx.stroke();
        }

        // Road Boundaries
        ctx.lineWidth = 3;
        ctx.strokeStyle = "#ffffff";
        for (let i = 0; i < editorMapData.roadBorders.length; i++) {
            const b = editorMapData.roadBorders[i];
            ctx.beginPath();
            ctx.moveTo(b[0].x, b[0].y);
            ctx.lineTo(b[1].x, b[1].y);
            ctx.stroke();
        }

        // Target Parking Zone
        const t = editorMapData.target;
        ctx.save();
        ctx.translate(t.x, t.y);
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(-24, -30, 48, 60);
        ctx.setLineDash([]);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 20px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("P", 0, -2);
        ctx.font = "9px 'JetBrains Mono', monospace";
        ctx.fillText("TARGET", 0, 38);
        ctx.restore();

        // Spawn Pad
        const s = editorMapData.spawnPoint;
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.strokeStyle = "#888888";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(-24, -28, 48, 56);
        ctx.setLineDash([]);
        ctx.fillStyle = "#ffffff";
        ctx.font = "10px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillText("▲ START", 0, -32);
        ctx.restore();

        // Placed Obstacles
        for (let i = 0; i < editorMapData.obstacles.length; i++) {
            const obs = editorMapData.obstacles[i];
            if (obs.type === 'barrier') {
                ctx.save();
                ctx.translate(obs.x, obs.y);
                ctx.rotate(obs.angle || 0);
                ctx.fillStyle = "#181818";
                ctx.fillRect(-obs.width / 2, -obs.height / 2, obs.width, obs.height);
                ctx.strokeStyle = "#ffffff";
                ctx.lineWidth = 2;
                ctx.strokeRect(-obs.width / 2, -obs.height / 2, obs.width, obs.height);

                ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
                ctx.lineWidth = 1.5;
                for (let sx = -obs.width / 2 + 8; sx < obs.width / 2 - 4; sx += 16) {
                    ctx.beginPath();
                    ctx.moveTo(sx, -obs.height / 2 + 2);
                    ctx.lineTo(sx + 8, obs.height / 2 - 2);
                    ctx.stroke();
                }
                ctx.restore();
            } else if (obs.type === 'street_light') {
                ctx.save();
                ctx.translate(obs.x, obs.y);
                ctx.beginPath();
                ctx.arc(0, 0, obs.radius || 14, 0, Math.PI * 2);
                ctx.fillStyle = "#141414";
                ctx.fill();
                ctx.lineWidth = 2;
                ctx.strokeStyle = "#ffffff";
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(0, 0, (obs.radius || 14) * 0.45, 0, Math.PI * 2);
                ctx.fillStyle = "#ffffff";
                ctx.fill();
                ctx.restore();
            }
        }

        // Live Tool Ghost Cursor Preview
        const mx = editorMousePos.x;
        const my = editorMousePos.y;

        ctx.save();
        ctx.translate(mx, my);

        // Crosshairs
        ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 4]);
        ctx.beginPath();
        ctx.moveTo(-30, 0); ctx.lineTo(30, 0);
        ctx.moveTo(0, -30); ctx.lineTo(0, 30);
        ctx.stroke();

        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5;

        if (activeEditorTool === 'add_barrier_h') {
            ctx.strokeRect(-60, -11, 120, 22);
        } else if (activeEditorTool === 'add_barrier_v') {
            ctx.strokeRect(-11, -60, 22, 120);
        } else if (activeEditorTool === 'add_light') {
            ctx.beginPath();
            ctx.arc(0, 0, 14, 0, Math.PI * 2);
            ctx.stroke();
        } else if (activeEditorTool === 'move_target') {
            ctx.strokeRect(-24, -30, 48, 60);
        } else if (activeEditorTool === 'move_spawn') {
            ctx.strokeRect(-24, -28, 48, 56);
        } else if (activeEditorTool === 'erase_obstacle') {
            ctx.strokeStyle = "#ff4d4d";
            ctx.beginPath();
            ctx.arc(0, 0, 28, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.restore();
    }

    // Save Custom Track
    document.getElementById('btnSaveCustomTrack').addEventListener('click', async () => {
        const name = document.getElementById('customMapNameInput').value.trim() || 'Custom Track';
        editorMapData.name = name;

        const newTrack = {
            id: `custom_${Date.now()}`,
            title: name,
            description: `${editorMapData.obstacles.length} Obstacles Custom Course`,
            isCustom: true,
            data: JSON.parse(JSON.stringify(editorMapData))
        };

        customSavedMaps.push(newTrack);
        try {
            localStorage.setItem('neuron_custom_maps', JSON.stringify(customSavedMaps));
        } catch (e) {}

        try {
            await fetch('/api/save_map', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, data: editorMapData })
            });
        } catch (e) {}

        showToast(`Saved custom track "${name}"!`);
        switchModalTab('gallery');
        renderThumbnailsGallery();
    });

    // Deploy Custom Track to Python Simulation
    document.getElementById('btnDeployCustomTrack').addEventListener('click', () => {
        const name = document.getElementById('customMapNameInput').value.trim() || 'Custom Track';
        editorMapData.name = name;
        mapSystem.loadCustomMap(editorMapData);
        sendCommand({ action: 'set_custom_map', map_data: editorMapData });
        mapStudioModal.classList.remove('open');
        document.getElementById('activeMapBadge').innerText = `[ ${name.toUpperCase()} ]`;
        showToast(`Deployed "${name}" to Python AI Engine.`);
    });

    function deleteCustomTrack(id) {
        customSavedMaps = customSavedMaps.filter(m => m.id !== id);
        try {
            localStorage.setItem('neuron_custom_maps', JSON.stringify(customSavedMaps));
        } catch (e) {}
        renderThumbnailsGallery();
        showToast("Custom track deleted.");
    }

    try {
        const saved = localStorage.getItem('neuron_custom_maps');
        if (saved) {
            customSavedMaps = JSON.parse(saved);
        }
    } catch (e) {}

    // -------------------------------------------------------------
    // Save / Load Models
    // -------------------------------------------------------------
    const saveModal = document.getElementById('saveModal');
    const loadModal = document.getElementById('loadModal');

    document.getElementById('btnSaveModel').addEventListener('click', () => {
        if (!latestState || !latestState.leader || !latestState.leader.brain) {
            showToast("No brain model trained yet in Python engine!");
            return;
        }
        const fit = Math.round(latestState.championFitness || latestState.bestFitness || 0);
        document.getElementById('modelNameInput').value = `Brain_Gen${latestState.generation}_Fit${fit}`;
        saveModal.classList.add('open');
    });

    document.getElementById('btnConfirmSave').addEventListener('click', async () => {
        const name = document.getElementById('modelNameInput').value.trim() || 'Brain_Model';
        const brainToSave = latestState.leader.brain;

        try {
            const resp = await fetch('/api/save_model', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    generation: latestState.generation,
                    fitness: latestState.championFitness || latestState.bestFitness,
                    map_name: mapSystem.currentMapId,
                    brain: brainToSave
                })
            });
            const data = await resp.json();
            if (data.success) {
                saveModal.classList.remove('open');
                showToast("Brain model saved to Python server storage.");
            } else {
                alert("Error saving model: " + data.error);
            }
        } catch (err) {
            console.error(err);
            alert("Could not reach Python server to save model.");
        }
    });

    document.getElementById('btnLoadModel').addEventListener('click', async () => {
        loadModal.classList.add('open');
        const container = document.getElementById('modelsList');
        container.innerHTML = `<div class="mono-sub">Scanning Python models repository...</div>`;

        try {
            const resp = await fetch('/api/models');
            const data = await resp.json();
            if (data.success) {
                if (data.models.length === 0) {
                    container.innerHTML = `<p class="mono-sub">No saved brain models found on server. Train your cars and click "SAVE BRAIN"!</p>`;
                } else {
                    container.innerHTML = '';
                    data.models.forEach(m => {
                        const item = document.createElement('div');
                        item.className = 'model-item';
                        item.innerHTML = `
                            <div class="model-info">
                                <div class="model-title">${escapeHtml(m.name)}</div>
                                <div class="model-meta">GEN ${m.generation} | FITNESS: ${m.fitness} | MAP: ${escapeHtml(m.map_name)} | ${m.date_str}</div>
                            </div>
                            <div class="model-actions">
                                <button class="btn btn-sharp btn-load-entry" data-filename="${m.filename}">LOAD</button>
                                <button class="btn btn-sharp btn-danger btn-del-entry" data-filename="${m.filename}">&times;</button>
                            </div>
                        `;
                        container.appendChild(item);
                    });

                    container.querySelectorAll('.btn-load-entry').forEach(b => {
                        b.addEventListener('click', async () => {
                            const filename = b.dataset.filename;
                            loadBrainFromFile(filename);
                        });
                    });

                    container.querySelectorAll('.btn-del-entry').forEach(b => {
                        b.addEventListener('click', async () => {
                            if (confirm("Delete this saved brain model?")) {
                                const filename = b.dataset.filename;
                                await fetch(`/api/delete_model/${filename}`, { method: 'DELETE' });
                                b.closest('.model-item').remove();
                                showToast("Model deleted.");
                            }
                        });
                    });
                }
            }
        } catch (err) {
            container.innerHTML = `<p class="mono-sub">Failed to query models from Python server.</p>`;
        }
    });

    async function loadBrainFromFile(filename) {
        try {
            const resp = await fetch(`/api/load_model/${filename}`);
            const data = await resp.json();
            if (data.success && data.model && data.model.brain) {
                sendCommand({ action: 'apply_brain', brain: data.model.brain });
                loadModal.classList.remove('open');
                showToast(`Loaded brain "${data.model.name}" into Python engine!`);
            }
        } catch (err) {
            console.error(err);
            alert("Failed to load brain from server.");
        }
    }

    // Export / Import JSON files
    document.getElementById('btnExportJSON').addEventListener('click', () => {
        if (!latestState || !latestState.leader || !latestState.leader.brain) {
            showToast("No brain model to export!");
            return;
        }
        const jsonStr = JSON.stringify({
            app: "Neuron AI Car Simulator",
            engine: "Python Neuroevolution Core",
            generation: latestState.generation,
            fitness: latestState.championFitness || latestState.bestFitness,
            brain: latestState.leader.brain
        }, null, 2);

        const blob = new Blob([jsonStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `neuron_brain_gen${latestState.generation}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast("Exported Python brain as JSON file.");
    });

    const fileInput = document.getElementById('jsonFileInput');
    document.getElementById('btnImportJSON').addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const parsed = JSON.parse(event.target.result);
                const brainData = parsed.brain || parsed;
                sendCommand({ action: 'apply_brain', brain: brainData });
                loadModal.classList.remove('open');
                showToast("Imported brain model into Python engine!");
            } catch (err) {
                alert("Could not parse JSON file: " + err.message);
            }
        };
        reader.readAsText(file);
    });

    // Close Modals
    document.querySelectorAll('.modal-close, .modal-backdrop').forEach(el => {
        el.addEventListener('click', () => {
            document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('open'));
        });
    });

    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('open'));
        }
    });

    const toast = document.getElementById('toast');
    function showToast(msg) {
        if (!toast) return;
        toast.innerText = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2400);
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/[&<>"']/g, m => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        })[m]);
    }
});
