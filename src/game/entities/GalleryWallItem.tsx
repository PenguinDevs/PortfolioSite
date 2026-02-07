'use client';

import { useCallback } from 'react';
import type { ThreeElements } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { WallFrame } from './WallFrame';
import { ProximityPrompt } from '../components';
import type { TechStackItem } from '@/data/portfolio';
import { phaseFromId } from '../utils';

// gallery card dimensions (world units)
const GALLERY_CONTENT_WIDTH = 3.5;
const GALLERY_CONTENT_HEIGHT = 2.5;

// html overlay pixel width (drei distanceFactor scales it in 3D space)
const HTML_WIDTH = 280;

// max number of tech stack icons to show per gallery card
const MAX_TECH_ICONS = 6;

// ---- styles ----------------------------------------------------------------

const cardStyle: React.CSSProperties = {
  width: HTML_WIDTH,
  fontFamily: "'PatrickHand', cursive",
  color: '#1a1a1a',
  padding: 8,
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  textDecoration: 'none',
  cursor: 'pointer',
  position: 'relative',
};

const titleStyle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 600,
  margin: 0,
  lineHeight: 1.2,
};

const tagsStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#666666',
  margin: 0,
};

const techRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 4,
  flexWrap: 'wrap',
  alignItems: 'center',
};

// ---- component -------------------------------------------------------------

export type GalleryWallItemProps = ThreeElements['group'] & {
  project: {
    id: string;
    title: string;
    tags: string[];
    techStack: TechStackItem[];
    link: { type: string; value: string };
  };
};

export function GalleryWallItem({ project, ...groupProps }: GalleryWallItemProps) {
  const openLink = useCallback(() => {
    window.open(project.link.value, '_blank', 'noopener,noreferrer');
  }, [project.link.value]);

  const visibleTech = project.techStack.slice(0, MAX_TECH_ICONS);
  const extraCount = project.techStack.length - MAX_TECH_ICONS;

  return (
    <group {...groupProps}>
    <WallFrame
      contentWidth={GALLERY_CONTENT_WIDTH}
      contentHeight={GALLERY_CONTENT_HEIGHT}
      frameBorder={0.1}
      showBacking
      seed={Math.abs(phaseFromId(project.id) * 100 | 0)}
    >
      <Html transform distanceFactor={4} zIndexRange={[0, 0]}>
        <div style={cardStyle}>
          <h3 style={titleStyle}>{project.title}</h3>
          {project.tags.length > 0 && (
            <p style={tagsStyle}>{project.tags.slice(0, 2).join(' / ')}</p>
          )}
          <div style={techRowStyle}>
            {visibleTech.map((item) => (
              <img
                key={item.id}
                src={item.imageUrl}
                alt={item.name}
                title={item.name}
                width={18}
                height={18}
                style={{ display: 'block' }}
              />
            ))}
            {extraCount > 0 && (
              <span style={{ fontSize: 11, color: '#999999' }}>+{extraCount}</span>
            )}
          </div>
          {/* click overlay so taps open the link instead of being swallowed by the canvas */}
          <a
            href={project.link.value}
            target="_blank"
            rel="noopener noreferrer"
            style={{ position: 'absolute', inset: 0 }}
          />
        </div>
      </Html>
      <ProximityPrompt
        onInteract={openLink}
        actionText="View"
        objectText={project.title}
        maxDistance={3}
      />
    </WallFrame>
    </group>
  );
}
