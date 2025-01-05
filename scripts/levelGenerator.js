class LevelGenerator {
    static generateLevel(levelNumber) {
        const config = this.getLevelConfig(levelNumber);
        const nodes = this.generateNodes(config);
        const connections = this.generateConnections(nodes, config);
        return this.generateXML(nodes, connections);
    }

    static getLevelConfig(levelNumber) {
        // Configuración progresiva según el nivel
        return {
            nodeCount: Math.min(5 + Math.floor(levelNumber * 1.5), 20), // Incrementa nodos gradualmente
            minEdgesPerNode: Math.min(2 + Math.floor(levelNumber / 3), 5), // Incrementa conexiones mínimas
            maxEdgesPerNode: Math.min(3 + Math.floor(levelNumber / 2), 7), // Incrementa conexiones máximas
            pattern: this.getPatternForLevel(levelNumber)
        };
    }

    static getPatternForLevel(levelNumber) {
        // Ahora usaremos patrones aleatorios para más variedad
        if (levelNumber <= 3) {
            // Niveles iniciales: mezcla de patrones simples
            return ['simple-random', 'simple-circular', 'simple-scattered'][Math.floor(Math.random() * 3)];
        } else if (levelNumber <= 8) {
            // Niveles intermedios: más variedad de patrones
            return ['scattered', 'asymmetric', 'clustered'][Math.floor(Math.random() * 3)];
        } else {
            // Niveles avanzados: patrones complejos y aleatorios
            return ['complex-random', 'multi-cluster', 'dynamic'][Math.floor(Math.random() * 3)];
        }
    }

    static generateNodes(config) {
        const nodes = [];
        const { nodeCount, pattern } = config;
        // Usar más espacio del SVG
        const margin = 80; // Margen desde los bordes
        const width = 1000 - (2 * margin);  // Ancho útil
        const height = 1000 - (2 * margin); // Alto útil
        const centerX = 500;
        const centerY = 500;

        switch (pattern) {
            case 'simple-random':
                // Distribución aleatoria usando todo el espacio
                for (let i = 0; i < nodeCount; i++) {
                    nodes.push({
                        id: `n${i + 1}`,
                        x: Math.round(margin + Math.random() * width),
                        y: Math.round(margin + Math.random() * height)
                    });
                }
                break;

            case 'simple-circular':
                // Distribución circular usando más espacio
                const radius = Math.min(width, height) * 0.4; // 40% del espacio disponible
                for (let i = 0; i < nodeCount; i++) {
                    const baseAngle = (i * Math.PI * 1.5) / nodeCount;
                    const angleVar = (Math.random() - 0.5) * Math.PI / 6;
                    const r = radius + (Math.random() - 0.5) * radius * 0.5;
                    nodes.push({
                        id: `n${i + 1}`,
                        x: Math.round(centerX + r * Math.cos(baseAngle + angleVar)),
                        y: Math.round(centerY + r * Math.sin(baseAngle + angleVar))
                    });
                }
                break;

            case 'scattered':
                // Distribución en clusters espaciados
                const clusterCount = Math.floor(nodeCount / 3);
                const clusterCenters = [];
                
                // Generar centros de clusters bien distribuidos
                for (let i = 0; i < clusterCount; i++) {
                    clusterCenters.push({
                        x: margin + (width * (i + 1)) / (clusterCount + 1),
                        y: margin + Math.random() * height
                    });
                }

                for (let i = 0; i < nodeCount; i++) {
                    if (i < clusterCount * 2) {
                        const cluster = clusterCenters[i % clusterCount];
                        nodes.push({
                            id: `n${i + 1}`,
                            x: Math.round(cluster.x + (Math.random() - 0.5) * 150),
                            y: Math.round(cluster.y + (Math.random() - 0.5) * 150)
                        });
                    } else {
                        nodes.push({
                            id: `n${i + 1}`,
                            x: Math.round(margin + Math.random() * width),
                            y: Math.round(margin + Math.random() * height)
                        });
                    }
                }
                break;

            case 'asymmetric':
                // Distribución asimétrica usando todo el espacio
                const quadrants = [[1,1], [1,-1], [-1,1], [-1,-1]];
                const maxRadius = Math.min(width, height) * 0.45;
                for (let i = 0; i < nodeCount; i++) {
                    const quad = quadrants[i % quadrants.length];
                    const r = Math.random() * maxRadius + maxRadius * 0.2;
                    const angle = Math.random() * Math.PI / 2;
                    nodes.push({
                        id: `n${i + 1}`,
                        x: Math.round(centerX + quad[0] * r * Math.cos(angle)),
                        y: Math.round(centerY + quad[1] * r * Math.sin(angle))
                    });
                }
                break;

            case 'complex-random':
                // Distribución compleja usando todo el espacio disponible
                for (let i = 0; i < nodeCount; i++) {
                    let x, y;
                    if (i % 3 === 0) {
                        const angle = (i * 137.5 * Math.PI) / 180;
                        const r = Math.sqrt(i) * (width * 0.15);
                        x = centerX + r * Math.cos(angle);
                        y = centerY + r * Math.sin(angle);
                    } else if (i % 3 === 1) {
                        x = margin + (i * width / nodeCount);
                        y = margin + (i * height / nodeCount);
                    } else {
                        x = margin + Math.random() * width;
                        y = margin + Math.random() * height;
                    }
                    nodes.push({
                        id: `n${i + 1}`,
                        x: Math.round(x),
                        y: Math.round(y)
                    });
                }
                break;

            default:
                // Distribución aleatoria mejorada para otros casos
                const sectors = Math.ceil(Math.sqrt(nodeCount));
                const sectorWidth = width / sectors;
                const sectorHeight = height / sectors;

                for (let i = 0; i < nodeCount; i++) {
                    const sectorX = i % sectors;
                    const sectorY = Math.floor(i / sectors);
                    nodes.push({
                        id: `n${i + 1}`,
                        x: Math.round(margin + sectorX * sectorWidth + Math.random() * sectorWidth),
                        y: Math.round(margin + sectorY * sectorHeight + Math.random() * sectorHeight)
                    });
                }
                break;
        }

        return this.adjustNodePositions(nodes);
    }

    static adjustNodePositions(nodes) {
        const minDistance = 80; // Aumentar distancia mínima entre nodos
        const maxAttempts = 100; // Más intentos para mejor distribución
        const margin = 80;
        const maxX = 1000 - margin;
        const maxY = 1000 - margin;
        
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            let overlapping = false;
            
            for (let i = 0; i < nodes.length; i++) {
                for (let j = i + 1; j < nodes.length; j++) {
                    const dx = nodes[j].x - nodes[i].x;
                    const dy = nodes[j].y - nodes[i].y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance < minDistance) {
                        overlapping = true;
                        const angle = Math.atan2(dy, dx);
                        const adjustment = (minDistance - distance) / 2;
                        
                        nodes[i].x = Math.round(Math.max(margin, Math.min(maxX, nodes[i].x - Math.cos(angle) * adjustment)));
                        nodes[i].y = Math.round(Math.max(margin, Math.min(maxY, nodes[i].y - Math.sin(angle) * adjustment)));
                        nodes[j].x = Math.round(Math.max(margin, Math.min(maxX, nodes[j].x + Math.cos(angle) * adjustment)));
                        nodes[j].y = Math.round(Math.max(margin, Math.min(maxY, nodes[j].y + Math.sin(angle) * adjustment)));
                    }
                }
            }
            
            if (!overlapping) break;
        }
        
        return nodes;
    }

    static generateConnections(nodes, config) {
        const connections = [];
        const { minEdgesPerNode, maxEdgesPerNode } = config;
        
        // Mantener registro de conexiones por nodo
        const nodeConnections = {};
        nodes.forEach(node => nodeConnections[node.id] = 0);

        // Procesar cada nodo
        nodes.forEach((node, i) => {
            // Si el nodo ya tiene el mínimo de conexiones requeridas, saltarlo
            if (nodeConnections[node.id] >= minEdgesPerNode) {
                return;
            }

            // Determinar cuántas conexiones necesita este nodo
            const neededConnections = minEdgesPerNode - nodeConnections[node.id];
            
            // Encontrar nodos disponibles que no excedan maxEdgesPerNode
            const availableNodes = nodes.filter((n, index) => 
                index !== i && 
                nodeConnections[n.id] < maxEdgesPerNode &&
                !connections.some(c => 
                    (c.from === node.id && c.to === n.id) ||
                    (c.from === n.id && c.to === node.id)
                )
            );

            // Conectar con nodos disponibles
            for (let j = 0; j < Math.min(neededConnections, availableNodes.length); j++) {
                const targetIndex = Math.floor(Math.random() * availableNodes.length);
                const targetNode = availableNodes[targetIndex];
                
                connections.push({
                    from: node.id,
                    to: targetNode.id
                });
                
                // Actualizar contadores
                nodeConnections[node.id]++;
                nodeConnections[targetNode.id]++;
                
                availableNodes.splice(targetIndex, 1);
            }
        });

        // Segunda pasada para agregar conexiones adicionales hasta maxEdgesPerNode donde sea posible
        nodes.forEach((node, i) => {
            if (nodeConnections[node.id] >= maxEdgesPerNode) {
                return;
            }

            const availableNodes = nodes.filter((n, index) => 
                index !== i && 
                nodeConnections[n.id] < maxEdgesPerNode &&
                !connections.some(c => 
                    (c.from === node.id && c.to === n.id) ||
                    (c.from === n.id && c.to === node.id)
                )
            );

            const additionalConnections = Math.min(
                Math.floor(Math.random() * (maxEdgesPerNode - nodeConnections[node.id] + 1)),
                availableNodes.length
            );

            for (let j = 0; j < additionalConnections; j++) {
                const targetIndex = Math.floor(Math.random() * availableNodes.length);
                const targetNode = availableNodes[targetIndex];
                
                connections.push({
                    from: node.id,
                    to: targetNode.id
                });
                
                nodeConnections[node.id]++;
                nodeConnections[targetNode.id]++;
                
                availableNodes.splice(targetIndex, 1);
            }
        });

        return connections;
    }

    static generateXML(nodes, connections) {
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<level>\n';
        
        // Agregar nodos
        nodes.forEach(node => {
            xml += `    <node id="${node.id}" x="${node.x}" y="${node.y}"/>\n`;
        });
        
        // Agregar conexiones
        connections.forEach(conn => {
            xml += `    <connection from="${conn.from}" to="${conn.to}"/>\n`;
        });
        
        xml += '</level>';
        return xml;
    }

    static generateAllLevels() {
        for (let i = 1; i <= 20; i++) {
            const xml = this.generateLevel(i);
            // Aquí podrías guardar el XML en un archivo
            console.log(`Nivel ${i}:`);
            console.log(xml);
        }
    }

    static previewLevel(levelNumber) {
        const config = this.getLevelConfig(levelNumber);
        const xml = this.generateLevel(levelNumber);
        
        // Crear un elemento temporal para mostrar la vista previa
        const previewDiv = document.createElement('div');
        previewDiv.innerHTML = `
            <div style="border: 1px solid #ccc; margin: 20px; padding: 15px; border-radius: 5px;">
                <h3>Nivel ${levelNumber}</h3>
                <div style="margin-bottom: 10px; font-size: 14px; color: #666;">
                    Nodos: ${config.nodeCount} | 
                    Conexiones por nodo: ${config.minEdgesPerNode}-${config.maxEdgesPerNode} |
                    Nodos simples garantizados: ${config.guaranteedSimpleNodes || 0}
                </div>
                <svg width="1000" height="1000" style="border: 1px solid #ddd; border-radius: 5px; background: #f9f9f9;">
                    <!-- Se llenará con los nodos y conexiones -->
                </svg>
            </div>
        `;
        document.body.appendChild(previewDiv);

        const svg = previewDiv.querySelector('svg');
        
        // Parsear el XML
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xml, "text/xml");
        
        // Dibujar conexiones
        const connections = Array.from(xmlDoc.getElementsByTagName('connection'));
        connections.forEach(conn => {
            const from = xmlDoc.querySelector(`node[id="${conn.getAttribute('from')}"]`);
            const to = xmlDoc.querySelector(`node[id="${conn.getAttribute('to')}"]`);
            
            const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute('x1', from.getAttribute('x'));
            line.setAttribute('y1', from.getAttribute('y'));
            line.setAttribute('x2', to.getAttribute('x'));
            line.setAttribute('y2', to.getAttribute('y'));
            line.setAttribute('stroke', '#666');
            line.setAttribute('stroke-width', '2');
            svg.appendChild(line);
        });
        
        // Dibujar nodos
        const nodes = Array.from(xmlDoc.getElementsByTagName('node'));
        nodes.forEach(node => {
            const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            circle.setAttribute('cx', node.getAttribute('x'));
            circle.setAttribute('cy', node.getAttribute('y'));
            circle.setAttribute('r', '15');
            circle.setAttribute('fill', '#fff');
            circle.setAttribute('stroke', '#333');
            circle.setAttribute('stroke-width', '2');
            svg.appendChild(circle);
            
            // Agregar ID del nodo
            const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
            text.setAttribute('x', parseInt(node.getAttribute('x')) - 5);
            text.setAttribute('y', parseInt(node.getAttribute('y')) + 5);
            text.setAttribute('fill', '#333');
            text.textContent = node.getAttribute('id').substring(1);
            svg.appendChild(text);

            // Agregar número de conexiones
            const nodeConnections = connections.filter(conn => 
                conn.getAttribute('from') === node.getAttribute('id') ||
                conn.getAttribute('to') === node.getAttribute('id')
            ).length;
            
            const connText = document.createElementNS("http://www.w3.org/2000/svg", "text");
            connText.setAttribute('x', parseInt(node.getAttribute('x')) - 5);
            connText.setAttribute('y', parseInt(node.getAttribute('y')) - 20);
            connText.setAttribute('fill', '#666');
            connText.setAttribute('font-size', '12');
            connText.textContent = `(${nodeConnections})`;
            svg.appendChild(connText);
        });
    }

    static generatePreviewsForLevels(startLevel, endLevel) {
        document.body.innerHTML = `
            <h2>Vista previa de niveles generados</h2>
            <p style="text-align: center; color: #666;">
                Los números entre paréntesis indican la cantidad de conexiones de cada nodo
            </p>
        `;
        for (let i = startLevel; i <= endLevel; i++) {
            this.previewLevel(i);
        }
    }
}

// Generar vista previa de varios niveles para ver la variedad
//LevelGenerator.generatePreviewsForLevels(1, 20); 