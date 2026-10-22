/**
 * NEURON - Map, City Grid, Traffic Lights & Destination System
 */

class MapSystem {
    constructor() {
        this.currentMapId = 'city';
        this.roadBorders = [];
        this.obstacles = [];
        this.checkpoints = [];
        this.spawnPoint = { x: 380, y: 1110, angle: 0.0 };
        this.target = { x: 820, y: 160, radius: 52, name: "City Central Plaza" };
        this.trafficLights = [];
        this.blocks = [];
        this.waypoints = [];

        this.loadPreset('city');
    }

    loadPreset(presetId) {
        this.currentMapId = presetId;
        this.roadBorders = [];
        this.obstacles = [];
        this.checkpoints = [];
        this.trafficLights = [];
        this.blocks = [];
        this.waypoints = [];

        switch (presetId) {
            case 'city':
                this.#buildCity();
                break;
            case 'boulevard':
                this.#buildBoulevard();
                break;
            case 'chicane':
                this.#buildChicane();
                break;
            case 'maze':
                this.#buildMaze();
                break;
            case 'plaza':
                this.#buildPlaza();
                break;
            default:
                this.#buildCity();
                break;
        }
    }

    #buildCity() {
        this.spawnPoint = { x: 380, y: 1110, angle: 0.0 };
        this.target = { x: 820, y: 160, radius: 52, name: "City Central Plaza" };

        // Outer City Perimeter Walls (Never penetrable)
        this.roadBorders = [
            [{ x: 40, y: 1160 }, { x: 40, y: 40 }],
            [{ x: 1160, y: 1160 }, { x: 1160, y: 40 }],
            [{ x: 40, y: 1160 }, { x: 1160, y: 1160 }],
            [{ x: 40, y: 40 }, { x: 1160, y: 40 }]
        ];

        // 9 Solid Building Blocks
        this.blocks = [
            { x: 200, y: 200, width: 280, height: 280, label: "WEST COMMERCE" },
            { x: 600, y: 200, width: 320, height: 280, label: "CIVIC CENTER" },
            { x: 1000, y: 200, width: 280, height: 280, label: "EAST TERMINAL" },
            { x: 200, y: 600, width: 280, height: 320, label: "METRO TOWER" },
            { x: 600, y: 600, width: 320, height: 320, label: "TECH HEADQUARTERS" },
            { x: 1000, y: 600, width: 280, height: 320, label: "FINANCIAL PLAZA" },
            { x: 200, y: 1000, width: 280, height: 280, label: "RESIDENTIAL QUAD" },
            { x: 600, y: 1000, width: 320, height: 280, label: "LOGISTICS HUB" },
            { x: 1000, y: 1000, width: 280, height: 280, label: "HARBOR DEPOT" }
        ];

        this.blocks.forEach(b => {
            this.obstacles.push({
                type: 'barrier',
                x: b.x,
                y: b.y,
                width: b.width,
                height: b.height,
                angle: 0.0,
                isBuilding: true,
                label: b.label
            });
        });

