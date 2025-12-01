// Import D3 and PIXI from CDN
import * as d3 from 'https://cdn.skypack.dev/d3@7';
import * as PIXI from 'https://cdn.skypack.dev/pixi.js@7';

// Graph color constants (matching CSS variables)
function hexToPixiColor(hex) {
  return parseInt(hex.replace('#', ''), 16);
}

// Get colors from CSS variables
function getGraphColors() {
  const style = getComputedStyle(document.documentElement);
  return {
    background: hexToPixiColor(style.getPropertyValue('--graph-bg')),
    cardBg: hexToPixiColor(style.getPropertyValue('--graph-node-bg')),
    accent: hexToPixiColor(style.getPropertyValue('--graph-node-border')),
    text: hexToPixiColor(style.getPropertyValue('--graph-text-color')),
    border: hexToPixiColor(style.getPropertyValue('--border-color')),
    hover: hexToPixiColor(style.getPropertyValue('--graph-hover-color'))
  };
}

const GRAPH_CONFIG = {
  physics: {
    linkDistance: 120,
    linkStrength: 0.6,
    chargeStrength: -600,
    chargeDistanceMax: 300,
    centerStrength: 0.1,
    collisionStrength: 0.8,
    xStrength: 0.05,
    yStrength: 0.05,
    alphaDecay: 0.01,
    velocityDecay: 0.3,
  },
  colors: getGraphColors(),
  nodes: {
    minRadius: 8,
    maxRadius: 16,
    connectionBonus: 2,
    maxConnectionBonus: 12,
    glowOpacity: 0.1,
    shadowOpacity: 0.2,
    shadowOffset: 2,
    lineOpacity: 0.8,
    innerCircleOpacity: 0.5,
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: 12,
    fontWeight: '500',
    textResolution: 2,
  },
  links: {
    lineOpacity: 1,
  },
  zoom: {
    minScale: 0.1,
    maxScale: 8,
    zoomFactor: 1.2,
  },
};

class ForceDirectedGraph {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;

    // Refresh colors from CSS
    GRAPH_CONFIG.colors = getGraphColors();

    this.app = new PIXI.Application({
      width: this.container.offsetWidth,
      height: 400,
      backgroundColor: GRAPH_CONFIG.colors.background,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      powerPreference: 'high-performance'
    });

    this.container.appendChild(this.app.view);
    this.container.style.position = 'relative';
    
    this.nodes = [];
    this.links = [];
    this.simulation = null;
    
    // Performance optimizations
    this.nodeGraphics = new PIXI.Container();
    this.linkGraphics = new PIXI.Container();
    this.linkGraphicsArray = [];
    this.nodeSprites = new Map(); // For efficient updates
    this.textSprites = new Map(); // Separate text management
    
    // Interaction state
    this.draggedNode = null;
    this.dragOffset = { x: 0, y: 0 };
    this.dragStartPos = { x: 0, y: 0 };
    this.dragThreshold = 5;
    this.hoveredNode = null;
    
    // Visual effects
    this.particleContainer = new PIXI.Container();
    this.particles = [];
    
    // Create main container for zoom/pan
    this.mainContainer = new PIXI.Container();
    this.app.stage.addChild(this.mainContainer);
    this.mainContainer.addChild(this.particleContainer);
    this.mainContainer.addChild(this.linkGraphics);
    this.mainContainer.addChild(this.nodeGraphics);
    
    // Zoom and pan state
    this.scale = 1;
    this.minScale = GRAPH_CONFIG.zoom.minScale;
    this.maxScale = GRAPH_CONFIG.zoom.maxScale;
    this.isDragging = false;
    this.lastPointerPos = { x: 0, y: 0 };
    this.panStart = { x: 0, y: 0 };

