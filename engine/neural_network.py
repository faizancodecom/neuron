"""
NEURON AI Engine - Neural Network Implementation in Python
Multi-Layer Perceptron with customizable layers, Hyperbolic Tangent activation,
weights mutation, genetic crossover, and JSON serialization.
"""

import math
import random


class Level:
    def __init__(self, input_count: int, output_count: int):
        self.inputs = [0.0] * input_count
        self.outputs = [0.0] * output_count
        self.biases = [random.uniform(-1.0, 1.0) for _ in range(output_count)]
        self.weights = [
            [random.uniform(-1.0, 1.0) for _ in range(output_count)]
            for _ in range(input_count)
        ]

    def feed_forward(self, given_inputs):
        for i in range(len(self.inputs)):
            self.inputs[i] = given_inputs[i] if i < len(given_inputs) else 0.0

        for i in range(len(self.outputs)):
            total = sum(self.inputs[j] * self.weights[j][i] for j in range(len(self.inputs)))
            total += self.biases[i]
            # Tanh activation function (-1.0 to 1.0)
            self.outputs[i] = math.tanh(total)

        return self.outputs


class NeuralNetwork:
    def __init__(self, layer_sizes=(10, 12, 8, 4)):
        self.layer_sizes = list(layer_sizes)
        self.levels = [
            Level(self.layer_sizes[i], self.layer_sizes[i + 1])
            for i in range(len(self.layer_sizes) - 1)
        ]

    def feed_forward(self, given_inputs):
        outputs = self.levels[0].feed_forward(given_inputs)
        for i in range(1, len(self.levels)):
            outputs = self.levels[i].feed_forward(outputs)
        return outputs

    def clone(self):
        copy_net = NeuralNetwork(self.layer_sizes)
        for i in range(len(self.levels)):
            src = self.levels[i]
            dst = copy_net.levels[i]
            dst.biases = list(src.biases)
            dst.weights = [list(row) for row in src.weights]
        return copy_net

    def mutate(self, rate=0.12, amount=0.45):
        for level in self.levels:
            for i in range(len(level.biases)):
                if random.random() < rate:
                    level.biases[i] += random.uniform(-1.0, 1.0) * amount
                    level.biases[i] = max(-1.0, min(1.0, level.biases[i]))

            for i in range(len(level.weights)):
                for j in range(len(level.weights[i])):
                    if random.random() < rate:
                        level.weights[i][j] += random.uniform(-1.0, 1.0) * amount
                        level.weights[i][j] = max(-1.0, min(1.0, level.weights[i][j]))

    @staticmethod
    def crossover(parent_a, parent_b):
        child = NeuralNetwork(parent_a.layer_sizes)
        for i in range(len(child.levels)):
            la = parent_a.levels[i]
            lb = parent_b.levels[i]
            lc = child.levels[i]

            for j in range(len(lc.biases)):
                lc.biases[j] = la.biases[j] if random.random() < 0.5 else lb.biases[j]

            for j in range(len(lc.weights)):
                for k in range(len(lc.weights[j])):
                    lc.weights[j][k] = la.weights[j][k] if random.random() < 0.5 else lb.weights[j][k]
        return child

    def to_dict(self):
        return {
            'layerSizes': self.layer_sizes,
            'levels': [
                {
                    'inputs': [round(v, 4) for v in l.inputs],
                    'outputs': [round(v, 4) for v in l.outputs],
                    'biases': [round(b, 4) for b in l.biases],
                    'weights': [[round(w, 4) for w in row] for row in l.weights]
                }
                for l in self.levels
            ]
        }

    @staticmethod
    def from_dict(data):
        if not data or 'layerSizes' not in data or 'levels' not in data:
            return None
        net = NeuralNetwork(data['layerSizes'])
        for i, src_lvl in enumerate(data['levels']):
            if i < len(net.levels):
                net.levels[i].biases = [float(b) for b in src_lvl.get('biases', [])]
                net.levels[i].weights = [
                    [float(w) for w in row] for row in src_lvl.get('weights', [])
                ]
        return net
