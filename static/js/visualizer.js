/**
 * NEURON - Sharp Technical Neural Network & Fitness Visualizer (Monochrome)
 */

class Visualizer {
    /**
     * Draw live neural network diagram (Compact or Expanded mode)
     */
    static drawNetwork(ctx, network, isDetailed = false) {
        if (!network || !ctx) return;

        const w = ctx.canvas.width;
        const h = ctx.canvas.height;
        ctx.clearRect(0, 0, w, h);

        const margin = isDetailed ? 48 : 22;
        const left = margin;
        const top = margin;
        const width = w - margin * 2;
        const height = h - margin * 2;

        const levelHeight = height / network.levels.length;

        const inputLabels = ["R1", "R2", "R3", "R4", "R5", "R6", "R7", "SPD", "DIR", "DST"];
        const outputLabels = ["FWD", "REV", "LFT", "RGT"];

        for (let i = network.levels.length - 1; i >= 0; i--) {
            const levelTop = top + lerp(
                height - levelHeight,
                0,
                network.levels.length === 1 ? 0.5 : i / (network.levels.length - 1)
            );

            Visualizer.#drawLevel(
                ctx,
                network.levels[i],
                left,
                levelTop,
                width,
                levelHeight,
                i === network.levels.length - 1 ? outputLabels : [],
                i === 0 ? inputLabels : [],
                isDetailed
            );
        }

