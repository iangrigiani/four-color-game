class LevelLoader {
    constructor() {
        this.levels = {};
        this.maxLevels = 100;
    }

    async loadLevel(levelNumber) {
        try {
            if (this.levels[levelNumber]) {
                return this.levels[levelNumber];
            }

            const levelXML = LevelGenerator.generateLevel(levelNumber);
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(levelXML, "text/xml");
            
            const levelData = {
                nodes: [],
                connections: []
            };

            Array.from(xmlDoc.getElementsByTagName('node')).forEach(node => {
                levelData.nodes.push({
                    id: node.getAttribute('id'),
                    x: parseInt(node.getAttribute('x')),
                    y: parseInt(node.getAttribute('y'))
                });
            });

            Array.from(xmlDoc.getElementsByTagName('connection')).forEach(conn => {
                levelData.connections.push({
                    from: conn.getAttribute('from'),
                    to: conn.getAttribute('to')
                });
            });

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