    this.setupInteractions();
    window.addEventListener('resize', () => this.handleResize());
  }

  setupInteractions() {
    this.mainContainer.eventMode = 'static';
    this.mainContainer.hitArea = this.app.screen;
    
    // Optimized wheel zoom
    this.app.view.addEventListener('wheel', (event) => {
      event.preventDefault();
      
      const delta = event.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.max(this.minScale, Math.min(this.maxScale, this.scale * delta));
      
      const pointer = this.app.renderer.events.pointer.global;
      const worldPos = {
        x: (pointer.x - this.mainContainer.x) / this.scale,
        y: (pointer.y - this.mainContainer.y) / this.scale
      };
      
      this.scale = newScale;
      this.mainContainer.scale.set(this.scale);
      
      const newWorldPos = {
        x: (pointer.x - this.mainContainer.x) / this.scale,
        y: (pointer.y - this.mainContainer.y) / this.scale
      };
      
      this.mainContainer.x += (newWorldPos.x - worldPos.x) * this.scale;
      this.mainContainer.y += (newWorldPos.y - worldPos.y) * this.scale;
      
      // Update text visibility based on scale
      this.updateTextVisibility();
    });
    
    // Pan and drag interactions
    this.app.stage.on('pointerdown', (event) => {
      if (event.target.parent && event.target.parent.parent === this.nodeGraphics) {
        return; // Let node handle the drag
      }
      
      this.isDragging = true;
      this.lastPointerPos = event.global;
      this.panStart = { x: this.mainContainer.x, y: this.mainContainer.y };
    });
    
    this.app.stage.on('pointermove', (event) => {
      if (this.isDragging) {
        const deltaX = event.global.x - this.lastPointerPos.x;
        const deltaY = event.global.y - this.lastPointerPos.y;
        
        this.mainContainer.x = this.panStart.x + deltaX;
        this.mainContainer.y = this.panStart.y + deltaY;
        
        this.lastPointerPos = event.global;
      }
    });
    
    this.app.stage.on('pointerup', () => {
      this.isDragging = false;
    });
    
    this.app.stage.on('pointerupoutside', () => {
      this.isDragging = false;
    });
  }

  updateTextVisibility() {
    const baseFontSize = Math.max(8, Math.min(14, 12 / this.scale));
    
    this.textSprites.forEach((text, nodeId) => {
      const node = this.nodes.find(n => n.id === nodeId);
      if (node) {
        text.style.fontSize = baseFontSize;
        text.visible = this.scale > 0.5; // Hide text when zoomed out
      }
    });
  }

  addZoomControls() {
    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'force-graph-controls';
    
    const zoomInBtn = document.createElement('button');
    zoomInBtn.innerHTML = '+';
    zoomInBtn.className = 'force-graph-control-btn';
    zoomInBtn.addEventListener('click', () => this.zoom(1.2));
    
    const zoomOutBtn = document.createElement('button');
    zoomOutBtn.innerHTML = '-';
    zoomOutBtn.className = 'force-graph-control-btn';
    zoomOutBtn.addEventListener('click', () => this.zoom(0.8));
    
    const resetBtn = document.createElement('button');
    resetBtn.innerHTML = '⟲';
    resetBtn.className = 'force-graph-control-btn';
    resetBtn.addEventListener('click', () => this.resetView());
    
    controlsContainer.appendChild(zoomInBtn);
    controlsContainer.appendChild(zoomOutBtn);
    controlsContainer.appendChild(resetBtn);
    this.container.appendChild(controlsContainer);
  }

  zoom(factor) {
    const newScale = Math.max(this.minScale, Math.min(this.maxScale, this.scale * factor));
    
    const centerX = this.app.screen.width / 2;
    const centerY = this.app.screen.height / 2;
    
    const worldPos = {
      x: (centerX - this.mainContainer.x) / this.scale,
      y: (centerY - this.mainContainer.y) / this.scale
    };
    
    this.scale = newScale;
    this.mainContainer.scale.set(this.scale);
    
    const newWorldPos = {
      x: (centerX - this.mainContainer.x) / this.scale,
      y: (centerY - this.mainContainer.y) / this.scale
    };
    
    this.mainContainer.x += (newWorldPos.x - worldPos.x) * this.scale;
    this.mainContainer.y += (newWorldPos.y - worldPos.y) * this.scale;
    
    this.updateTextVisibility();
  }

  resetView() {
    this.scale = 1;
    this.mainContainer.scale.set(this.scale);
    this.mainContainer.x = 0;
    this.mainContainer.y = 0;
    this.updateTextVisibility();
  }

  generateNodeUrl(nodeId) {
    if (nodeId === 'readme' || nodeId === 'home') {
      return '/';
    }
    
    if (nodeId.includes('#')) {
      const [page, anchor] = nodeId.split('#');
      if (page === 'readme') {
        return `/#${anchor}`;
      }
    }
    
    if (nodeId === 'about') {
      return '/about/';
    }
    
    if (nodeId === 'notes') {
      return '/notes/';
    }
    
    if (!nodeId.includes('#') && !nodeId.includes('/')) {
      return `/notes/${nodeId}/`;
    }
    
    return `#${nodeId}`;
  }

  async loadGraphData() {
    try {
      const response = await fetch('/.garden-graph.json', {
        headers: { 'Accept': 'application/json' }
      });
      const data = await response.json();
      
      const nodesArray = Object.entries(data.nodes).map(([id, node]) => ({
        id: id,
        label: node.label || id,
        url: this.generateNodeUrl(id),
        x: Math.random() * this.app.screen.width,
        y: Math.random() * this.app.screen.height,
        radius: 8 + Math.random() * 8, // Variable node sizes
        connections: 0 // Will be calculated
      }));

      // Calculate connection counts for visual hierarchy
      const nodeIds = new Set(nodesArray.map(node => node.id));
      const links = data.links.map(link => ({
        source: link.source,
        target: link.target
      })).filter(link => 
        nodeIds.has(link.source) && nodeIds.has(link.target)
      );

      // Count connections for each node
      links.forEach(link => {
        const sourceNode = nodesArray.find(n => n.id === link.source);
        const targetNode = nodesArray.find(n => n.id === link.target);
        if (sourceNode) sourceNode.connections++;
        if (targetNode) targetNode.connections++;
      });

      const connectedNodeIds = new Set();
      links.forEach(link => {
        connectedNodeIds.add(link.source);
        connectedNodeIds.add(link.target);
      });

      const uniqueNodes = nodesArray.filter((node, index, self) => 
        index === self.findIndex(n => n.id === node.id)
      );

      const connectedNodes = uniqueNodes.filter(node => connectedNodeIds.has(node.id));

      const validLinks = links.filter(link => 
        connectedNodes.some(node => node.id === link.source) && 
        connectedNodes.some(node => node.id === link.target)
      );

      this.nodes = connectedNodes;
      this.links = validLinks;
      
      this.createOptimizedSimulation();
      this.renderOptimized();
      this.addZoomControls();
      
    } catch (error) {
      console.error('Error loading graph data:', error);
      this.showError();
    }
  }

  createOptimizedSimulation() {
    // Optimized physics with better parameters
    this.simulation = d3.forceSimulation(this.nodes)
      .force('link', d3.forceLink(this.links).id(d => d.id).distance(GRAPH_CONFIG.physics.linkDistance).strength(GRAPH_CONFIG.physics.linkStrength))
      .force('charge', d3.forceManyBody().strength(GRAPH_CONFIG.physics.chargeStrength).distanceMax(GRAPH_CONFIG.physics.chargeDistanceMax))
      .force('center', d3.forceCenter(this.app.screen.width / 2, this.app.screen.height / 2).strength(GRAPH_CONFIG.physics.centerStrength))
      .force('collision', d3.forceCollide().radius(d => d.radius + 15).strength(GRAPH_CONFIG.physics.collisionStrength))
      .force('x', d3.forceX(this.app.screen.width / 2).strength(GRAPH_CONFIG.physics.xStrength))
      .force('y', d3.forceY(this.app.screen.height / 2).strength(GRAPH_CONFIG.physics.yStrength))
      .alphaDecay(GRAPH_CONFIG.physics.alphaDecay)
      .velocityDecay(GRAPH_CONFIG.physics.velocityDecay);

    this.simulation.on('tick', () => this.updateOptimizedPositions());
  }

  renderOptimized() {
    // Clear existing graphics
    this.nodeGraphics.removeChildren();
    this.linkGraphics.removeChildren();
    this.particleContainer.removeChildren();
    this.linkGraphicsArray = [];
    this.nodeSprites.clear();
    this.textSprites.clear();
    this.particles = [];

    // Create links with improved rendering
    this.links.forEach((link, index) => {
      const graphics = new PIXI.Graphics();
      
      // Create gradient-like effect with multiple lines
      graphics.lineStyle(1, GRAPH_CONFIG.colors.accent, GRAPH_CONFIG.links.lineOpacity);
      
      this.linkGraphics.addChild(graphics);
      this.linkGraphicsArray.push(graphics);
    });

    // Create nodes with enhanced visuals
    this.nodes.forEach(node => {
      const container = new PIXI.Container();
      
      // Node size based on connections (visual hierarchy)
      const baseRadius = node.radius;
      const connectionBonus = Math.min(node.connections * GRAPH_CONFIG.nodes.connectionBonus, GRAPH_CONFIG.nodes.maxConnectionBonus);
      const finalRadius = baseRadius + connectionBonus;
      
      // Create gradient effect with multiple circles
      const glowGraphics = new PIXI.Graphics();
      glowGraphics.beginFill(GRAPH_CONFIG.colors.hover, GRAPH_CONFIG.nodes.glowOpacity);
      glowGraphics.drawCircle(0, 0, finalRadius + 8);
      glowGraphics.endFill();
      
      const shadowGraphics = new PIXI.Graphics();
      shadowGraphics.beginFill(0x000000, GRAPH_CONFIG.nodes.shadowOpacity);
      shadowGraphics.drawCircle(GRAPH_CONFIG.nodes.shadowOffset, GRAPH_CONFIG.nodes.shadowOffset, finalRadius);
      shadowGraphics.endFill();
      
      const mainGraphics = new PIXI.Graphics();
      mainGraphics.beginFill(GRAPH_CONFIG.colors.cardBg);
      mainGraphics.lineStyle(2, GRAPH_CONFIG.colors.accent, GRAPH_CONFIG.nodes.lineOpacity);
      mainGraphics.drawCircle(0, 0, finalRadius);
      mainGraphics.endFill();
      
      // Add inner circle for depth
      const innerGraphics = new PIXI.Graphics();
      innerGraphics.beginFill(GRAPH_CONFIG.colors.background, GRAPH_CONFIG.nodes.innerCircleOpacity);
      innerGraphics.drawCircle(-finalRadius/4, -finalRadius/4, finalRadius/3);
      innerGraphics.endFill();
      
      container.addChild(glowGraphics);
      container.addChild(shadowGraphics);
      container.addChild(mainGraphics);
      container.addChild(innerGraphics);
      
      // Optimized text rendering
      const text = new PIXI.Text(node.label, {
        fontFamily: GRAPH_CONFIG.nodes.fontFamily,
        fontSize: GRAPH_CONFIG.nodes.fontSize,
        fill: GRAPH_CONFIG.colors.text,
        align: 'center',
        fontWeight: GRAPH_CONFIG.nodes.fontWeight
      });
      
      text.anchor.set(0.5);
      text.y = finalRadius + 15;
      text.resolution = GRAPH_CONFIG.nodes.textResolution; // Crisper text
      
      container.addChild(text);
      container.x = node.x;
      container.y = node.y;
      
      // Store references for efficient updates
      this.nodeSprites.set(node.id, container);
      this.textSprites.set(node.id, text);
      
      // Enhanced interactivity
      container.interactive = true;
      container.buttonMode = true;
      container.cursor = 'pointer';
      container.nodeData = node;
      
      // Interaction events with visual feedback
      container.on('pointerdown', (event) => {
        this.startNodeDrag(node, event);
      });
      
      container.on('pointerup', (event) => {
        this.endNodeDrag();
        if (!this.wasDragged) {
          if (node.url.startsWith('#')) {
            window.location.hash = node.url.substring(1);
          } else {
            window.location.href = node.url;
          }
        }
      });
      
      container.on('pointerover', () => {
        if (!this.draggedNode) {
          this.hoveredNode = node;
          this.createHoverEffect(container, finalRadius);
          this.container.style.cursor = 'pointer';
        }
      });
      
      container.on('pointerout', () => {
        if (!this.draggedNode) {
          this.hoveredNode = null;
          this.removeHoverEffect(container);
          this.container.style.cursor = 'default';
        }
      });
      
      this.nodeGraphics.addChild(container);
    });
  }

  createHoverEffect(container, radius) {
    // Create hover animation
    const hoverGraphics = new PIXI.Graphics();
    hoverGraphics.beginFill(GRAPH_CONFIG.colors.hover, 0.3);
    hoverGraphics.drawCircle(0, 0, radius + 12);
    hoverGraphics.endFill();
    
    container.addChildAt(hoverGraphics, 0);
    
    // Animate the hover effect
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const scale = 1 + Math.sin(elapsed * 0.005) * 0.1;
      hoverGraphics.scale.set(scale);
      
      if (this.hoveredNode === container.nodeData) {
        requestAnimationFrame(animate);
      } else {
        container.removeChild(hoverGraphics);
      }
    };
    animate();
  }

  removeHoverEffect(container) {
    // Hover effect will be removed by the animation
  }

  startNodeDrag(node, event) {
    this.draggedNode = node;
    this.wasDragged = false;
    
    const worldPos = this.app.renderer.events.pointer.global;
    this.dragStartPos = {
      x: (worldPos.x - this.mainContainer.x) / this.scale,
      y: (worldPos.y - this.mainContainer.y) / this.scale
    };
    
    this.dragOffset = {
      x: this.dragStartPos.x - node.x,
      y: this.dragStartPos.y - node.y
    };
    
    node.fx = node.x;
    node.fy = node.y;
    
    this.simulation.alpha(0.3).restart();
    
    this.app.stage.on('pointermove', this.handleNodeDrag);
    this.app.stage.on('pointerup', this.endNodeDrag);
    this.app.stage.on('pointerupoutside', this.endNodeDrag);
  }

  handleNodeDrag = (event) => {
    if (!this.draggedNode) return;
    
    this.wasDragged = true;
    
    const worldPos = this.app.renderer.events.pointer.global;
    const currentX = (worldPos.x - this.mainContainer.x) / this.scale;
    const currentY = (worldPos.y - this.mainContainer.y) / this.scale;
    
    const distance = Math.sqrt(
      Math.pow(currentX - this.dragStartPos.x, 2) + 
      Math.pow(currentY - this.dragStartPos.y, 2)
    );
    
    if (distance > this.dragThreshold) {
      this.wasDragged = true;
    }
    
    const newX = currentX - this.dragOffset.x;
    const newY = currentY - this.dragOffset.y;
    
    this.draggedNode.fx = newX;
    this.draggedNode.fy = newY;
    this.draggedNode.x = newX;
    this.draggedNode.y = newY;
    
    const container = this.nodeSprites.get(this.draggedNode.id);
    if (container) {
      container.x = newX;
      container.y = newY;
    }
    
    this.updateConnectedLinks(this.draggedNode);
  }

  endNodeDrag = () => {
    if (!this.draggedNode) return;
    
    this.draggedNode.fx = null;
    this.draggedNode.fy = null;
    
    this.container.style.cursor = 'default';
    this.draggedNode = null;
    
    try {
      this.app.stage.off('pointermove', this.handleNodeDrag);
      this.app.stage.off('pointerup', this.endNodeDrag);
      this.app.stage.off('pointerupoutside', this.endNodeDrag);
    } catch (e) {
      // Ignore if listeners are already removed
    }
    
    this.simulation.alpha(0.1).restart();
  }

  updateConnectedLinks(node) {
    if (!this.linkGraphicsArray) return;
    this.links.forEach((link, index) => {
      if (link.source === node.id || link.target === node.id) {
        const graphics = this.linkGraphicsArray[index];
        if (!graphics) return;
        
        const sourceNode = this.nodes.find(n => n.id === link.source);
        const targetNode = this.nodes.find(n => n.id === link.target);
        
        if (sourceNode && targetNode) {
          graphics.clear();
          graphics.lineStyle(1, GRAPH_CONFIG.colors.accent, GRAPH_CONFIG.links.lineOpacity);
          graphics.moveTo(sourceNode.x, sourceNode.y);
          graphics.lineTo(targetNode.x, targetNode.y);
        }
      }
    });
  }

  updateOptimizedPositions() {
    if (this.draggedNode) {
      // Only update non-dragged nodes
      this.nodeSprites.forEach((container, nodeId) => {
        const node = this.nodes.find(n => n.id === nodeId);
        if (node && node !== this.draggedNode) {
          container.x = node.x;
          container.y = node.y;
        }
      });
      
      // Update all links
      this.linkGraphicsArray.forEach((graphics, index) => {
        const link = this.links[index];
        if (!link) return;
        
        const sourceNode = this.nodes.find(n => n.id === link.source);
        const targetNode = this.nodes.find(n => n.id === link.target);
        
        if (sourceNode && targetNode) {
          graphics.clear();
          graphics.lineStyle(1, GRAPH_CONFIG.colors.accent, GRAPH_CONFIG.links.lineOpacity);
          graphics.moveTo(sourceNode.x, sourceNode.y);
          graphics.lineTo(targetNode.x, targetNode.y);
        }
      });
      return;
    }
    
    // Normal position updates with optimized rendering
    this.linkGraphicsArray.forEach((graphics, index) => {
      const link = this.links[index];
      if (!link) return;
      
      const sourceNode = this.nodes.find(n => n.id === link.source);
      const targetNode = this.nodes.find(n => n.id === link.target);
      
      if (sourceNode && targetNode) {
        graphics.clear();
        graphics.lineStyle(1, GRAPH_CONFIG.colors.accent, GRAPH_CONFIG.links.lineOpacity);
        graphics.moveTo(sourceNode.x, sourceNode.y);
        graphics.lineTo(targetNode.x, targetNode.y);
      }
    });

    this.nodeSprites.forEach((container, nodeId) => {
      const node = this.nodes.find(n => n.id === nodeId);
      if (node) {
        container.x = node.x;
        container.y = node.y;
      }
    });
  }

  handleResize() {
    this.app.renderer.resize(this.container.offsetWidth, 400);
    this.mainContainer.hitArea = this.app.screen;
    
    if (this.simulation) {
      this.simulation
        .force('center', d3.forceCenter(this.app.screen.width / 2, this.app.screen.height / 2))
        .alpha(0.3)
        .restart();
    }
  }

  showError() {
    this.container.innerHTML = `
      <div class="force-graph-error">
        <div>
          <p>Unable to load graph data</p>
          <small>Run <code>npx markdown-graph</code> to generate the graph</small>
        </div>
      </div>
    `;
  }

  destroy() {
    if (this.simulation) {
      this.simulation.stop();
    }
    if (this.app) {
      this.app.destroy(true);
    }
  }
}

// Initialize the graph when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const graphContainer = document.getElementById('force-graph');
  if (graphContainer) {
    const graph = new ForceDirectedGraph('force-graph');
    graph.loadGraphData();
  }
});