        // Draw Layer Headers in detailed mode
        if (isDetailed) {
            ctx.save();
            ctx.font = "10px 'JetBrains Mono', monospace";
            ctx.fillStyle = "#888888";
            ctx.textAlign = "left";
            ctx.fillText("OUTPUT LAYER [4]", 14, top - 18);
            ctx.fillText("HIDDEN LAYER 2 [8]", 14, top + (height / 3) - 10);
            ctx.fillText("HIDDEN LAYER 1 [12]", 14, top + (height * 2 / 3) - 10);
            ctx.fillText("INPUT SENSORS [10]", 14, top + height + 24);
            ctx.restore();
        }
    }

    static #drawLevel(ctx, level, left, top, width, height, outputLabels, inputLabels, isDetailed) {
        const right = left + width;
        const bottom = top + height;
        const { inputs, outputs, weights, biases } = level;

        // 1. Draw connection weights (Monochrome)
        for (let i = 0; i < inputs.length; i++) {
            for (let j = 0; j < outputs.length; j++) {
                ctx.beginPath();
                ctx.moveTo(Visualizer.#getNodeX(inputs, i, left, right), bottom);
                ctx.lineTo(Visualizer.#getNodeX(outputs, j, left, right), top);

                const value = weights[i][j];
                const absVal = Math.abs(value);
                const alpha = Math.min(0.9, absVal * 0.8 + 0.1);
                ctx.lineWidth = Math.min(2.5, absVal * 1.8 + 0.4);

                if (value >= 0) {
                    // Positive weight: Solid White line
                    ctx.setLineDash([]);
                    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.85})`;
                } else {
                    // Negative weight: Dashed line
                    ctx.setLineDash([2, 3]);
                    ctx.strokeStyle = `rgba(160, 160, 160, ${alpha * 0.55})`;
                }
                ctx.stroke();
                ctx.setLineDash([]);
            }
        }

        // 2. Draw input nodes (bottom row of level)
        const nodeRadius = isDetailed ? 9 : 5.5;
        for (let i = 0; i < inputs.length; i++) {
            const x = Visualizer.#getNodeX(inputs, i, left, right);
            const val = inputs[i] || 0;

            // Outer dark background
            ctx.beginPath();
            ctx.arc(x, bottom, nodeRadius, 0, Math.PI * 2);
            ctx.fillStyle = "#0a0a0a";
            ctx.fill();

            // Inner activation fill
            const fillRadius = Math.max(0, Math.min(nodeRadius - 1, (nodeRadius - 1) * Math.abs(val)));
            if (fillRadius > 0) {
                ctx.beginPath();
                ctx.arc(x, bottom, fillRadius, 0, Math.PI * 2);
                ctx.fillStyle = val > 0 ? "#ffffff" : "#666666";
                ctx.fill();
            }

            // Node border
            ctx.beginPath();
            ctx.arc(x, bottom, nodeRadius, 0, Math.PI * 2);
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 1;
            ctx.stroke();

            // Input label
            if (inputLabels && inputLabels[i]) {
                ctx.fillStyle = "#aaaaaa";
                ctx.font = `${isDetailed ? 9 : 7}px 'JetBrains Mono', monospace`;
                ctx.textAlign = "center";
                ctx.fillText(inputLabels[i], x, bottom + (isDetailed ? 18 : 12));

                if (isDetailed) {
                    ctx.fillStyle = "#ffffff";
                    ctx.font = "8px 'JetBrains Mono', monospace";
                    ctx.fillText(val.toFixed(2), x, bottom + 28);
                }
            }
        }

        // 3. Draw output nodes (top row of level)
        for (let i = 0; i < outputs.length; i++) {
            const x = Visualizer.#getNodeX(outputs, i, left, right);
            const val = outputs[i] || 0;

            ctx.beginPath();
            ctx.arc(x, top, nodeRadius * 1.15, 0, Math.PI * 2);
            ctx.fillStyle = "#0a0a0a";
            ctx.fill();

            // Output active fill
            const fillR = Math.min(nodeRadius * 1.15 - 1, (nodeRadius * 1.15 - 1) * Math.min(1, Math.abs(val)));
            if (fillR > 0) {
                ctx.beginPath();
                ctx.arc(x, top, fillR, 0, Math.PI * 2);
                ctx.fillStyle = val > 0.1 ? "#ffffff" : "#444444";
                ctx.fill();
            }

            // Node border & bias indicator
            ctx.beginPath();
            ctx.arc(x, top, nodeRadius * 1.15, 0, Math.PI * 2);
            ctx.strokeStyle = biases && biases[i] > 0 ? "#ffffff" : "#777777";
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Output label
            if (outputLabels && outputLabels[i]) {
                const isActive = val > 0.1;
                ctx.fillStyle = isActive ? "#ffffff" : "#888888";
                ctx.font = `bold ${isDetailed ? 10 : 8}px 'JetBrains Mono', monospace`;
                ctx.textAlign = "center";
                ctx.fillText(outputLabels[i], x, top - (isDetailed ? 14 : 9));

                if (isDetailed) {
                    ctx.font = "8px 'JetBrains Mono', monospace";
                    ctx.fillStyle = isActive ? "#ffffff" : "#666666";
                    ctx.fillText(val.toFixed(2), x, top - 4);
                }
            }
        }
    }

    static #getNodeX(nodes, index, left, right) {
        return lerp(
            left,
            right,
            nodes.length === 1 ? 0.5 : index / (nodes.length - 1)
        );
    }

    /**
     * Draw Generational Fitness Progression Chart (Monochrome Technical)
     */
    static drawFitnessChart(ctx, history) {
        if (!ctx) return;
        const w = ctx.canvas.width;
        const h = ctx.canvas.height;

        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = "#080808";
        ctx.fillRect(0, 0, w, h);

        if (!history || history.length < 2) {
            ctx.fillStyle = "#555555";
            ctx.font = "11px 'JetBrains Mono', monospace";
            ctx.textAlign = "center";
            ctx.fillText("[ GATHERING GENERATIONAL DATA... ]", w / 2, h / 2);
            return;
        }

        const margin = { top: 22, right: 18, bottom: 25, left: 40 };
        const plotW = w - margin.left - margin.right;
        const plotH = h - margin.top - margin.bottom;

        // Scaling
        let maxFit = 100;
        history.forEach(d => {
            if (d.bestFitness > maxFit) maxFit = d.bestFitness;
        });
        maxFit = Math.ceil(maxFit * 1.15);

        // Grid lines
        ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const y = margin.top + (plotH / 4) * i;
            ctx.beginPath();
            ctx.moveTo(margin.left, y);
            ctx.lineTo(w - margin.right, y);
            ctx.stroke();

            const val = Math.round(maxFit - (maxFit / 4) * i);
            ctx.fillStyle = "#666666";
            ctx.font = "9px 'JetBrains Mono', monospace";
            ctx.textAlign = "right";
            ctx.fillText(val, margin.left - 6, y + 3);
        }

        // 1. Average Fitness Line (Dashed White)
        ctx.beginPath();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
        ctx.lineWidth = 1.2;
        ctx.setLineDash([3, 3]);

        for (let i = 0; i < history.length; i++) {
            const x = margin.left + (plotW / (history.length - 1)) * i;
            const y = margin.top + plotH - (history[i].avgFitness / maxFit) * plotH;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.setLineDash([]);

        // 2. Best Fitness Line & Shaded Area (Solid White)
        ctx.beginPath();
        for (let i = 0; i < history.length; i++) {
            const x = margin.left + (plotW / (history.length - 1)) * i;
            const y = margin.top + plotH - (history[i].bestFitness / maxFit) * plotH;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }

        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Shaded area under curve
        const lastX = margin.left + plotW;
        ctx.lineTo(lastX, margin.top + plotH);
        ctx.lineTo(margin.left, margin.top + plotH);
        ctx.closePath();
        ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
        ctx.fill();

        // Latest generation point
        const latest = history[history.length - 1];
        const latestX = margin.left + plotW;
        const latestY = margin.top + plotH - (latest.bestFitness / maxFit) * plotH;

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(latestX - 3, latestY - 3, 6, 6);
    }
}
