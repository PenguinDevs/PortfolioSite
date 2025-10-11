'use client';

import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { TechItem } from '@/data/types';

interface TechNode {
  id: string;
  name: string;
  category: string;
  imageUrl: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  vx?: number;
  vy?: number;
}

interface TechLink {
  source: string | TechNode;
  target: string | TechNode;
}

// Configuration constants
const LAYOUT_CONFIG = {
  CONTENT_WIDTH: 600,
  CONTENT_HEIGHT: 800,
  RADIUS_MULTIPLIER: 0.6,
  RANDOMNESS_RANGE: 1000,
  CONTENT_AREA: {
    LEFT_PERCENT: 0.2,
    RIGHT_PERCENT: 0.8,
    TOP_PERCENT: 0.1,
    BOTTOM_PERCENT: 0.9,
  },
} as const;

const PHYSICS_CONFIG = {
  REPULSION_DISTANCE: 100,
  REPULSION_STRENGTH: 3,
  REPULSION_ELEMENT_MULTIPLIER: 0.5,
  REPULSION_DISTANCE_MULTIPLIER: 0.1,
  LINK_DISTANCE: 150,
  LINK_STRENGTH: 0.2,
  CHARGE_STRENGTH: -50,
  CENTER_STRENGTH: 0.1,
  COLLISION_RADIUS: 40,
  ALPHA_DECAY: 0.005,
  ALPHA_MIN: 0.001,
  VELOCITY_DECAY: 0.3,
} as const;

const BOUNDARY_CONFIG = {
  BUFFER: 150,
  EDGE_BUFFER: 120,
  ICON_HALF_SIZE: 28,
  STRONG_FORCE: 1.2,
  WEAK_FORCE: 0.8,
} as const;

const INTERACTION_CONFIG = {
  DRAG_START_ALPHA: 0.5,
  DRAG_END_ALPHA: 0.1,
  RESIZE_ALPHA: 0.3,
} as const;

const VISUAL_CONFIG = {
  ICON_SIZE: 56,
  ICON_SIZE_HOVER: 64,
  ICON_HALF_SIZE: 28,
  ICON_HALF_SIZE_HOVER: 32,
  TRANSITION_DURATION: 200,
  TOOLTIP_OFFSET_X: 10,
  TOOLTIP_OFFSET_Y: -10,
  Z_INDEX: '9999',
} as const;

const CONTENT_SELECTORS = [
  'header',
  'section',
  'footer',
  'h1',
  'h2',
  'h3',
  'h4',
  'p',
  'a',
  'div[class*="max-w"]',
] as const;

const ELEMENT_SIZE_THRESHOLDS = {
  MIN_WIDTH: 50,
  MIN_HEIGHT: 20,
} as const;

const UPDATE_INTERVALS = {
  CONTENT_UPDATE: 2000,
} as const;

interface TechStackGraphProps {
  techItems?: TechItem[];
}

