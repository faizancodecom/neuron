/**
 * NEURON - Map, Obstacles, Street Lights, & Parking Lot Target System
 */

class MapSystem {
    constructor() {
        this.currentMapId = 'boulevard';
        this.roadBorders = [];
        this.obstacles = []; // Barriers, Street Lights, Parked Cars
        this.checkpoints = [];
        this.spawnPoint = { x: 400, y: 880, angle: 0 };
        this.target = { x: 400, y: 120, radius: 46, name: "City Plaza Parking" };
        this.decorations = []; // Visual roads, crosswalks, parking bays

        this.loadPreset('boulevard');
    }

    loadPreset(presetId) {
        this.currentMapId = presetId;
        this.roadBorders = [];
        this.obstacles = [];
        this.checkpoints = [];
        this.decorations = [];

        switch (presetId) {
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
                this.#buildBoulevard();
                break;
        }
    }

    loadCustomMap(mapData) {
        if (!mapData) return;
        this.currentMapId = mapData.name || 'custom';
        this.spawnPoint = mapData.spawnPoint ? { ...mapData.spawnPoint } : { x: 400, y: 910, angle: 0 };
        this.target = mapData.target ? { ...mapData.target } : { x: 400, y: 110, radius: 46, name: mapData.name || "Custom Target" };
        this.roadBorders = mapData.roadBorders ? JSON.parse(JSON.stringify(mapData.roadBorders)) : [
            [{ x: 120, y: 950 }, { x: 120, y: 60 }],
            [{ x: 680, y: 950 }, { x: 680, y: 60 }],
            [{ x: 120, y: 950 }, { x: 680, y: 950 }],
            [{ x: 120, y: 60 }, { x: 680, y: 60 }]
        ];
        this.obstacles = mapData.obstacles ? JSON.parse(JSON.stringify(mapData.obstacles)) : [];
        this.checkpoints = mapData.checkpoints ? JSON.parse(JSON.stringify(mapData.checkpoints)) : [];
    }

