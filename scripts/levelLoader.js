class LevelLoader {
    constructor() {
        this.levels = {};
        this.maxLevels = 20;
    }

    async loadLevel(levelNumber) {
        try {
            // Si el nivel ya está generado, devolverlo
            if (this.levels[levelNumber]) {
                return this.levels[levelNumber];
            }

            // Generar nuevo nivel
            const levelXML = LevelGenerator.generateLevel(levelNumber);
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(levelXML, "text/xml");
            
            // Convertir el XML a objeto de nivel
            const levelData = {
                nodes: [],
                connections: []
            };

            // Procesar nodos
            const nodes = xmlDoc.getElementsByTagName('node');
            Array.from(nodes).forEach(node => {
                levelData.nodes.push({
                    id: node.getAttribute('id'),
                    x: parseInt(node.getAttribute('x')),
                    y: parseInt(node.getAttribute('y'))
                });
            });

            // Procesar conexiones
            const connections = xmlDoc.getElementsByTagName('connection');
            Array.from(connections).forEach(conn => {
                levelData.connections.push({
                    from: conn.getAttribute('from'),
                    to: conn.getAttribute('to')
                });
            });

            // Guardar el nivel generado
            this.levels[levelNumber] = levelData;
            return levelData;
        } catch (error) {
            console.error('Error al cargar el nivel:', error);
            throw error;
        }
    }

    async initializeLevelSelector() {
        try {
            const selector = document.getElementById('level');
            if (!selector) {
                throw new Error('Selector de nivel no encontrado');
            }

            // Limpiar selector
            selector.innerHTML = '';

            // Agregar opciones para cada nivel
            for (let i = 1; i <= this.maxLevels; i++) {
                const option = document.createElement('option');
                option.value = i;
                option.textContent = `Nivel ${i}`;
                selector.appendChild(option);
            }

            return true;
        } catch (error) {
            console.error('Error al inicializar el selector de niveles:', error);
            throw error;
        }
    }
}

// Crear una instancia global del LevelLoader
window.levelLoader = new LevelLoader();