        this.waypoints = [
            { x: 380, y: 850 },
            { x: 380, y: 600 },
            { x: 380, y: 380 },
            { x: 600, y: 380 },
            { x: 820, y: 380 },
            { x: 820, y: 160 }
        ];
    }

    #buildBoulevard() {
        this.spawnPoint = { x: 400, y: 910, angle: 0.0 };
        this.target = { x: 400, y: 110, radius: 46, name: "Downtown Grand Plaza P1" };
        this.roadBorders = [
            [{ x: 140, y: 950 }, { x: 140, y: 60 }],
            [{ x: 660, y: 950 }, { x: 660, y: 60 }],
            [{ x: 140, y: 950 }, { x: 660, y: 950 }],
            [{ x: 140, y: 60 }, { x: 660, y: 60 }]
        ];

        this.obstacles = [
            {'type': 'street_light', 'x': 180, 'y': 800, 'radius': 12, 'glowRadius': 115},
            {'type': 'street_light', 'x': 180, 'y': 600, 'radius': 12, 'glowRadius': 115},
            {'type': 'street_light', 'x': 180, 'y': 400, 'radius': 12, 'glowRadius': 115},
            {'type': 'street_light', 'x': 180, 'y': 200, 'radius': 12, 'glowRadius': 115},
            {'type': 'street_light', 'x': 620, 'y': 800, 'radius': 12, 'glowRadius': 115},
            {'type': 'street_light', 'x': 620, 'y': 600, 'radius': 12, 'glowRadius': 115},
            {'type': 'street_light', 'x': 620, 'y': 400, 'radius': 12, 'glowRadius': 115},
            {'type': 'street_light', 'x': 620, 'y': 200, 'radius': 12, 'glowRadius': 115},
            {'type': 'barrier', 'x': 290, 'y': 750, 'width': 130, 'height': 24, 'angle': 0.1},
            {'type': 'barrier', 'x': 510, 'y': 750, 'width': 130, 'height': 24, 'angle': -0.1},
            {'type': 'barrier', 'x': 250, 'y': 500, 'width': 160, 'height': 24, 'angle': 0.0},
            {'type': 'barrier', 'x': 550, 'y': 500, 'width': 160, 'height': 24, 'angle': 0.0},
            {'type': 'barrier', 'x': 240, 'y': 240, 'width': 150, 'height': 24, 'angle': -0.15},
            {'type': 'barrier', 'x': 560, 'y': 240, 'width': 150, 'height': 24, 'angle': 0.15}
        ];
    }

    #buildChicane() {
        this.spawnPoint = { x: 260, y: 920, angle: 0.0 };
        this.target = { x: 540, y: 100, radius: 46, name: "Summit Viewpoint Parking" };
        this.roadBorders = [
            [{ x: 180, y: 960 }, { x: 180, y: 720 }],
            [{ x: 180, y: 720 }, { x: 320, y: 520 }],
            [{ x: 320, y: 520 }, { x: 320, y: 300 }],
            [{ x: 320, y: 300 }, { x: 440, y: 60 }],
            [{ x: 340, y: 960 }, { x: 340, y: 720 }],
            [{ x: 340, y: 720 }, { x: 480, y: 520 }],
            [{ x: 480, y: 520 }, { x: 480, y: 300 }],
            [{ x: 480, y: 300 }, { x: 640, y: 60 }],
            [{ x: 180, y: 960 }, { x: 340, y: 960 }],
            [{ x: 440, y: 60 }, { x: 640, y: 60 }]
        ];

        this.obstacles = [
            {'type': 'street_light', 'x': 200, 'y': 840, 'radius': 12, 'glowRadius': 90},
            {'type': 'street_light', 'x': 360, 'y': 620, 'radius': 12, 'glowRadius': 90},
            {'type': 'street_light', 'x': 340, 'y': 420, 'radius': 12, 'glowRadius': 90},
            {'type': 'street_light', 'x': 500, 'y': 220, 'radius': 12, 'glowRadius': 90},
            {'type': 'barrier', 'x': 230, 'y': 760, 'width': 70, 'height': 20, 'angle': 0.0},
            {'type': 'barrier', 'x': 430, 'y': 520, 'width': 70, 'height': 20, 'angle': 0.0},
            {'type': 'barrier', 'x': 370, 'y': 300, 'width': 70, 'height': 20, 'angle': 0.0}
        ];
    }

    #buildMaze() {
        this.spawnPoint = { x: 160, y: 900, angle: 0.0 };
        this.target = { x: 640, y: 110, radius: 46, name: "Cyber Deck Parking Bay" };
        this.roadBorders = [
            [{ x: 80, y: 950 }, { x: 80, y: 60 }],
            [{ x: 720, y: 950 }, { x: 720, y: 60 }],
            [{ x: 80, y: 950 }, { x: 720, y: 950 }],
            [{ x: 80, y: 60 }, { x: 720, y: 60 }]
        ];

        this.obstacles = [
            {'type': 'barrier', 'x': 260, 'y': 780, 'width': 220, 'height': 22, 'angle': 0.0},
            {'type': 'barrier', 'x': 580, 'y': 780, 'width': 140, 'height': 22, 'angle': 0.0},
            {'type': 'barrier', 'x': 180, 'y': 600, 'width': 150, 'height': 22, 'angle': 0.0},
            {'type': 'barrier', 'x': 480, 'y': 600, 'width': 220, 'height': 22, 'angle': 0.0},
            {'type': 'barrier', 'x': 300, 'y': 420, 'width': 240, 'height': 22, 'angle': 0.0},
            {'type': 'barrier', 'x': 630, 'y': 420, 'width': 120, 'height': 22, 'angle': 0.0},
            {'type': 'barrier', 'x': 170, 'y': 240, 'width': 140, 'height': 22, 'angle': 0.0},
            {'type': 'barrier', 'x': 460, 'y': 240, 'width': 210, 'height': 22, 'angle': 0.0}
        ];
    }

    #buildPlaza() {
        this.spawnPoint = { x: 400, y: 920, angle: 0.0 };
        this.target = { x: 570, y: 260, radius: 44, name: "Reserved VIP Parking Bay 04" };
        this.roadBorders = [
            [{ x: 100, y: 960 }, { x: 100, y: 80 }],
            [{ x: 700, y: 960 }, { x: 700, y: 80 }],
            [{ x: 100, y: 960 }, { x: 700, y: 960 }],
            [{ x: 100, y: 80 }, { x: 700, y: 80 }]
        ];

        this.obstacles = [
            {'type': 'barrier', 'x': 230, 'y': 260, 'width': 26, 'height': 44, 'angle': 0.0, 'isParkedVehicle': true},
            {'type': 'barrier', 'x': 340, 'y': 260, 'width': 26, 'height': 44, 'angle': 0.0, 'isParkedVehicle': true},
            {'type': 'barrier', 'x': 450, 'y': 260, 'width': 26, 'height': 44, 'angle': 0.0, 'isParkedVehicle': true},
            {'type': 'barrier', 'x': 230, 'y': 520, 'width': 26, 'height': 44, 'angle': 0.0, 'isParkedVehicle': true},
            {'type': 'barrier', 'x': 340, 'y': 520, 'width': 26, 'height': 44, 'angle': 0.0, 'isParkedVehicle': true},
            {'type': 'barrier', 'x': 450, 'y': 520, 'width': 26, 'height': 44, 'angle': 0.0, 'isParkedVehicle': true},
            {'type': 'barrier', 'x': 570, 'y': 520, 'width': 26, 'height': 44, 'angle': 0.0, 'isParkedVehicle': true},
            {'type': 'barrier', 'x': 400, 'y': 390, 'width': 380, 'height': 20, 'angle': 0.0},
            {'type': 'barrier', 'x': 400, 'y': 650, 'width': 380, 'height': 20, 'angle': 0.0}
        ];
    }

    loadCustomMap(mapData) {
        if (!mapData) return;
        this.currentMapId = mapData.name || 'custom';
        this.spawnPoint = mapData.spawnPoint ? { ...mapData.spawnPoint } : { x: 400, y: 910, angle: 0 };
        this.target = mapData.target ? { ...mapData.target } : { x: 400, y: 110, radius: 46, name: mapData.name || "Custom Target" };
        this.roadBorders = mapData.roadBorders ? JSON.parse(JSON.stringify(mapData.roadBorders)) : [];
        this.obstacles = mapData.obstacles ? JSON.parse(JSON.stringify(mapData.obstacles)) : [];
        this.blocks = mapData.blocks ? JSON.parse(JSON.stringify(mapData.blocks)) : [];
        this.waypoints = mapData.waypoints ? JSON.parse(JSON.stringify(mapData.waypoints)) : [];
    }

    getMapData() {
        return {
            name: this.currentMapId,
            spawnPoint: { ...this.spawnPoint },
            target: { ...this.target },
            roadBorders: JSON.parse(JSON.stringify(this.roadBorders)),
            obstacles: JSON.parse(JSON.stringify(this.obstacles)),
            blocks: JSON.parse(JSON.stringify(this.blocks)),
            waypoints: JSON.parse(JSON.stringify(this.waypoints))
        };
    }

    draw(ctx, trafficLights = []) {
        ctx.save();

        // 1. Asphalt Background
        ctx.fillStyle = "#0a0a0a";
        ctx.fillRect(-2000, -2000, 5000, 5000);

        // 2. City Grid Architecture
        if (this.currentMapId === 'city') {
            this.#drawCityDetails(ctx, trafficLights);
        } else {
            // Standard Grid lines
            ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
            ctx.lineWidth = 1;
            for (let x = 0; x < 1000; x += 40) {
                ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 1200); ctx.stroke();
            }
            for (let y = 0; y < 1200; y += 40) {
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1000, y); ctx.stroke();
            }
        }

        // 3. Road Boundaries (Solid Crisp White)
        ctx.lineWidth = 3;
        ctx.strokeStyle = "#ffffff";
        for (let i = 0; i < this.roadBorders.length; i++) {
            const b = this.roadBorders[i];
            ctx.beginPath();
            ctx.moveTo(b[0].x, b[0].y);
            ctx.lineTo(b[1].x, b[1].y);
            ctx.stroke();
        }

        // 4. Barriers, Buildings & Pillars
        for (let i = 0; i < this.obstacles.length; i++) {
            const obs = this.obstacles[i];
            if (obs.type === 'barrier' || obs.type === 'rect') {
                this.#drawBarrier(ctx, obs);
            } else if (obs.type === 'street_light') {
                this.#drawStreetLightPole(ctx, obs);
            }
        }

        // 5. Destination Target Hub
        this.#drawDestination(ctx);

        // 6. Spawn Point
        this.#drawSpawnPoint(ctx);

        ctx.restore();
    }

    #drawCityDetails(ctx, trafficLights) {
        // Draw Road Centerlines (Avenues)
        ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([8, 8]);

        // Horizontal Avenues (Y = 380, Y = 820)
        ctx.beginPath(); ctx.moveTo(40, 380); ctx.lineTo(1160, 380); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(40, 820); ctx.lineTo(1160, 820); ctx.stroke();

        // Vertical Boulevards (X = 380, X = 820)
        ctx.beginPath(); ctx.moveTo(380, 40); ctx.lineTo(380, 1160); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(820, 40); ctx.lineTo(820, 1160); ctx.stroke();
        ctx.setLineDash([]);

        // Intersection Zebra Crosswalks
        const intersections = [
            { x: 380, y: 380 }, { x: 820, y: 380 },
            { x: 380, y: 820 }, { x: 820, y: 820 }
        ];

        intersections.forEach(intPt => {
            // Draw crosswalk lines around intersection
            ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
            ctx.lineWidth = 2;
            ctx.strokeRect(intPt.x - 55, intPt.y - 55, 110, 110);
        });

        // Traffic Light Signals
        if (trafficLights && trafficLights.length > 0) {
            trafficLights.forEach(tl => {
                this.#drawTrafficLightSignal(ctx, tl);
            });
        }
    }

    #drawTrafficLightSignal(ctx, tl) {
        ctx.save();
        ctx.translate(tl.x, tl.y);

        // Signal offset based on direction
        const ox = tl.direction === 'NS' ? 45 : 0;
        const oy = tl.direction === 'NS' ? 0 : 45;

        // Housing box
        ctx.fillStyle = "#0c0c0c";
        ctx.fillRect(ox - 10, oy - 24, 20, 48);
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(ox - 10, oy - 24, 20, 48);

        // Red Lamp (top)
        ctx.beginPath();
        ctx.arc(ox, oy - 14, 5, 0, Math.PI * 2);
        ctx.fillStyle = tl.state === 'RED' ? "#ff3333" : "#331111";
        ctx.fill();
        ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 0.8; ctx.stroke();

        // Yellow Lamp (middle)
        ctx.beginPath();
        ctx.arc(ox, oy, 5, 0, Math.PI * 2);
        ctx.fillStyle = tl.state === 'YELLOW' ? "#ffcc00" : "#332a00";
        ctx.fill();
        ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 0.8; ctx.stroke();

        // Green Lamp (bottom)
        ctx.beginPath();
        ctx.arc(ox, oy + 14, 5, 0, Math.PI * 2);
        ctx.fillStyle = tl.state === 'GREEN' ? "#00ff66" : "#003314";
        ctx.fill();
        ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 0.8; ctx.stroke();

        ctx.restore();
    }

    #drawDestination(ctx) {
        const t = this.target;
        if (!t) return;

        ctx.save();
        ctx.translate(t.x, t.y);

        // Pulsing target boundary
        ctx.beginPath();
        ctx.arc(0, 0, t.radius + 6, 0, Math.PI * 2);
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
        ctx.beginPath();
        ctx.arc(0, 0, t.radius, 0, Math.PI * 2);
        ctx.fill();

        // Target stall
        const w = 40;
        const h = 58;
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.strokeRect(-w / 2, -h / 2, w, h);

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 22px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("🎯", 0, -2);

        ctx.font = "9px 'JetBrains Mono', monospace";
        ctx.fillText("DESTINATION", 0, h / 2 + 14);

        ctx.restore();
    }

    #drawBarrier(ctx, obs) {
        ctx.save();
        ctx.translate(obs.x, obs.y);
        ctx.rotate(obs.angle || 0);

        const w = obs.width;
        const h = obs.height;

        if (obs.isBuilding) {
            // City Building Block Architecture
            ctx.fillStyle = "#121212";
            ctx.fillRect(-w / 2, -h / 2, w, h);
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 2;
            ctx.strokeRect(-w / 2, -h / 2, w, h);

            // Inner architectural rooftop perimeter
            ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
            ctx.lineWidth = 1;
            ctx.strokeRect(-w / 2 + 12, -h / 2 + 12, w - 24, h - 24);

            // Building label
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 11px 'JetBrains Mono', monospace";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(obs.label || "BUILDING BLOCK", 0, 0);

        } else if (obs.isParkedVehicle) {
            ctx.fillStyle = "#161616";
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 1.5;
            ctx.fillRect(-w / 2, -h / 2, w, h);
            ctx.strokeRect(-w / 2, -h / 2, w, h);
        } else {
            // Concrete barrier with diagonal hazard stripes
            ctx.fillStyle = "#121212";
            ctx.fillRect(-w / 2, -h / 2, w, h);
            ctx.lineWidth = 2;
            ctx.strokeStyle = "#ffffff";
            ctx.strokeRect(-w / 2, -h / 2, w, h);

            ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
            ctx.lineWidth = 1.5;
            const stripeStep = 16;
            for (let sx = -w / 2 + 8; sx < w / 2 - 4; sx += stripeStep) {
                ctx.beginPath();
                ctx.moveTo(sx, -h / 2 + 2);
                ctx.lineTo(sx + 8, h / 2 - 2);
                ctx.stroke();
            }
        }

        ctx.restore();
    }

    #drawStreetLightPole(ctx, obs) {
        ctx.save();
        ctx.translate(obs.x, obs.y);
        ctx.beginPath();
        ctx.arc(0, 0, obs.radius || 10, 0, Math.PI * 2);
        ctx.fillStyle = "#141414";
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = "#ffffff";
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, (obs.radius || 10) * 0.45, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.restore();
    }

    #drawSpawnPoint(ctx) {
        const s = this.spawnPoint;
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(-24, -28, 48, 56);
        ctx.setLineDash([]);
        ctx.fillStyle = "#ffffff";
        ctx.font = "9px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillText("▲ START", 0, -34);
        ctx.restore();
    }

    static drawThumbnail(canvas, presetIdOrData) {
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;

        const tempMap = new MapSystem();
        if (typeof presetIdOrData === 'string') {
            tempMap.loadPreset(presetIdOrData);
        } else if (presetIdOrData && typeof presetIdOrData === 'object') {
            tempMap.loadCustomMap(presetIdOrData);
        }

        ctx.save();
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = '#080808';
        ctx.fillRect(0, 0, w, h);

        const mapW = tempMap.currentMapId === 'city' ? 1200 : 800;
        const mapH = tempMap.currentMapId === 'city' ? 1200 : 1000;

        const scale = Math.min(w / mapW, h / mapH) * 0.88;
        ctx.translate(w / 2, h / 2);
        ctx.scale(scale, scale);
        ctx.translate(-mapW / 2, -mapH / 2);

        // Road borders
        ctx.lineWidth = 3 / scale;
        ctx.strokeStyle = '#ffffff';
        for (let i = 0; i < tempMap.roadBorders.length; i++) {
            const b = tempMap.roadBorders[i];
            ctx.beginPath();
            ctx.moveTo(b[0].x, b[0].y);
            ctx.lineTo(b[1].x, b[1].y);
            ctx.stroke();
        }

        // Obstacles & Buildings
        for (let i = 0; i < tempMap.obstacles.length; i++) {
            const obs = tempMap.obstacles[i];
            if (obs.type === 'barrier' || obs.type === 'rect') {
                ctx.save();
                ctx.translate(obs.x, obs.y);
                ctx.rotate(obs.angle || 0);
                ctx.fillStyle = obs.isBuilding ? '#161616' : '#222222';
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2 / scale;
                ctx.fillRect(-obs.width / 2, -obs.height / 2, obs.width, obs.height);
                ctx.strokeRect(-obs.width / 2, -obs.height / 2, obs.width, obs.height);
                ctx.restore();
            } else if (obs.type === 'street_light') {
                ctx.beginPath();
                ctx.arc(obs.x, obs.y, (obs.radius || 10) * 1.3, 0, Math.PI * 2);
                ctx.fillStyle = '#ffffff';
                ctx.fill();
            }
        }

        // Target Pad
        const t = tempMap.target;
        if (t) {
            ctx.beginPath();
            ctx.arc(t.x, t.y, t.radius, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2 / scale;
            ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#ffffff';
            ctx.font = `bold 24px monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🎯', t.x, t.y);
        }

        // Spawn Pad
        const s = tempMap.spawnPoint;
        if (s) {
            ctx.strokeStyle = '#888888';
            ctx.strokeRect(s.x - 22, s.y - 25, 44, 50);
            ctx.fillStyle = '#ffffff';
            ctx.font = `bold 16px monospace`;
            ctx.fillText('▲', s.x, s.y);
        }

        ctx.restore();
    }
}
