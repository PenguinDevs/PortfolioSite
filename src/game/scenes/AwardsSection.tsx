'use client';

import { useCallback, useRef, useState } from 'react';
import type { ThreeElements } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { PedestalAward, Sign, WallFrame } from '../entities';
import { ProximityPrompt } from '../components';
import { useAwardOverlay } from '../contexts/AwardOverlayContext';

// seconds to wait for the iframe to load before showing the fallback image
const EMBED_TIMEOUT_MS = 5000;

// spacing between each pedestal along the x axis
const PEDESTAL_SPACING = 4;
const PEDESTAL_Z = -2;

// --- wall frame embeds ---------------------------------------------------

interface WallEmbed {
  id: string;
  // URL opened when the player interacts
  url: string;
  // LinkedIn embed URL (falls back to static image if blocked)
  embedUrl: string;
  // fallback screenshot shown when the iframe is blocked (e.g. Brave shields)
  fallbackImage: string;
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
    fallbackImage: '/assets/images/linkedin_fallback/linkedin_macathon_2025.png',
    label: 'LinkedIn Post',
    width: 500,
    height: 400,
    position: [-5, 8, -11.9],
    contentWidth: 10,
    contentHeight: 8,
    seed: 42,
  },
  {
    id: 'adf-awards',
    url: 'https://www.linkedin.com/feed/update/urn:li:ugcPost:7381497433828012032/',
    embedUrl: 'https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:7381497433828012032?collapsed=1',
    fallbackImage: '/assets/images/linkedin_fallback/linkedin_maps_2025.png',
    label: 'LinkedIn Post',
    width: 400,
    height: 300,
    position: [5, 8.5, -11.9],
    contentWidth: 8,
    contentHeight: 6,
    seed: 43,
  },
];

// tries to render an iframe embed, falls back to a static image if it
// doesn't load within the timeout (e.g. blocked by Brave shields)
function EmbedWithFallback({
  embedUrl,
  fallbackImage,
  label,
  url,
  width,
  height,
}: {
  embedUrl: string;
  fallbackImage: string;
  label: string;
  url: string;
  width: number;
  height: number;
}) {
  const [useFallback, setUseFallback] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const iframeNodeRef = useRef<HTMLIFrameElement | null>(null);

  const handleLoad = useCallback(() => {
    // when a browser like Brave blocks the embed, the iframe still fires
    // onLoad but loads same-origin about:blank instead. A real cross-origin
    // LinkedIn embed makes contentDocument inaccessible (null). If we CAN
    // read it, the real content was blocked.
    if (iframeNodeRef.current) {
      try {
        const doc = iframeNodeRef.current.contentDocument;
        if (doc) {
          setUseFallback(true);
          return;
        }
      } catch {
        // SecurityError means cross-origin content loaded (the happy path)
      }
    }
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    timerRef.current = setTimeout(() => {
      setUseFallback(true);
    }, EMBED_TIMEOUT_MS);
  }, []);

  // start the timeout when the iframe mounts
  const iframeRef = useCallback(
    (node: HTMLIFrameElement | null) => {
      iframeNodeRef.current = node;
      if (node) startTimer();
    },
    [startTimer],
  );

  if (useFallback) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        style={{ display: 'block', cursor: 'pointer' }}
      >
        <img
          src={fallbackImage}
          alt={label}
          width={width}
          height={height}
          style={{ borderRadius: 8, objectFit: 'cover', display: 'block' }}
        />
      </a>
    );
  }

  return (
    <div style={{ width, height, position: 'relative' }}>
      <iframe
        ref={iframeRef}
        src={embedUrl}
        title={label}
        onLoad={handleLoad}
        onError={() => setUseFallback(true)}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          borderRadius: 8,
        }}
      />
      {/* click overlay so taps open the post instead of being swallowed by the iframe */}
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        style={{ position: 'absolute', inset: 0, cursor: 'pointer' }}
      />
    </div>
  );
}

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
            <EmbedWithFallback
              embedUrl={embed.embedUrl}
              fallbackImage={embed.fallbackImage}
              label={embed.label}
              url={embed.url}
              width={embed.width}
              height={embed.height}
            />
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