    getMapData() {
        return {
            name: this.currentMapId,
            spawnPoint: { ...this.spawnPoint },
            target: { ...this.target },
            roadBorders: JSON.parse(JSON.stringify(this.roadBorders)),
            obstacles: JSON.parse(JSON.stringify(this.obstacles)),
            checkpoints: JSON.parse(JSON.stringify(this.checkpoints))
        };
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

        // Technical subtle grid
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.lineWidth = 1;
        for (let x = 0; x < w; x += 16) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
        }
        for (let y = 0; y < h; y += 16) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }

        // Scale and fit map (800 x 1000)
        const scale = Math.min(w / 800, h / 1000) * 0.88;
        ctx.translate(w / 2, h / 2);
        ctx.scale(scale, scale);
        ctx.translate(-400, -500);

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

        // Obstacles
        for (let i = 0; i < tempMap.obstacles.length; i++) {
            const obs = tempMap.obstacles[i];
            if (obs.type === 'barrier' || obs.type === 'rect') {
                ctx.save();
                ctx.translate(obs.x, obs.y);
                ctx.rotate(obs.angle || 0);
                ctx.fillStyle = '#222222';
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2 / scale;
                ctx.fillRect(-obs.width / 2, -obs.height / 2, obs.width, obs.height);
                ctx.strokeRect(-obs.width / 2, -obs.height / 2, obs.width, obs.height);
                ctx.restore();
            } else if (obs.type === 'street_light') {
                ctx.beginPath();
                ctx.arc(obs.x, obs.y, (obs.radius || 12) * 1.3, 0, Math.PI * 2);
                ctx.fillStyle = '#ffffff';
                ctx.fill();
            }
        }

        // Target Pad
        const t = tempMap.target;
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2 / scale;
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold 22px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('P', t.x, t.y);

        // Spawn Pad
        const s = tempMap.spawnPoint;
        ctx.strokeStyle = '#888888';
        ctx.strokeRect(s.x - 22, s.y - 25, 44, 50);
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold 16px monospace`;
        ctx.fillText('▲', s.x, s.y);

        ctx.restore();
    }

    #buildBoulevard() {
        // Dimensions: 800 x 1000
        this.spawnPoint = { x: 400, y: 910, angle: 0 };
        this.target = { x: 400, y: 110, radius: 46, name: "Downtown Grand Plaza P1" };

        // Outer Road Boundaries
        const leftWall = [
            { x: 120, y: 50 }, { x: 120, y: 950 },
            { x: 150, y: 950 }, { x: 150, y: 50 }
        ];
        const rightWall = [
            { x: 650, y: 50 }, { x: 650, y: 950 },
            { x: 680, y: 950 }, { x: 680, y: 50 }
        ];

        // Track outer borders (cars cannot cross)
        this.roadBorders = [
            [{ x: 140, y: 950 }, { x: 140, y: 60 }],
            [{ x: 660, y: 950 }, { x: 660, y: 60 }],
            [{ x: 140, y: 950 }, { x: 660, y: 950 }],
            [{ x: 140, y: 60 }, { x: 660, y: 60 }]
        ];

        // Street Lights (Glowing circular obstacle poles)
        const streetLights = [
            // Left sidewalk streetlights
            { x: 180, y: 800 },
            { x: 180, y: 600 },
            { x: 180, y: 400 },
            { x: 180, y: 200 },
            // Right sidewalk streetlights
            { x: 620, y: 800 },
            { x: 620, y: 600 },
            { x: 620, y: 400 },
            { x: 620, y: 200 },
            // Median streetlights
            { x: 400, y: 680 },
            { x: 400, y: 340 }
        ];

        streetLights.forEach(sl => {
            this.obstacles.push({
                type: 'street_light',
                x: sl.x,
                y: sl.y,
                radius: 12,
                glowRadius: 115,
                color: "#ffc83b"
            });
        });

        // Concrete road barriers / traffic islands
        // Lower chicane barriers
        this.obstacles.push({
            type: 'barrier',
            x: 290,
            y: 750,
            width: 140,
            height: 24,
            angle: 0.1,
            label: "CONCRETE BARRIER"
        });

        this.obstacles.push({
            type: 'barrier',
            x: 510,
            y: 750,
            width: 140,
            height: 24,
            angle: -0.1,
            label: "CONCRETE BARRIER"
        });

        // Mid section barriers
        this.obstacles.push({
            type: 'barrier',
            x: 250,
            y: 500,
            width: 180,
            height: 24,
            angle: 0,
            label: "ROAD DIVIDER"
        });

        this.obstacles.push({
            type: 'barrier',
            x: 550,
            y: 500,
            width: 180,
            height: 24,
            angle: 0,
            label: "ROAD DIVIDER"
        });

        // Upper parking approach barriers (creating a gated entrance to the parking lot)
        this.obstacles.push({
            type: 'barrier',
            x: 240,
            y: 240,
            width: 170,
            height: 24,
            angle: -0.15,
            label: "SECURITY GATE"
        });

        this.obstacles.push({
            type: 'barrier',
            x: 560,
            y: 240,
            width: 170,
            height: 24,
            angle: 0.15,
            label: "SECURITY GATE"
        });

        // Checkpoints guiding the route
        this.checkpoints = [
            { x: 400, y: 820, radius: 60 },
            { x: 400, y: 620, radius: 60 },
            { x: 400, y: 420, radius: 60 },
            { x: 400, y: 220, radius: 60 },
            { x: 400, y: 110, radius: 50 }
        ];
    }

    #buildChicane() {
        // Winding S-curve track with street lights and barrier walls
        this.spawnPoint = { x: 220, y: 920, angle: 0 };
        this.target = { x: 580, y: 100, radius: 46, name: "Summit Viewpoint Parking" };

        this.roadBorders = [
            [{ x: 100, y: 960 }, { x: 100, y: 650 }],
            [{ x: 100, y: 650 }, { x: 340, y: 480 }],
            [{ x: 340, y: 480 }, { x: 340, y: 280 }],
            [{ x: 340, y: 280 }, { x: 460, y: 60 }],
            [{ x: 460, y: 60 }, { x: 720, y: 60 }],
            [{ x: 720, y: 60 }, { x: 720, y: 420 }],
            [{ x: 720, y: 420 }, { x: 480, y: 600 }],
            [{ x: 480, y: 600 }, { x: 480, y: 800 }],
            [{ x: 480, y: 800 }, { x: 700, y: 960 }],
            [{ x: 700, y: 960 }, { x: 100, y: 960 }]
        ];

        // Street lights along the curves
        const lights = [
            { x: 140, y: 850 },
            { x: 140, y: 700 },
            { x: 280, y: 550 },
            { x: 420, y: 450 },
            { x: 560, y: 350 },
            { x: 670, y: 220 },
            { x: 500, y: 150 },
            { x: 380, y: 720 }
        ];

        lights.forEach(l => {
            this.obstacles.push({
                type: 'street_light',
                x: l.x,
                y: l.y,
                radius: 13,
                glowRadius: 110,
                color: "#ffaa22"
            });
        });

        // Barrier obstacles placed to test steering chicanes
        this.obstacles.push({
            type: 'barrier',
            x: 320,
            y: 780,
            width: 120,
            height: 22,
            angle: 0.3
        });

        this.obstacles.push({
            type: 'barrier',
            x: 230,
            y: 450,
            width: 110,
            height: 22,
            angle: -0.4
        });

        this.obstacles.push({
            type: 'barrier',
            x: 580,
            y: 500,
            width: 130,
            height: 22,
            angle: 0.25
        });

        this.checkpoints = [
            { x: 220, y: 800, radius: 55 },
            { x: 200, y: 620, radius: 55 },
            { x: 350, y: 480, radius: 55 },
            { x: 520, y: 380, radius: 55 },
            { x: 640, y: 220, radius: 55 },
            { x: 580, y: 100, radius: 50 }
        ];
    }

    #buildMaze() {
        // Tight urban grid maze
        this.spawnPoint = { x: 160, y: 900, angle: 0 };
        this.target = { x: 640, y: 110, radius: 46, name: "Cyber Deck Parking Bay" };

        this.roadBorders = [
            [{ x: 80, y: 950 }, { x: 80, y: 60 }],
            [{ x: 720, y: 950 }, { x: 720, y: 60 }],
            [{ x: 80, y: 950 }, { x: 720, y: 950 }],
            [{ x: 80, y: 60 }, { x: 720, y: 60 }]
        ];

        // Maze barriers
        const walls = [
            // Row 1
            { x: 260, y: 780, width: 260, height: 22, angle: 0 },
            { x: 580, y: 780, width: 160, height: 22, angle: 0 },
            // Row 2
            { x: 180, y: 600, width: 170, height: 22, angle: 0 },
            { x: 480, y: 600, width: 250, height: 22, angle: 0 },
            // Row 3
            { x: 300, y: 420, width: 270, height: 22, angle: 0 },
            { x: 630, y: 420, width: 140, height: 22, angle: 0 },
            // Row 4
            { x: 170, y: 240, width: 160, height: 22, angle: 0 },
            { x: 460, y: 240, width: 240, height: 22, angle: 0 }
        ];

        walls.forEach(w => {
            this.obstacles.push({
                type: 'barrier',
                ...w
            });
        });

        // Street lights on intersections
        const streetLights = [
            { x: 140, y: 700 },
            { x: 450, y: 700 },
            { x: 650, y: 700 },
            { x: 280, y: 510 },
            { x: 650, y: 510 },
            { x: 140, y: 330 },
            { x: 450, y: 330 },
            { x: 320, y: 150 }
        ];

        streetLights.forEach(sl => {
            this.obstacles.push({
                type: 'street_light',
                x: sl.x,
                y: sl.y,
                radius: 12,
                glowRadius: 105,
                color: "#00f3ff"
            });
        });

        this.checkpoints = [
            { x: 160, y: 840, radius: 50 },
            { x: 450, y: 700, radius: 50 },
            { x: 640, y: 600, radius: 50 },
            { x: 350, y: 510, radius: 50 },
            { x: 150, y: 380, radius: 50 },
            { x: 450, y: 300, radius: 50 },
            { x: 640, y: 180, radius: 50 },
            { x: 640, y: 110, radius: 50 }
        ];
    }

    #buildPlaza() {
        // Realistic multi-stall parking lot challenge
        this.spawnPoint = { x: 400, y: 920, angle: 0 };
        this.target = { x: 570, y: 260, radius: 44, name: "Reserved VIP Parking Bay 04" };

        this.roadBorders = [
            [{ x: 100, y: 960 }, { x: 100, y: 80 }],
            [{ x: 700, y: 960 }, { x: 700, y: 80 }],
            [{ x: 100, y: 960 }, { x: 700, y: 960 }],
            [{ x: 100, y: 80 }, { x: 700, y: 80 }]
        ];

        // Parked obstacle cars / stalls
        const parkedCars = [
            { x: 230, y: 260, width: 26, height: 44, angle: 0 },
            { x: 340, y: 260, width: 26, height: 44, angle: 0 },
            { x: 450, y: 260, width: 26, height: 44, angle: 0 },
            // Stalls on lower row
            { x: 230, y: 520, width: 26, height: 44, angle: 0 },
            { x: 340, y: 520, width: 26, height: 44, angle: 0 },
            { x: 450, y: 520, width: 26, height: 44, angle: 0 },
            { x: 570, y: 520, width: 26, height: 44, angle: 0 }
        ];

        parkedCars.forEach(pc => {
            this.obstacles.push({
                type: 'barrier',
                x: pc.x,
                y: pc.y,
                width: pc.width,
                height: pc.height,
                angle: pc.angle,
                isParkedVehicle: true
            });
        });

        // Curbs / Barriers
        this.obstacles.push({
            type: 'barrier',
            x: 400,
            y: 390,
            width: 440,
            height: 20,
            angle: 0,
            label: "PARKING CURB"
        });

        this.obstacles.push({
            type: 'barrier',
            x: 400,
            y: 650,
            width: 440,
            height: 20,
            angle: 0,
            label: "PARKING CURB"
        });

        // Perimeter street lights
        const lights = [
            { x: 140, y: 800 },
            { x: 660, y: 800 },
            { x: 140, y: 520 },
            { x: 660, y: 520 },
            { x: 140, y: 260 },
            { x: 660, y: 260 },
            { x: 400, y: 130 }
        ];

        lights.forEach(l => {
            this.obstacles.push({
                type: 'street_light',
                x: l.x,
                y: l.y,
                radius: 12,
                glowRadius: 110,
                color: "#ffc83b"
            });
        });

        this.checkpoints = [
            { x: 400, y: 780, radius: 60 },
            { x: 630, y: 650, radius: 55 },
            { x: 630, y: 390, radius: 55 },
            { x: 570, y: 260, radius: 45 }
        ];
    }

    draw(ctx) {
        // 1. Draw Road Surface / Dark Asphalt (Sharp Matte Monochrome)
        ctx.save();
        ctx.fillStyle = "#0a0a0a";
        ctx.fillRect(-2000, -2000, 5000, 5000);

        // Technical grid lines
        ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
        ctx.lineWidth = 1;
        const gridSize = 40;
        for (let x = 0; x < 800; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, 1000);
            ctx.stroke();
        }
        for (let y = 0; y < 1000; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(800, y);
            ctx.stroke();
        }

        // 2. Draw Road Boundaries (Solid Crisp White)
        ctx.lineWidth = 3;
        ctx.strokeStyle = "#ffffff";
        for (let i = 0; i < this.roadBorders.length; i++) {
            const b = this.roadBorders[i];
            ctx.beginPath();
            ctx.moveTo(b[0].x, b[0].y);
            ctx.lineTo(b[1].x, b[1].y);
            ctx.stroke();
        }

        // 3. Draw Checkpoints (Subtle Technical Rings)
        for (let i = 0; i < this.checkpoints.length; i++) {
            const cp = this.checkpoints[i];
            ctx.beginPath();
            ctx.arc(cp.x, cp.y, cp.radius, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 6]);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // 4. Draw Street Lights (Technical Radar Range & Poles)
        for (let i = 0; i < this.obstacles.length; i++) {
            const obs = this.obstacles[i];
            if (obs.type === 'street_light') {
                ctx.beginPath();
                ctx.arc(obs.x, obs.y, (obs.glowRadius || 110) * 0.7, 0, Math.PI * 2);
                ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
                ctx.lineWidth = 1;
                ctx.setLineDash([3, 6]);
                ctx.stroke();
                ctx.setLineDash([]);
            }
        }

        // 5. Draw Target Parking Lot
        this.#drawParkingLot(ctx);

        // 6. Draw Concrete Barriers & Pillars
        for (let i = 0; i < this.obstacles.length; i++) {
            const obs = this.obstacles[i];
            if (obs.type === 'barrier' || obs.type === 'rect') {
                this.#drawBarrier(ctx, obs);
            } else if (obs.type === 'street_light') {
                this.#drawStreetLightPole(ctx, obs);
            }
        }

        // 7. Draw Start / Spawn Zone
        this.#drawSpawnPoint(ctx);

        ctx.restore();
    }

    #drawParkingLot(ctx) {
        const t = this.target;

        ctx.save();
        ctx.translate(t.x, t.y);

        // Outer boundary ring (Crisp white dashed)
        ctx.beginPath();
        ctx.arc(0, 0, t.radius + 6, 0, Math.PI * 2);
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Target pad fill (High contrast monochrome)
        ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
        ctx.beginPath();
        ctx.arc(0, 0, t.radius, 0, Math.PI * 2);
        ctx.fill();

        // Parking stall perimeter box
        const w = 36;
        const h = 56;
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.strokeRect(-w / 2, -h / 2, w, h);

        // Parking "P" icon
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 20px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("P", 0, -2);

        // Technical text label
        ctx.font = "9px 'JetBrains Mono', monospace";
        ctx.fillText("PARKING ZONE", 0, h / 2 + 14);

        ctx.restore();
    }

    #drawBarrier(ctx, obs) {
        ctx.save();
        ctx.translate(obs.x, obs.y);
        ctx.rotate(obs.angle || 0);

        const w = obs.width;
        const h = obs.height;

        if (obs.isParkedVehicle) {
            // Parked vehicle obstacle (Technical Monochrome Outline)
            ctx.fillStyle = "#181818";
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 1.5;
            ctx.fillRect(-w / 2, -h / 2, w, h);
            ctx.strokeRect(-w / 2, -h / 2, w, h);

            // Windshield
            ctx.fillStyle = "#050505";
            ctx.fillRect(-w * 0.35, -h * 0.25, w * 0.7, h * 0.2);
            ctx.strokeStyle = "#555555";
            ctx.strokeRect(-w * 0.35, -h * 0.25, w * 0.7, h * 0.2);
        } else {
            // Concrete barrier: dark solid fill with crisp white border and white diagonal hazard stripes
            ctx.fillStyle = "#121212";
            ctx.fillRect(-w / 2, -h / 2, w, h);

            ctx.lineWidth = 2;
            ctx.strokeStyle = "#ffffff";
            ctx.strokeRect(-w / 2, -h / 2, w, h);

            // Diagonal hazard lines
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

        // Dark circle base
        ctx.beginPath();
        ctx.arc(0, 0, obs.radius || 12, 0, Math.PI * 2);
        ctx.fillStyle = "#141414";
        ctx.fill();

        // Crisp white ring
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#ffffff";
        ctx.stroke();

        // White core pip
        ctx.beginPath();
        ctx.arc(0, 0, (obs.radius || 12) * 0.45, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();

        ctx.restore();
    }

    #drawSpawnPoint(ctx) {
        const s = this.spawnPoint;
        ctx.save();
        ctx.translate(s.x, s.y);

        // Spawn pad (Crisp white dashed rectangle)
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
}
