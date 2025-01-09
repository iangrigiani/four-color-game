class Game {
    constructor() {
        // Solo inicializar variables básicas en el constructor
        this.colors = ['#FF0000', '#00FF00', '#0000FF', '#FFD700'];
        this.nodeColors = {};
        this.levelData = null;
        this.selectedNode = null;
        this.levelLoader = levelLoader;
        this.isLevelComplete = false;
        this.draggedColor = null;
        this.timerStarted = false;
        this.startTime = null;
        this.timerInterval = null;
        this.timerElement = document.getElementById('timer');
        this.timeDisplay = document.getElementById('time');
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

            this.initDragAndDrop();
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
        try {
            // Limpiar estado anterior
            this.nodeColors = {};
            this.selectedNode = null;
            this.isLevelComplete = false;
            
            // Reiniciar el timer
            this.stopTimer();
            this.timerStarted = false;
            this.startTime = null;
            this.timerElement.style.display = 'none';
            this.timeDisplay.textContent = '0.00';
            
            // Ocultar mensaje anterior
            const messageDiv = document.getElementById('message');
            messageDiv.style.display = 'none';
            
            // Cargar nuevo nivel
            this.levelLoader.loadLevel(levelNumber).then(levelData => {
                this.levelData = levelData;
                this.drawGraph();
            });
        } catch (error) {
            throw error;
        }
    }

    drawGraph() {
        this.svg.innerHTML = '';
        const padding = 50;
        const maxX = Math.max(...this.levelData.nodes.map(n => n.x));
        const maxY = Math.max(...this.levelData.nodes.map(n => n.y));
        const canvasSize = LevelGenerator.CONFIG.CANVAS_SIZE;
        const scaleX = (canvasSize - 2 * padding) / maxX;
        const scaleY = (canvasSize - 2 * padding) / maxY;
        const scale = Math.min(scaleX, scaleY);

        // Calcular el tamaño de los nodos según la cantidad
        const nodeCount = this.levelData.nodes.length;
        const baseRadius = 45; // Radio base para pocos nodos
        const minRadius = 20;  // Radio mínimo para muchos nodos
        const nodeRadius = Math.max(
            minRadius,
            Math.round(baseRadius * (1 - (nodeCount - LevelGenerator.CONFIG.MIN_NODES) / 
            (LevelGenerator.CONFIG.MAX_NODES - LevelGenerator.CONFIG.MIN_NODES)))
        );
            
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
            circle.setAttribute('r', nodeRadius);
            circle.setAttribute('data-id', node.id);
            circle.setAttribute('class', 'node uncolored');
            
            // Si el nodo ya tiene un color asignado, aplicarlo
            if (this.nodeColors[node.id]) {
                circle.classList.remove('uncolored');
                circle.setAttribute('fill', this.nodeColors[node.id]);
            }
            
            circle.addEventListener('click', () => this.handleNodeClick(node.id, circle));
            this.svg.appendChild(circle);

            // Añadir eventos para el efecto visual durante el drag
            circle.addEventListener('dragenter', () => {
                if (this.draggedColor) {
                    circle.classList.add('dragover');
                }
            });

            circle.addEventListener('dragleave', () => {
                circle.classList.remove('dragover');
            });
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
        // Iniciar el timer al colorear el primer nodo
        this.startTimer();

        // Actualizar el color del nodo
        this.nodeColors[nodeId] = color;
        const node = this.svg.querySelector(`[data-id="${nodeId}"]`);
        node.setAttribute('fill', color);
        node.classList.add('colored');
        node.classList.remove('uncolored');

        // Limpiar todos los estados de conflicto
        this.svg.querySelectorAll('.node.conflict').forEach(n => {
            n.classList.remove('conflict');
        });

        // Verificar conflictos solo para el nodo actual y sus adyacentes
        const adjacentNodes = this.getAdjacentNodes(nodeId);
        let hasConflicts = false;

        // Verificar conflictos con nodos adyacentes
        adjacentNodes.forEach(adjNodeId => {
            if (this.nodeColors[adjNodeId] === color) {
                // Marcar ambos nodos como en conflicto
                this.svg.querySelector(`[data-id="${nodeId}"]`).classList.add('conflict');
                this.svg.querySelector(`[data-id="${adjNodeId}"]`).classList.add('conflict');
                hasConflicts = true;
                console.log('Conflict detected between nodes:', nodeId, 'and', adjNodeId);
            }
        });

        // Verificar si el nivel está completo
        const allNodesColored = this.levelData.nodes.every(node => 
            this.nodeColors[node.id] !== undefined
        );

        if (allNodesColored && !this.hasAnyConflicts()) {
            this.levelComplete();
        }
    }

    // Nuevo método para verificar si hay algún conflicto en el tablero
    hasAnyConflicts() {
        for (let nodeId in this.nodeColors) {
            const currentColor = this.nodeColors[nodeId];
            const adjacentNodes = this.getAdjacentNodes(nodeId);
            
            for (let adjNodeId of adjacentNodes) {
                if (this.nodeColors[adjNodeId] === currentColor) {
                    return true;
                }
            }
        }
        return false;
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

    initDragAndDrop() {
        // Configurar los botones de color para ser arrastrables
        const colorButtons = document.querySelectorAll('.colorButton');
        colorButtons.forEach(button => {
            button.setAttribute('draggable', 'true');
            
            button.addEventListener('dragstart', (e) => {
                this.draggedColor = button.dataset.color;
                e.dataTransfer.setData('text/plain', ''); // Necesario para Firefox
                button.classList.add('selected');
            });

            button.addEventListener('dragend', () => {
                this.draggedColor = null;
                button.classList.remove('selected');
            });
        });

        // Configurar el SVG para aceptar elementos arrastrados
        this.svg.addEventListener('dragover', (e) => {
            e.preventDefault(); // Necesario para permitir el drop
        });

        // Manejar el evento drop en el SVG
        this.svg.addEventListener('drop', (e) => {
            e.preventDefault();
            if (!this.draggedColor) return;

            // Encontrar el nodo más cercano al punto de drop
            const pt = this.svg.createSVGPoint();
            pt.x = e.clientX;
            pt.y = e.clientY;
            const svgP = pt.matrixTransform(this.svg.getScreenCTM().inverse());

            // Buscar el nodo más cercano dentro de un radio razonable
            const nodes = Array.from(this.svg.getElementsByClassName('node'));
            const closestNode = nodes.reduce((closest, node) => {
                const cx = parseFloat(node.getAttribute('cx'));
                const cy = parseFloat(node.getAttribute('cy'));
                const distance = Math.hypot(cx - svgP.x, cy - svgP.y);
                
                if (distance < 40 && (!closest || distance < closest.distance)) {
                    return { node, distance };
                }
                return closest;
            }, null);

            if (closestNode) {
                const nodeId = closestNode.node.getAttribute('data-id');
                this.colorNode(nodeId, this.draggedColor);
                closestNode.node.classList.remove('dragover');
            }
        });

        // Añadir efectos visuales cuando se arrastra sobre los nodos
        this.svg.addEventListener('dragenter', (e) => {
            const node = e.target.closest('.node');
            if (node && this.draggedColor) {
                node.classList.add('dragover');
            }
        });

        this.svg.addEventListener('dragleave', (e) => {
            const node = e.target.closest('.node');
            if (node) {
                node.classList.remove('dragover');
            }
        });
    }

    getAdjacentNodes(nodeId) {
        const adjacentNodes = new Set();
        
        this.levelData.connections.forEach(conn => {
            if (conn.from === nodeId) {
                adjacentNodes.add(conn.to);
            } else if (conn.to === nodeId) {
                adjacentNodes.add(conn.from);
            }
        });
        
        return Array.from(adjacentNodes);
    }

    levelComplete() {
        const finalTime = this.stopTimer();
        
        // Mostrar mensaje de éxito con el tiempo formateado
        const messageDiv = document.getElementById('message');
        const timeStr = this.formatTime(finalTime);
        messageDiv.textContent = `¡Felicitaciones! Has completado el nivel en ${timeStr}`;
        messageDiv.className = 'success';
        messageDiv.style.display = 'block';
        
        // Ocultar el timer
        this.timerElement.style.display = 'none';
        
        // Marcar el nivel como completado
        this.isLevelComplete = true;
        
        // Añadir efecto visual a todos los nodos
        this.levelData.nodes.forEach(node => {
            const nodeElement = this.svg.querySelector(`[data-id="${node.id}"]`);
            nodeElement.classList.add('correct');
        });
    }

    formatTime(milliseconds) {
        const hours = Math.floor(milliseconds / 3600000);
        const minutes = Math.floor((milliseconds % 3600000) / 60000);
        const seconds = Math.floor((milliseconds % 60000) / 1000);
        const ms = Math.floor((milliseconds % 1000) / 10); // Centésimas de segundo

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
        }
        if (minutes > 0) {
            return `${minutes}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
        }
        return `${seconds}.${ms.toString().padStart(2, '0')}`;
    }

    startTimer() {
        if (!this.timerStarted) {
            this.timerStarted = true;
            this.startTime = Date.now();
            this.timerElement.style.display = 'block';
            
            this.timerInterval = setInterval(() => {
                const currentTime = Date.now();
                const elapsedTime = currentTime - this.startTime;
                this.timeDisplay.textContent = this.formatTime(elapsedTime);
            }, 10); // Actualizar cada 10ms para mostrar centésimas
        }
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        return this.startTime ? Date.now() - this.startTime : 0;
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