const TechStackGraph: React.FC<TechStackGraphProps> = ({ techItems = [] }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentElements = useRef<DOMRect[]>([]);

  const techData: TechNode[] = techItems.map(item => ({
    id: item.id,
    name: item.name,
    category: item.category.toLowerCase(),
    imageUrl: item.imageUrl,
  }))

  // Helper functions
  const updateContentElements = () => {
    contentElements.current = [];

    CONTENT_SELECTORS.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        const rect = element.getBoundingClientRect();
        // Only add elements with significant size
        if (
          rect.width > ELEMENT_SIZE_THRESHOLDS.MIN_WIDTH &&
          rect.height > ELEMENT_SIZE_THRESHOLDS.MIN_HEIGHT
        ) {
          contentElements.current.push(rect);
        }
      });
    });
  };

  const initializeNodePositions = (width: number, height: number) => {
    const centerX = width / 2;
    const centerY = height / 2;

    techData.forEach((node, index) => {
      const angle = (index / techData.length) * 2 * Math.PI;
      const radius =
        Math.max(LAYOUT_CONFIG.CONTENT_WIDTH, LAYOUT_CONFIG.CONTENT_HEIGHT) *
        LAYOUT_CONFIG.RADIUS_MULTIPLIER;

      // Position nodes in a circle around the content
      node.x = centerX + Math.cos(angle) * radius;
      node.y = centerY + Math.sin(angle) * radius;

      // Add some randomness to avoid perfect circle
      node.x += (Math.random() - 0.5) * LAYOUT_CONFIG.RANDOMNESS_RANGE;
      node.y += (Math.random() - 0.5) * LAYOUT_CONFIG.RANDOMNESS_RANGE;
    });
  };

  const createCategoryLinks = (): TechLink[] => {
    const links: TechLink[] = [];
    const categories = [...new Set(techData.map(d => d.category))];

    categories.forEach(category => {
      const nodesInCategory = techData.filter(d => d.category === category);
      for (let i = 0; i < nodesInCategory.length - 1; i++) {
        for (let j = i + 1; j < nodesInCategory.length; j++) {
          links.push({
            source: nodesInCategory[i].id,
            target: nodesInCategory[j].id,
          });
        }
      }
    });

    return links;
  };

  const getCentralContentArea = (width: number, height: number) => ({
    left: width * LAYOUT_CONFIG.CONTENT_AREA.LEFT_PERCENT,
    right: width * LAYOUT_CONFIG.CONTENT_AREA.RIGHT_PERCENT,
    top: height * LAYOUT_CONFIG.CONTENT_AREA.TOP_PERCENT,
    bottom: height * LAYOUT_CONFIG.CONTENT_AREA.BOTTOM_PERCENT,
  });

  const calculateDistance = (dx: number, dy: number): number =>
    Math.sqrt(dx * dx + dy * dy);

  const applyForceToNode = (
    node: TechNode,
    dx: number,
    dy: number,
    force: number
  ) => {
    const distance = calculateDistance(dx, dy);
    if (distance > 0) {
      node.vx = (node.vx || 0) + (dx / distance) * force;
      node.vy = (node.vy || 0) + (dy / distance) * force;
    }
  };

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const svg = d3.select(svgRef.current);

    // Clear previous content
    svg.selectAll('*').remove();

    // Use full viewport dimensions
    const width = window.innerWidth;
    const height = window.innerHeight;

    svg.attr('width', width).attr('height', height);

    // Initial content mapping
    updateContentElements();

    // Initialize nodes with positions away from center content
    initializeNodePositions(width, height);

    // Create links between nodes of the same category
    const links = createCategoryLinks();

    // Content repulsion force - stronger and more effective
    const contentRepulsionForce = () => {
      techData.forEach(d => {
        if (d.x !== undefined && d.y !== undefined) {
          const nodeX = d.x;
          const nodeY = d.y;

          // Create a larger central content area to avoid
          const centralContentArea = getCentralContentArea(width, height);

          // Strong repulsion from central content area
          if (
            nodeX >=
              centralContentArea.left - PHYSICS_CONFIG.REPULSION_DISTANCE &&
            nodeX <=
              centralContentArea.right + PHYSICS_CONFIG.REPULSION_DISTANCE &&
            nodeY >=
              centralContentArea.top - PHYSICS_CONFIG.REPULSION_DISTANCE &&
            nodeY <=
              centralContentArea.bottom + PHYSICS_CONFIG.REPULSION_DISTANCE
          ) {
            // Calculate direction away from center
            const centerX =
              (centralContentArea.left + centralContentArea.right) / 2;
            const centerY =
              (centralContentArea.top + centralContentArea.bottom) / 2;

            const dx = nodeX - centerX;
            const dy = nodeY - centerY;
            const distance = calculateDistance(dx, dy);

            if (distance > 0) {
              const force =
                PHYSICS_CONFIG.REPULSION_STRENGTH /
                (distance * PHYSICS_CONFIG.REPULSION_DISTANCE_MULTIPLIER + 1);
              applyForceToNode(d, dx, dy, force);
            }
          }

          // Additional repulsion from detected content elements
          contentElements.current.forEach(rect => {
            const nodeInContentX =
              nodeX >= rect.left - PHYSICS_CONFIG.REPULSION_DISTANCE &&
              nodeX <= rect.right + PHYSICS_CONFIG.REPULSION_DISTANCE;
            const nodeInContentY =
              nodeY >= rect.top - PHYSICS_CONFIG.REPULSION_DISTANCE &&
              nodeY <= rect.bottom + PHYSICS_CONFIG.REPULSION_DISTANCE;

            if (nodeInContentX && nodeInContentY) {
              const closestX = Math.max(rect.left, Math.min(nodeX, rect.right));
              const closestY = Math.max(rect.top, Math.min(nodeY, rect.bottom));

              const dx = nodeX - closestX;
              const dy = nodeY - closestY;
              const distance = calculateDistance(dx, dy);

              if (
                distance < PHYSICS_CONFIG.REPULSION_DISTANCE &&
                distance > 0
              ) {
                const force =
                  ((PHYSICS_CONFIG.REPULSION_DISTANCE - distance) /
                    PHYSICS_CONFIG.REPULSION_DISTANCE) *
                  PHYSICS_CONFIG.REPULSION_STRENGTH *
                  PHYSICS_CONFIG.REPULSION_ELEMENT_MULTIPLIER;
                applyForceToNode(d, dx, dy, force);
              }
            }
          });
        }
      });
    };

    // Create stronger boundary force to keep nodes away from screen edges
    const boundaryForce = () => {
      techData.forEach(d => {
        if (d.x !== undefined && d.y !== undefined) {
          // Define edge boundaries with buffer zones
          const leftEdge = BOUNDARY_CONFIG.EDGE_BUFFER;
          const rightEdge = width - BOUNDARY_CONFIG.EDGE_BUFFER;
          const topEdge = BOUNDARY_CONFIG.EDGE_BUFFER;
          const bottomEdge = height - BOUNDARY_CONFIG.EDGE_BUFFER;

          // Left edge repulsion
          if (d.x < leftEdge) {
            const distance = leftEdge - d.x;
            const force = (distance / leftEdge) * BOUNDARY_CONFIG.STRONG_FORCE;
            d.vx = (d.vx || 0) + force;
          }

          // Right edge repulsion
          if (d.x > rightEdge) {
            const distance = d.x - rightEdge;
            const force = (distance / BOUNDARY_CONFIG.EDGE_BUFFER) * BOUNDARY_CONFIG.STRONG_FORCE;
            d.vx = (d.vx || 0) - force;
          }

          // Top edge repulsion
          if (d.y < topEdge) {
            const distance = topEdge - d.y;
            const force = (distance / topEdge) * BOUNDARY_CONFIG.STRONG_FORCE;
            d.vy = (d.vy || 0) + force;
          }

          // Bottom edge repulsion
          if (d.y > bottomEdge) {
            const distance = d.y - bottomEdge;
            const force = (distance / BOUNDARY_CONFIG.EDGE_BUFFER) * BOUNDARY_CONFIG.STRONG_FORCE;
            d.vy = (d.vy || 0) - force;
          }

          // Additional gradient force as nodes approach edges
          const edgeProximityForce = 0.4;
          
          // Horizontal gradient forces
          if (d.x < leftEdge + BOUNDARY_CONFIG.BUFFER) {
            const proximity = (leftEdge + BOUNDARY_CONFIG.BUFFER - d.x) / BOUNDARY_CONFIG.BUFFER;
            d.vx = (d.vx || 0) + proximity * edgeProximityForce;
          }
          if (d.x > rightEdge - BOUNDARY_CONFIG.BUFFER) {
            const proximity = (d.x - (rightEdge - BOUNDARY_CONFIG.BUFFER)) / BOUNDARY_CONFIG.BUFFER;
            d.vx = (d.vx || 0) - proximity * edgeProximityForce;
          }

          // Vertical gradient forces
          if (d.y < topEdge + BOUNDARY_CONFIG.BUFFER) {
            const proximity = (topEdge + BOUNDARY_CONFIG.BUFFER - d.y) / BOUNDARY_CONFIG.BUFFER;
            d.vy = (d.vy || 0) + proximity * edgeProximityForce;
          }
          if (d.y > bottomEdge - BOUNDARY_CONFIG.BUFFER) {
            const proximity = (d.y - (bottomEdge - BOUNDARY_CONFIG.BUFFER)) / BOUNDARY_CONFIG.BUFFER;
            d.vy = (d.vy || 0) - proximity * edgeProximityForce;
          }
        }
      });
    };

    // Create force simulation with weaker center force and stronger repulsion
    const simulation = d3
      .forceSimulation<TechNode>(techData)
      .force(
        'link',
        d3
          .forceLink<TechNode, TechLink>(links)
          .id(d => d.id)
          .distance(PHYSICS_CONFIG.LINK_DISTANCE)
          .strength(PHYSICS_CONFIG.LINK_STRENGTH)
      )
      .force(
        'charge',
        d3.forceManyBody().strength(PHYSICS_CONFIG.CHARGE_STRENGTH)
      )
      .force(
        'center',
        d3
          .forceCenter(width / 2, height / 2)
          .strength(PHYSICS_CONFIG.CENTER_STRENGTH)
      )
      .force(
        'collision',
        d3.forceCollide().radius(PHYSICS_CONFIG.COLLISION_RADIUS)
      )
      .force('boundary', boundaryForce)
      .force('contentRepulsion', contentRepulsionForce)
      .alphaDecay(PHYSICS_CONFIG.ALPHA_DECAY)
      .alphaMin(PHYSICS_CONFIG.ALPHA_MIN)
      .velocityDecay(PHYSICS_CONFIG.VELOCITY_DECAY);

    // Create container for nodes (remove links)
    const nodeContainer = svg.append('g').attr('class', 'nodes');

    // Drag behavior factory
    const createDragBehavior = () =>
      d3
        .drag<SVGGElement, TechNode>()
        .on('start', (event, d) => {
          if (!event.active)
            simulation
              .alphaTarget(INTERACTION_CONFIG.DRAG_START_ALPHA)
              .restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active)
            simulation.alphaTarget(INTERACTION_CONFIG.DRAG_END_ALPHA);
          d.fx = null;
          d.fy = null;
        });

    // Create nodes
    const node = nodeContainer
      .selectAll('g')
      .data(techData)
      .enter()
      .append('g')
      .attr('class', 'node')
      .style('cursor', 'pointer')
      .call(createDragBehavior());

    // Create tooltip div
    const createTooltip = () =>
      d3
        .select('body')
        .append('div')
        .style('position', 'fixed')
        .style('background', 'rgba(0, 0, 0, 0.8)')
        .style('color', 'white')
        .style('padding', '8px 12px')
        .style('border-radius', '4px')
        .style('font-size', '14px')
        .style('pointer-events', 'none')
        .style('opacity', 0)
        .style('z-index', VISUAL_CONFIG.Z_INDEX);

    const tooltip = createTooltip();

    // Helper functions for tooltip positioning
    const updateTooltipPosition =
      (tooltip: d3.Selection<HTMLDivElement, unknown, HTMLElement, any>) =>
      (e: MouseEvent) => {
        tooltip
          .style('left', e.clientX + VISUAL_CONFIG.TOOLTIP_OFFSET_X + 'px')
          .style('top', e.clientY + VISUAL_CONFIG.TOOLTIP_OFFSET_Y + 'px');
      };

    const createMouseEnterHandler = (
      tooltip: d3.Selection<HTMLDivElement, unknown, HTMLElement, any>
    ) =>
      function (this: SVGImageElement, event: MouseEvent, d: TechNode) {
        // Scale up icon
        d3.select(this)
          .transition()
          .duration(VISUAL_CONFIG.TRANSITION_DURATION)
          .attr('width', VISUAL_CONFIG.ICON_SIZE_HOVER)
          .attr('height', VISUAL_CONFIG.ICON_SIZE_HOVER)
          .attr('x', -VISUAL_CONFIG.ICON_HALF_SIZE_HOVER)
          .attr('y', -VISUAL_CONFIG.ICON_HALF_SIZE_HOVER);

        // Show tooltip
        tooltip.style('opacity', 1).html(d.name);

        // Setup tooltip positioning
        const positionUpdater = updateTooltipPosition(tooltip);
        positionUpdater(event);

        // Add global mousemove listener
        const handleMouseMove = (e: MouseEvent) => positionUpdater(e);
        document.addEventListener('mousemove', handleMouseMove);

        // Store cleanup function
        (this as any).__tooltipCleanup = () => {
          document.removeEventListener('mousemove', handleMouseMove);
        };
      };

    const createMouseLeaveHandler = (
      tooltip: d3.Selection<HTMLDivElement, unknown, HTMLElement, any>
    ) =>
      function (this: SVGImageElement) {
        // Scale down icon
        d3.select(this)
          .transition()
          .duration(VISUAL_CONFIG.TRANSITION_DURATION)
          .attr('width', VISUAL_CONFIG.ICON_SIZE)
          .attr('height', VISUAL_CONFIG.ICON_SIZE)
          .attr('x', -VISUAL_CONFIG.ICON_HALF_SIZE)
          .attr('y', -VISUAL_CONFIG.ICON_HALF_SIZE);

        // Hide tooltip
        tooltip.style('opacity', 0);

        // Clean up global mouse listener
        if ((this as any).__tooltipCleanup) {
          (this as any).__tooltipCleanup();
          delete (this as any).__tooltipCleanup;
        }
      };

    // Add icons to nodes with hover effects
    node
      .append('image')
      .attr('href', d => d.imageUrl)
      .attr('width', VISUAL_CONFIG.ICON_SIZE)
      .attr('height', VISUAL_CONFIG.ICON_SIZE)
      .attr('x', -VISUAL_CONFIG.ICON_HALF_SIZE)
      .attr('y', -VISUAL_CONFIG.ICON_HALF_SIZE)
      .style('pointer-events', 'all')
      .on('mouseenter', createMouseEnterHandler(tooltip))
      .on('mouseleave', createMouseLeaveHandler(tooltip));

    // Add icons to nodes
    // ...icon rendering now handled above...

    // Update positions on simulation tick
    simulation.on('tick', () => {
      node.attr('transform', d => `translate(${d.x || 0},${d.y || 0})`);
    });

    // Handle window resize
    const handleResize = () => {
      const newWidth = window.innerWidth;
      const newHeight = window.innerHeight;
      svg.attr('width', newWidth).attr('height', newHeight);

      // Update center force
      simulation.force('center', d3.forceCenter(newWidth / 2, newHeight / 2));

      // Update content elements on resize
      updateContentElements();

      simulation.alpha(0.3).restart();
    };

    window.addEventListener('resize', handleResize);

    // Periodic content update to catch dynamic changes
    const contentUpdateInterval = setInterval(updateContentElements, 2000);

    // Cleanup function
    return () => {
      simulation.stop();
      tooltip.remove();
      window.removeEventListener('resize', handleResize);
      clearInterval(contentUpdateInterval);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-50"
      style={{ overflow: 'visible' }}
    >
      <svg
        ref={svgRef}
        className="w-full h-full"
        style={{
          overflow: 'visible',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
};

export default TechStackGraph;
