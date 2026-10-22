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

        this.loadPreset('straight');
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
            case 'straight':
                this.#buildStraightCourse();
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
            case 'city':
                this.#buildCity();
                break;
            default:
                this.#buildStraightCourse();
                break;
        }
    }

    #buildStraightCourse() {
        this.spawnPoint = { x: 400, y: 1080, angle: 0.0 };
        this.target = { x: 400, y: 110, radius: 50, name: "Finish Line Destination" };

        // Outer Road Borders (Straight track: X in [100, 700], Y in [60, 1140])
        this.roadBorders = [
            [{ x: 100, y: 1140 }, { x: 100, y: 60 }],
            [{ x: 700, y: 1140 }, { x: 700, y: 60 }],
            [{ x: 100, y: 1140 }, { x: 700, y: 1140 }],
            [{ x: 100, y: 60 }, { x: 700, y: 60 }]
        ];

        // 5 Staggered Wall Barriers with Navigation Openings
        this.obstacles = [
            // Wall 1 (Y = 920): Left wall (width 350, leaves 250px right gap from X=450 to 700)
            { type: 'barrier', x: 275, y: 920, width: 350, height: 24, angle: 0.0, label: "WALL 1" },
            // Wall 2 (Y = 740): Right wall (width 350, leaves 250px left gap from X=100 to 350)
            { type: 'barrier', x: 525, y: 740, width: 350, height: 24, angle: 0.0, label: "WALL 2" },
            // Wall 3 (Y = 560): Center wall (width 300, leaves dual 150px gaps)
            { type: 'barrier', x: 400, y: 560, width: 300, height: 24, angle: 0.0, label: "WALL 3" },
            // Wall 4 (Y = 380): Left wall (width 350, leaves 250px right gap from X=450 to 700)
            { type: 'barrier', x: 275, y: 380, width: 350, height: 24, angle: 0.0, label: "WALL 4" },
            // Wall 5 (Y = 220): Right wall (width 350, leaves 250px left gap from X=100 to 350)
            { type: 'barrier', x: 525, y: 220, width: 350, height: 24, angle: 0.0, label: "WALL 5" }
        ];

        this.waypoints = [
            { x: 575, y: 920 },
            { x: 225, y: 740 },
            { x: 625, y: 560 },
            { x: 575, y: 380 },
            { x: 225, y: 220 },
            { x: 400, y: 110 }
        ];

        this.blocks = [];
        this.trafficLights = [];
    }

    #buildCity() {
        this.spawnPoint = { x: 410, y: 1110, angle: 0.0 };
        this.target = { x: 850, y: 160, radius: 52, name: "City Central Plaza" };

        // Outer City Perimeter Walls (Never penetrable)
        this.roadBorders = [
            [{ x: 40, y: 1160 }, { x: 40, y: 40 }],
            [{ x: 1160, y: 1160 }, { x: 1160, y: 40 }],
            [{ x: 40, y: 1160 }, { x: 1160, y: 1160 }],
            [{ x: 40, y: 40 }, { x: 1160, y: 40 }]
        ];

        // 9 Solid Building Blocks (precisely aligned to 120px avenues and 4-way intersections)
        this.blocks = [
            // Top Row (North: Y in [60, 320], height 260, center Y = 190)
            { x: 190, y: 190, width: 260, height: 260, label: "WEST COMMERCE" },
            { x: 600, y: 190, width: 320, height: 260, label: "CIVIC CENTER" },
            { x: 1010, y: 190, width: 260, height: 260, label: "EAST TERMINAL" },
            // Middle Row (Center: Y in [440, 760], height 320, center Y = 600)
            { x: 190, y: 600, width: 260, height: 320, label: "METRO TOWER" },
            { x: 600, y: 600, width: 320, height: 320, label: "TECH HEADQUARTERS" },
            { x: 1010, y: 600, width: 260, height: 320, label: "FINANCIAL PLAZA" },
            // Bottom Row (South: Y in [880, 1140], height 260, center Y = 1010)
            { x: 190, y: 1010, width: 260, height: 260, label: "RESIDENTIAL QUAD" },
            { x: 600, y: 1010, width: 320, height: 260, label: "LOGISTICS HUB" },
            { x: 1010, y: 1010, width: 260, height: 260, label: "HARBOR DEPOT" }
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
            { x: 410, y: 850 },
            { x: 410, y: 600 },
            { x: 410, y: 380 },
            { x: 600, y: 410 },
            { x: 850, y: 380 },
            { x: 850, y: 160 }
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

        // 2. Track Architecture & Surface
        if (this.currentMapId === 'straight') {
            this.#drawStraightDetails(ctx);
        } else if (this.currentMapId === 'city') {
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

    #drawStraightDetails(ctx) {
        // 1. Highway Asphalt Track Surface (X in [100, 700], Y in [60, 1140])
        ctx.fillStyle = "#0d0d0d";
        ctx.fillRect(100, 60, 600, 1080);

        // 2. Straight Centerline (X = 400, crisp dashed line running top to bottom)
        ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
        ctx.lineWidth = 2;
        ctx.setLineDash([14, 14]);
        ctx.beginPath();
        ctx.moveTo(400, 1140);
        ctx.lineTo(400, 60);
        ctx.stroke();

        // 3. Lane Dividers (X = 250 and X = 550)
        ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
        ctx.lineWidth = 1;
        ctx.setLineDash([8, 16]);
        ctx.beginPath();
        ctx.moveTo(250, 1140); ctx.lineTo(250, 60);
        ctx.moveTo(550, 1140); ctx.lineTo(550, 60);
        ctx.stroke();
        ctx.setLineDash([]);

        // 4. Start Line Zone (Y = 1080)
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 8]);
        ctx.beginPath();
        ctx.moveTo(100, 1080);
        ctx.lineTo(700, 1080);
        ctx.stroke();
        ctx.setLineDash([]);

        // Start Line Monospace Label
        ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
        ctx.font = "bold 10px 'JetBrains Mono', monospace";
        ctx.textAlign = "left";
        ctx.fillText("START LINE [0M]", 115, 1102);

        // 5. Distance Milestones Along Outer Walls
        const milestones = [
            { y: 920, label: "GATE 1 [160M]" },
            { y: 740, label: "GATE 2 [340M]" },
            { y: 560, label: "GATE 3 [520M]" },
            { y: 380, label: "GATE 4 [700M]" },
            { y: 220, label: "GATE 5 [860M]" },
            { y: 110, label: "FINISH [1000M]" }
        ];

        ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
        ctx.font = "9px 'JetBrains Mono', monospace";
        milestones.forEach(m => {
            ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(100, m.y); ctx.lineTo(84, m.y);
            ctx.moveTo(700, m.y); ctx.lineTo(716, m.y);
            ctx.stroke();

            ctx.textAlign = "right";
            ctx.fillText(m.label, 80, m.y + 3);
            ctx.textAlign = "left";
            ctx.fillText(m.label, 720, m.y + 3);
        });

        // 6. Finish Line Checkered Banner at Y = 110
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2.5;
        ctx.setLineDash([10, 10]);
        ctx.beginPath();
        ctx.moveTo(100, 110);
        ctx.lineTo(700, 110);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    #drawCityDetails(ctx, trafficLights) {
        // 1. Draw Road Centerlines (Avenues & Boulevards) precisely between intersections
        ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([8, 8]);

        // Horizontal Avenue 1 (Y = 380) - breaks cleanly at intersections [320, 440] and [760, 880]
        ctx.beginPath();
        ctx.moveTo(40, 380); ctx.lineTo(320, 380);
        ctx.moveTo(440, 380); ctx.lineTo(760, 380);
        ctx.moveTo(880, 380); ctx.lineTo(1160, 380);
        ctx.stroke();

        // Horizontal Avenue 2 (Y = 820)
        ctx.beginPath();
        ctx.moveTo(40, 820); ctx.lineTo(320, 820);
        ctx.moveTo(440, 820); ctx.lineTo(760, 820);
        ctx.moveTo(880, 820); ctx.lineTo(1160, 820);
        ctx.stroke();

        // Vertical Boulevard 1 (X = 380) - breaks cleanly at intersections [320, 440] and [760, 880]
        ctx.beginPath();
        ctx.moveTo(380, 40); ctx.lineTo(380, 320);
        ctx.moveTo(380, 440); ctx.lineTo(380, 760);
        ctx.moveTo(380, 880); ctx.lineTo(380, 1160);
        ctx.stroke();

        // Vertical Boulevard 2 (X = 820)
        ctx.beginPath();
        ctx.moveTo(820, 40); ctx.lineTo(820, 320);
        ctx.moveTo(820, 440); ctx.lineTo(820, 760);
        ctx.moveTo(820, 880); ctx.lineTo(820, 1160);
        ctx.stroke();

        ctx.setLineDash([]);

        // 2. 4 Major 4-Way Intersections (120x120 exact junction boxes flush with building corners)
        const intersections = [
            { x: 380, y: 380 }, { x: 820, y: 380 },
            { x: 380, y: 820 }, { x: 820, y: 820 }
        ];

        intersections.forEach(intPt => {
            // Draw exact 120x120 junction boundary matching 4 building corners
            ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
            ctx.lineWidth = 1.5;
            ctx.strokeRect(intPt.x - 60, intPt.y - 60, 120, 120);

            // Tactile Corner Brackets at the 4 curb corners
            const bLen = 14;
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 2;
            // Top-Left (intPt.x - 60, intPt.y - 60)
            ctx.beginPath();
            ctx.moveTo(intPt.x - 60, intPt.y - 60 + bLen);
            ctx.lineTo(intPt.x - 60, intPt.y - 60);
            ctx.lineTo(intPt.x - 60 + bLen, intPt.y - 60);
            ctx.stroke();
            // Top-Right (intPt.x + 60, intPt.y - 60)
            ctx.beginPath();
            ctx.moveTo(intPt.x + 60 - bLen, intPt.y - 60);
            ctx.lineTo(intPt.x + 60, intPt.y - 60);
            ctx.lineTo(intPt.x + 60, intPt.y - 60 + bLen);
            ctx.stroke();
            // Bottom-Left (intPt.x - 60, intPt.y + 60)
            ctx.beginPath();
            ctx.moveTo(intPt.x - 60, intPt.y + 60 - bLen);
            ctx.lineTo(intPt.x - 60, intPt.y + 60);
            ctx.lineTo(intPt.x - 60 + bLen, intPt.y + 60);
            ctx.stroke();
            // Bottom-Right (intPt.x + 60, intPt.y + 60)
            ctx.beginPath();
            ctx.moveTo(intPt.x + 60 - bLen, intPt.y + 60);
            ctx.lineTo(intPt.x + 60, intPt.y + 60);
            ctx.lineTo(intPt.x + 60, intPt.y + 60 - bLen);
            ctx.stroke();

            // Zebra Crosswalk Markings inside each entrance
            ctx.fillStyle = "rgba(255, 255, 255, 0.16)";
            // North Crosswalk
            for (let x = intPt.x - 52; x <= intPt.x + 44; x += 16) {
                ctx.fillRect(x, intPt.y - 58, 10, 8);
            }
            // South Crosswalk
            for (let x = intPt.x - 52; x <= intPt.x + 44; x += 16) {
                ctx.fillRect(x, intPt.y + 50, 10, 8);
            }
            // West Crosswalk
            for (let y = intPt.y - 52; y <= intPt.y + 44; y += 16) {
                ctx.fillRect(intPt.x - 58, y, 8, 10);
            }
            // East Crosswalk
            for (let y = intPt.y - 52; y <= intPt.y + 44; y += 16) {
                ctx.fillRect(intPt.x + 50, y, 8, 10);
            }
        });

        // 3. Traffic Light Signals & Dynamic Stop Lines
        if (trafficLights && trafficLights.length > 0) {
            trafficLights.forEach(tl => {
                this.#drawTrafficLightSignal(ctx, tl);
            });
        }
    }

    #drawTrafficLightSignal(ctx, tl) {
        ctx.save();
        ctx.translate(tl.x, tl.y);

        const isNS = tl.direction === 'NS';
        const isRed = tl.state === 'RED';
        const isYellow = tl.state === 'YELLOW';

        // 1. Dynamic Stop Lines
        // For approaching vehicles, the stop line spans strictly from sidewalk curb to centerline (60px)
        ctx.save();
        if (isRed) {
            ctx.strokeStyle = '#ff2222';
            ctx.lineWidth = 4;
            ctx.shadowColor = '#ff2222';
            ctx.shadowBlur = 8;
        } else if (isYellow) {
            ctx.strokeStyle = '#ffcc00';
            ctx.lineWidth = 3;
            ctx.shadowColor = '#ffcc00';
            ctx.shadowBlur = 6;
        } else {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
            ctx.lineWidth = 1.5;
            ctx.shadowBlur = 0;
        }

        if (isNS) {
            // Stop line for Northbound traffic (approaching from South: Y = +60, X in [0, +60])
            ctx.beginPath();
            ctx.moveTo(0, 60); ctx.lineTo(60, 60);
            ctx.stroke();

            // Stop line for Southbound traffic (approaching from North: Y = -60, X in [-60, 0])
            ctx.beginPath();
            ctx.moveTo(-60, -60); ctx.lineTo(0, -60);
            ctx.stroke();
        } else {
            // Stop line for Eastbound traffic (approaching from West: X = -60, Y in [0, +60])
            ctx.beginPath();
            ctx.moveTo(-60, 0); ctx.lineTo(-60, 60);
            ctx.stroke();

            // Stop line for Westbound traffic (approaching from East: X = +60, Y in [-60, 0])
            ctx.beginPath();
            ctx.moveTo(60, -60); ctx.lineTo(60, 0);
            ctx.stroke();
        }
        ctx.restore();

        // 2. Physical Curb-Mounted Traffic Signal Housings
        // Mounted immediately on the sidewalk curb beside each approaching lane's stop line
        if (isNS) {
            // Northbound approach signal post (Right curb: X = +68, Y = +52)
            this.#renderSignalBox(ctx, 68, 52, tl.state);
            // Southbound approach signal post (Right curb: X = -68, Y = -52)
            this.#renderSignalBox(ctx, -68, -52, tl.state);
        } else {
            // Eastbound approach signal post (Right curb: X = -52, Y = +68)
            this.#renderSignalBox(ctx, -52, 68, tl.state);
            // Westbound approach signal post (Right curb: X = +52, Y = -68)
            this.#renderSignalBox(ctx, 52, -68, tl.state);
        }

        ctx.restore();
    }

    #renderSignalBox(ctx, ox, oy, state) {
        ctx.save();

        // Mounting Post / Base on curb
        ctx.fillStyle = '#222222';
        ctx.beginPath();
        ctx.arc(ox, oy, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Signal Housing Box (Crisp Industrial Vertical Enclosure)
        const boxW = 14;
        const boxH = 36;
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(ox - boxW / 2, oy - boxH / 2, boxW, boxH);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(ox - boxW / 2, oy - boxH / 2, boxW, boxH);

        const r = 3.6;

        // 1. Red Lamp (top: oy - 10)
        ctx.beginPath();
        ctx.arc(ox, oy - 10, r, 0, Math.PI * 2);
        if (state === 'RED') {
            ctx.fillStyle = '#ff2222';
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 0.8;
            ctx.stroke();
            ctx.save();
            ctx.fillStyle = 'rgba(255, 34, 34, 0.4)';
            ctx.beginPath(); ctx.arc(ox, oy - 10, 8, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        } else {
            ctx.fillStyle = '#240606';
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 0.6;
            ctx.stroke();
        }

        // 2. Yellow Lamp (middle: oy)
        ctx.beginPath();
        ctx.arc(ox, oy, r, 0, Math.PI * 2);
        if (state === 'YELLOW') {
            ctx.fillStyle = '#ffcc00';
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 0.8;
            ctx.stroke();
            ctx.save();
            ctx.fillStyle = 'rgba(255, 204, 0, 0.4)';
            ctx.beginPath(); ctx.arc(ox, oy, 8, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        } else {
            ctx.fillStyle = '#221800';
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 0.6;
            ctx.stroke();
        }

        // 3. Green Lamp (bottom: oy + 10)
        ctx.beginPath();
        ctx.arc(ox, oy + 10, r, 0, Math.PI * 2);
        if (state === 'GREEN') {
            ctx.fillStyle = '#00ff66';
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 0.8;
            ctx.stroke();
            ctx.save();
            ctx.fillStyle = 'rgba(0, 255, 102, 0.4)';
            ctx.beginPath(); ctx.arc(ox, oy + 10, 8, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        } else {
            ctx.fillStyle = '#021a08';
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 0.6;
            ctx.stroke();
        }

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
        ctx.fillStyle = "#0a0a0a";
        ctx.fillRect(-w / 2, -h / 2, w, h);
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.strokeRect(-w / 2, -h / 2, w, h);

        // Sharp Monochrome Vector Crosshair (Zero Emoji, Pure Vector Icon)
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, -3, 11, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(0, -3, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(0, -18); ctx.lineTo(0, -13);
        ctx.moveTo(0, 7);   ctx.lineTo(0, 12);
        ctx.moveTo(-18, -3); ctx.lineTo(-13, -3);
        ctx.moveTo(7, -3);   ctx.lineTo(12, -3);
        ctx.stroke();

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 9px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
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

        // Sharp Vector Direction Arrow (No Emoji)
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.moveTo(0, -38);
        ctx.lineTo(6, -30);
        ctx.lineTo(-6, -30);
        ctx.closePath();
        ctx.fill();

        ctx.font = "9px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillText("START", 0, -18);
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

            // Vector Crosshair Target (No Emoji)
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2 / scale;
            ctx.beginPath();
            ctx.arc(t.x, t.y, 8 / scale, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(t.x, t.y, 3 / scale, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
        }

        // Spawn Pad
        const s = tempMap.spawnPoint;
        if (s) {
            ctx.strokeStyle = '#888888';
            ctx.strokeRect(s.x - 22, s.y - 25, 44, 50);

            // Vector Direction Arrow (No Emoji)
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.moveTo(s.x, s.y - 12 / scale);
            ctx.lineTo(s.x + 8 / scale, s.y + 8 / scale);
            ctx.lineTo(s.x - 8 / scale, s.y + 8 / scale);
            ctx.closePath();
            ctx.fill();
        }

        ctx.restore();
    }
}
