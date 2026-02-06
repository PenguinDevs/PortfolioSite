'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import type { Group } from 'three';
import type { ThreeElements } from '@react-three/fiber';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { WallFrame } from './WallFrame';
import { ProximityPrompt } from '../components';
import { useEntityReveal } from '../hooks';
import type { TechStackItem } from '@/data/portfolio';
import { phaseFromId } from '../utils';

// monitor screen dimensions (world units)
const MONITOR_CONTENT_WIDTH = 8;
const MONITOR_CONTENT_HEIGHT = 5;
const MONITOR_FRAME_BORDER = 0.2;

// info card sits just below the frame bottom edge
const INFO_Y_OFFSET = 0.3;

// html pixel width for the info card (scaled by distanceFactor in 3D)
const HTML_WIDTH = 500;

// ---- styles ----------------------------------------------------------------

const cardStyle: React.CSSProperties = {
  width: HTML_WIDTH,
  fontFamily: "'Patrick Hand', cursive",
  color: '#1a1a1a',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 6,
  textAlign: 'center',
};

const tagsRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  gap: 6,
  flexWrap: 'wrap',
};

const titleStyle: React.CSSProperties = {
  fontSize: 26,
  fontWeight: 600,
  margin: 0,
  lineHeight: 1.2,
};

const projectTagStyle: React.CSSProperties = {
  fontSize: 11,
  color: '#666666',
  background: '#f0f0f0',
  border: '1px solid #1a1a1a',
  borderRadius: 12,
  padding: '1px 7px',
};

const descriptionStyle: React.CSSProperties = {
  fontSize: 14,
  color: '#333333',
  margin: 0,
  lineHeight: 1.3,
  maxWidth: '90%',
};

const techRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  gap: 4,
  flexWrap: 'wrap',
};

const techChipStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 3,
  fontSize: 11,
  color: '#444444',
  background: '#e8e8e8',
  border: '1px solid #1a1a1a',
  borderRadius: 10,
  padding: '2px 7px',
  whiteSpace: 'nowrap',
};

const techIconStyle: React.CSSProperties = {
  width: 12,
  height: 12,
  display: 'block',
  flexShrink: 0,
};

// ---- main entity -----------------------------------------------------------

export type ProjectMonitorProps = ThreeElements['group'] & {
  project: {
    id: string;
    title: string;
    description: string;
    tags: string[];
    techStack: TechStackItem[];
    link: { type: string; value: string };
    previewImage?: string;
  };
  // optional overrides for the monitor frame dimensions
  contentWidth?: number;
  contentHeight?: number;
};

export function ProjectMonitor({
  project,
  contentWidth = MONITOR_CONTENT_WIDTH,
  contentHeight = MONITOR_CONTENT_HEIGHT,
  ...groupProps
}: ProjectMonitorProps) {
  const groupRef = useRef<Group>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const { drawProgress, colourProgress, connectMaterial } = useEntityReveal(groupRef);
  const reveal = useMemo(
    () => ({ drawProgress, colourProgress, connectMaterial }),
    [drawProgress, colourProgress, connectMaterial],
  );

  // mount the Html info card only once colour starts revealing
  const [infoMounted, setInfoMounted] = useState(false);
  useFrame(() => {
    if (!infoMounted && colourProgress.value > 0.01) {
      setInfoMounted(true);
    }
    // drive card opacity from colour reveal progress
    if (cardRef.current) {
      cardRef.current.style.opacity = String(colourProgress.value);
    }
  });

  const openLink = useCallback(() => {
    window.open(project.link.value, '_blank', 'noopener,noreferrer');
  }, [project.link.value]);

  // position the info card just below the frame bottom edge
  const infoY = -(contentHeight / 2) - INFO_Y_OFFSET;

  return (
    <group ref={groupRef} {...groupProps}>
      {/* monitor screen (image goes here) */}
      <WallFrame
        contentWidth={contentWidth}
        contentHeight={contentHeight}
        frameBorder={MONITOR_FRAME_BORDER}
        showBacking
        seed={Math.abs(phaseFromId(project.id) * 100 | 0)}
        reveal={reveal}
      />

      {/* compact info card below the frame */}
      {infoMounted && (
        <group position={[0, infoY, 0]}>
          <Html transform distanceFactor={8} zIndexRange={[0, 0]}>
            {/* shift down 50% to counteract drei's default centering, so the card hangs below the anchor */}
            <div style={{ transform: 'translateY(50%)' }}>
            <div ref={cardRef} style={{ ...cardStyle, opacity: 0 }}>
              <h2 style={titleStyle}>{project.title}</h2>
              {project.tags.length > 0 && (
                <div style={tagsRowStyle}>
                  {project.tags.map((tag) => (
                    <span key={tag} style={projectTagStyle}>{tag}</span>
                  ))}
                </div>
              )}

              <p style={descriptionStyle}>{project.description}</p>

              <div style={techRowStyle}>
                {project.techStack.map((item) => (
                  <span key={item.id} style={techChipStyle}>
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      style={techIconStyle}
                    />
                    {item.name}
                  </span>
                ))}
              </div>
            </div>
            </div>
          </Html>
        </group>
      )}

      <ProximityPrompt
        onInteract={openLink}
        actionText="Open"
        objectText={project.title}
        maxDistance={4}
      />
    </group>
  );
}
