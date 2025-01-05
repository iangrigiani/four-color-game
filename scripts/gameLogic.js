class Game {
    constructor() {
        // Solo inicializar variables básicas en el constructor
        this.colors = ['#FF0000', '#00FF00', '#0000FF', '#FFD700'];
        this.nodeColors = {};
        this.levelData = null;
        this.selectedNode = null;
        this.levelLoader = levelLoader;
        this.isLevelComplete = false;
    }

    init() {
        return new Promise((resolve, reject) => {
            // Obtener referencias a los elementos del DOM
            this.svg = document.getElementById('gameBoard');
            const colorPanel = document.getElementById('colorPanel');
            const levelSelector = document.getElementById('level');

            // Verificar que todos los elementos necesarios existen
            if (!this.svg || !colorPanel || !levelSelector) {
                console.error('No se pudieron encontrar todos los elementos necesarios:', {
                    svg: !!this.svg,
                    colorPanel: !!colorPanel,
                    levelSelector: !!levelSelector
                });
                reject('Elementos DOM no encontrados');
                return;
            }

            // Inicializar componentes
            this.initializeColorPanel();
            this.initializeEventListeners();
            
            // Inicializar el selector de niveles y cargar el primer nivel
            this.levelLoader.initializeLevelSelector()
                .then(() => this.loadLevel(1))
                .then(() => resolve(true))
                .catch(error => {
                    console.error('Error durante la inicialización:', error);
                    reject(error);
                });
        });
    }

    initializeColorPanel() {
        const colorPanel = document.getElementById('colorPanel');
        const colorButtons = colorPanel.getElementsByClassName('colorButton');

        Array.from(colorButtons).forEach(button => {
            button.addEventListener('click', () => {
                if (this.selectedNode) {
                    const color = button.getAttribute('data-color');
                    this.colorNode(this.selectedNode, color);
                    // Deseleccionar el nodo después de colorearlo
                    const nodeElement = this.svg.querySelector(`circle[data-id="${this.selectedNode}"]`);
                    if (nodeElement) {
                        nodeElement.classList.remove('selected');
                    }
                    this.selectedNode = null;
                }
            });
        });
    }

    initializeEventListeners() {
        const levelSelector = document.getElementById('level');
        levelSelector.addEventListener('change', (e) => {
            const levelNumber = parseInt(e.target.value);
            this.loadLevel(levelNumber);
        });

        // Inicializar el selector de niveles
        this.levelLoader.initializeLevelSelector();
    }

    async loadLevel(levelNumber) {
        console.log('Cargando nivel:', levelNumber);
        try {
            // Limpiar estado anterior
            this.nodeColors = {};
            this.selectedNode = null;
            this.isLevelComplete = false;
            
            // Ocultar mensaje anterior
            const messageDiv = document.getElementById('message');
            messageDiv.style.display = 'none';
            
            // Cargar nuevo nivel
            this.levelLoader.loadLevel(levelNumber).then(levelData => {
                this.levelData = levelData;
                this.drawGraph();
            });
        } catch (error) {
            console.error('Error cargando nivel:', error);
        }
    }

    drawGraph() {
        this.svg.innerHTML = '';
        const padding = 50;
        const maxX = Math.max(...this.levelData.nodes.map(n => n.x));
        const maxY = Math.max(...this.levelData.nodes.map(n => n.y));
        const scaleX = (800 - 2 * padding) / maxX;
        const scaleY = (600 - 2 * padding) / maxY;
        const scale = Math.min(scaleX, scaleY);

        // Dibujar conexiones primero
        this.levelData.connections.forEach(conn => {
            const fromNode = this.levelData.nodes.find(n => n.id === conn.from);
            const toNode = this.levelData.nodes.find(n => n.id === conn.to);
            
            const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute('x1', fromNode.x * scale + padding);
            line.setAttribute('y1', fromNode.y * scale + padding);
            line.setAttribute('x2', toNode.x * scale + padding);
            line.setAttribute('y2', toNode.y * scale + padding);
            line.setAttribute('class', 'connection');
            this.svg.appendChild(line);
        });

        // Dibujar nodos
        this.levelData.nodes.forEach(node => {
            const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            circle.setAttribute('cx', node.x * scale + padding);
            circle.setAttribute('cy', node.y * scale + padding);
            circle.setAttribute('r', '20');
            circle.setAttribute('data-id', node.id);
            circle.setAttribute('class', 'node uncolored');
            
            // Si el nodo ya tiene un color asignado, aplicarlo
            if (this.nodeColors[node.id]) {
                circle.classList.remove('uncolored');
                circle.setAttribute('fill', this.nodeColors[node.id]);
            }
            
            circle.addEventListener('click', () => this.handleNodeClick(node.id, circle));
            this.svg.appendChild(circle);
        });
    }

    handleNodeClick(nodeId, nodeElement) {
        // Si el nodo clickeado es el que ya está seleccionado, lo deseleccionamos
        if (this.selectedNode === nodeId) {
            this.clearSelection();
            return;
        }

        // Limpiar selección anterior
        this.clearSelection();

        // Seleccionar nuevo nodo
        this.selectedNode = nodeId;
        nodeElement.classList.add('selected');

        // Resaltar conexiones y nodos conectados
        this.highlightConnections(nodeId);
    }

    clearSelection() {
        // Remover clases de resaltado
        this.svg.querySelectorAll('.node').forEach(node => {
            node.classList.remove('selected', 'connected-to-selected');
        });
        this.svg.querySelectorAll('.connection').forEach(conn => {
            conn.classList.remove('connected-to-selected');
        });
        this.selectedNode = null;
    }

    highlightConnections(nodeId) {
        // Encontrar todas las conexiones relacionadas con este nodo
        const connectedNodes = new Set();
        
        this.levelData.connections.forEach(conn => {
            if (conn.from === nodeId || conn.to === nodeId) {
                // Resaltar la conexión
                const line = this.svg.querySelector(
                    `line[x1="${this.getNodeX(conn.from)}"][y1="${this.getNodeY(conn.from)}"]` +
                    `[x2="${this.getNodeX(conn.to)}"][y2="${this.getNodeY(conn.to)}"]`
                );
                if (line) {
                    line.classList.add('connected-to-selected');
                }

                // Agregar el nodo conectado al conjunto
                connectedNodes.add(conn.from === nodeId ? conn.to : conn.from);
            }
        });

        // Resaltar los nodos conectados
        connectedNodes.forEach(connectedNodeId => {
            const connectedNode = this.svg.querySelector(`circle[data-id="${connectedNodeId}"]`);
            if (connectedNode) {
                connectedNode.classList.add('connected-to-selected');
            }
        });
    }

    getNodeX(nodeId) {
        const node = this.levelData.nodes.find(n => n.id === nodeId);
        return node ? node.x : 0;
    }

    getNodeY(nodeId) {
        const node = this.levelData.nodes.find(n => n.id === nodeId);
        return node ? node.y : 0;
    }

    colorNode(nodeId, color) {
        const node = this.svg.querySelector(`circle[data-id="${nodeId}"]`);
        if (!node) return;

        // Limpiar selección antes de colorear
        this.clearSelection();

        // Aplicar el nuevo color
        node.classList.remove('uncolored');
        node.setAttribute('fill', color);
        this.nodeColors[nodeId] = color;

        // Agregar clase para efectos visuales
        node.classList.add('colored');

        // Verificar si el color es válido
        this.checkNodeColors();
    }

    checkSolution() {
        // Verificar si todos los nodos están coloreados
        const allNodesColored = this.levelData.nodes.every(node => 
            this.nodeColors[node.id] !== undefined
        );

        if (allNodesColored) {
            this.validateSolution();
        } else {
            // Ocultar mensaje si no todos los nodos están coloreados
            const messageDiv = document.getElementById('message');
            messageDiv.style.display = 'none';
            this.isLevelComplete = false;
        }
    }

    validateSolution() {
        // Verificar que no haya nodos adyacentes del mismo color
        const isValid = this.levelData.connections.every(conn => {
            const fromColor = this.nodeColors[conn.from];
            const toColor = this.nodeColors[conn.to];
            return fromColor !== toColor;
        });

        const messageDiv = document.getElementById('message');
        messageDiv.style.display = 'block';
        
        if (isValid) {
            messageDiv.className = 'success';
            messageDiv.textContent = '¡Felicitaciones! Has completado el nivel correctamente.';
            this.isLevelComplete = true;
            this.highlightValidSolution();
        } else {
            messageDiv.className = 'error';
            messageDiv.textContent = 'Hay nodos adyacentes del mismo color. Puedes seguir modificando los colores para encontrar la solución correcta.';
            this.isLevelComplete = false;
            this.highlightConflicts();
        }
    }

    highlightValidSolution() {
        // Añadir efecto visual para solución correcta
        this.levelData.nodes.forEach(node => {
            const circle = this.svg.querySelector(`circle[data-id="${node.id}"]`);
            circle.classList.add('correct');
        });
    }

    highlightConflicts() {
        // Resaltar nodos con conflictos
        this.levelData.connections.forEach(conn => {
            const fromColor = this.nodeColors[conn.from];
            const toColor = this.nodeColors[conn.to];
            
            if (fromColor === toColor) {
                const node1 = this.svg.querySelector(`circle[data-id="${conn.from}"]`);
                const node2 = this.svg.querySelector(`circle[data-id="${conn.to}"]`);
                node1.classList.add('conflict');
                node2.classList.add('conflict');
            }
        });
    }

    deselectNode() {
        if (this.selectedNode) {
            const node = this.svg.querySelector(`circle[data-id="${this.selectedNode}"]`);
            node.classList.remove('selected');
            this.selectedNode = null;
        }
    }

    checkCompletion() {
        // Verificar si todos los nodos están coloreados
        const allNodesColored = this.levelData.nodes.every(node => 
            this.nodeColors[node.id] !== undefined
        );

        if (allNodesColored) {
            this.validateSolution();
        }
    }

    checkNodeColors() {
        let isValid = true;
        const coloredNodes = Object.keys(this.nodeColors);
        
        // Verificar cada nodo coloreado
        coloredNodes.forEach(nodeId => {
            const nodeColor = this.nodeColors[nodeId];
            
            // Encontrar nodos conectados
            this.levelData.connections.forEach(conn => {
                if (conn.from === nodeId || conn.to === nodeId) {
                    const connectedNodeId = conn.from === nodeId ? conn.to : conn.from;
                    const connectedNodeColor = this.nodeColors[connectedNodeId];
                    
                    // Si el nodo conectado tiene el mismo color, marcar conflicto
                    if (connectedNodeColor === nodeColor) {
                        isValid = false;
                        const node = this.svg.querySelector(`circle[data-id="${nodeId}"]`);
                        const connectedNode = this.svg.querySelector(`circle[data-id="${connectedNodeId}"]`);
                        if (node) node.classList.add('conflict');
                        if (connectedNode) connectedNode.classList.add('conflict');
                    }
                }
            });
        });

        // Si todos los nodos están coloreados y no hay conflictos, nivel completado
        if (isValid && coloredNodes.length === this.levelData.nodes.length && !this.isLevelComplete) {
            this.isLevelComplete = true;
            this.showMessage('¡Nivel completado!');
            coloredNodes.forEach(nodeId => {
                const node = this.svg.querySelector(`circle[data-id="${nodeId}"]`);
                if (node) node.classList.add('correct');
            });
        }
    }

    showMessage(text) {
        const messageDiv = document.getElementById('message');
        if (messageDiv) {
            messageDiv.textContent = text;
            messageDiv.style.display = 'block';
            setTimeout(() => {
                messageDiv.style.display = 'none';
            }, 3000);
        }
    }
}

// Esperar a que el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', () => {
    // Crear instancia del juego
    const game = new Game();
    
    // Intentar inicializar
    game.init()
        .then(() => {
            window.game = game;
            console.log('Juego inicializado correctamente');
        })
        .catch(error => {
            console.error('Error al inicializar el juego:', error);
        });
});