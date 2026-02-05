'use client';

import { useCallback } from 'react';
import type { ThreeElements } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { PedestalAward, Sign, WallFrame } from '../entities';
import { ProximityPrompt } from '../components';
import { useAwardOverlay } from '../contexts/AwardOverlayContext';

// spacing between each pedestal along the x axis
const PEDESTAL_SPACING = 4;
const PEDESTAL_Z = -2;

// --- wall frame embeds ---------------------------------------------------

interface WallEmbed {
  id: string;
  // URL opened when the player interacts
  url: string;
  // iframe embed source
  embedUrl: string;
  // label shown on the proximity prompt
  label: string;
  // iframe pixel dimensions
  width: number;
  height: number;
  // 3D placement
  position: [number, number, number];
  contentWidth: number;
  contentHeight: number;
  seed: number;
}

const WALL_EMBEDS: WallEmbed[] = [
  {
    id: 'macathon-2025',
    url: 'https://www.linkedin.com/feed/update/urn:li:ugcPost:7330566984138477570/',
    embedUrl: 'https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:7330566984138477570?collapsed=1',
    label: 'LinkedIn Post',
    width: 500,
    height: 400,
    position: [-6, 8, -11.9],
    contentWidth: 10,
    contentHeight: 8,
    seed: 42,
  },
  {
    id: 'adf-awards',
    url: 'https://www.linkedin.com/feed/update/urn:li:ugcPost:7381497433828012032/',
    embedUrl: 'https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:7381497433828012032?collapsed=1',
    label: 'LinkedIn Post',
    width: 400,
    height: 300,
    position: [5, 8.5, -11.9],
    contentWidth: 8,
    contentHeight: 6,
    seed: 43,
  },
];

// -------------------------------------------------------------------------

type AwardsSectionProps = ThreeElements['group'];

export function AwardsSection(props: AwardsSectionProps) {
  const { awards } = useAwardOverlay();

  // centre the row so the midpoint sits at x=0
  const totalWidth = (awards.length - 1) * PEDESTAL_SPACING;
  const startX = -totalWidth / 2;

  const openUrl = useCallback((url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  }, []);

  return (
    <group {...props}>
      <Sign position={[-12, 0, -4]} rotation={[0, 0, 0]} rows={['', 'Awards', '---->', '']} />

      {awards.map((award, i) => (
        <PedestalAward
          key={award.id}
          position={[startX + i * PEDESTAL_SPACING, 0, PEDESTAL_Z]}
          award={award}
        />
      ))}

      {WALL_EMBEDS.map((embed) => (
        <WallFrame
          key={embed.id}
          position={embed.position}
          contentWidth={embed.contentWidth}
          contentHeight={embed.contentHeight}
          frameBorder={0.15}
          showBacking={false}
          seed={embed.seed}
        >
          <Html transform distanceFactor={8} zIndexRange={[0, 0]}>
            <div style={{ width: embed.width, height: embed.height }}>
              <iframe
                src={embed.embedUrl}
                title={embed.label}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  borderRadius: 8,
                }}
              />
            </div>
          </Html>
          <ProximityPrompt
            onInteract={() => openUrl(embed.url)}
            actionText="View"
            objectText={embed.label}
            maxDistance={3}
          />
        </WallFrame>
      ))}
    </group>
  );
}
