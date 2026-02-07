'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Group, ShaderMaterial } from 'three';
import type { ThreeElements } from '@react-three/fiber';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { WallFrame } from './WallFrame';
import { ProximityPrompt } from '../components';
import { useEntityReveal, useLightingMode } from '../hooks';
import { useProjectOverlay } from '../contexts/ProjectOverlayContext';
import { createToonMaterial } from '../shaders/toonShader';
import { InkEdgesGroup } from '../shaders/inkEdges';
import { INK_EDGE_COLOUR } from '../constants';
import { LightingMode } from '../types';
import type { TechStackItem, ProjectButton, ProjectMediaItem } from '@/data/portfolio';
import { phaseFromId } from '../utils';

// monitor screen dimensions (world units)
const MONITOR_CONTENT_WIDTH = 10;
const MONITOR_CONTENT_HEIGHT = 7;
const MONITOR_FRAME_BORDER = 0.2;

// horizontal offset: frame sits left of centre, info card sits to the right
const FRAME_X_OFFSET = -3.5;

// gap between the frame's right edge and the info card's left edge (world units)
const INFO_GAP = 0.5;

// html pixel width for the info card (scaled by distanceFactor in 3D)
const HTML_WIDTH = 500;

// max pixel bounds for the media embed inside the WallFrame
const MEDIA_MAX_WIDTH = 640;
const MEDIA_MAX_HEIGHT = 550;

// drei Html transform maps CSS pixels to world units at: distanceFactor / 400
const MEDIA_DISTANCE_FACTOR = 8;
const PX_TO_WORLD = MEDIA_DISTANCE_FACTOR / 400;

// how long each slide is shown before crossfading to the next (seconds)
const SLIDE_DURATION = 5;
// crossfade transition time (seconds)
const SLIDE_FADE_DURATION = 0.8;

// fit natural dimensions within max bounds while preserving aspect ratio
function fitWithinBounds(
  naturalW: number,
  naturalH: number,
  maxW: number,
  maxH: number,
): [number, number] {
  const scale = Math.min(maxW / naturalW, maxH / naturalH, 1);
  return [Math.round(naturalW * scale), Math.round(naturalH * scale)];
}

// ---- styles ----------------------------------------------------------------

// themed colour palettes for the info card (light / dark)
const CARD_TEXT_COLOUR = {
  [LightingMode.Light]: '#1a1a1a',
  [LightingMode.Dark]: '#e0e0e0',
};
const DESCRIPTION_COLOUR = {
  [LightingMode.Light]: '#333333',
  [LightingMode.Dark]: '#c0c0c0',
};
const SECONDARY_TEXT_COLOUR = {
  [LightingMode.Light]: '#666666',
  [LightingMode.Dark]: '#aaaaaa',
};
const CHIP_TEXT_COLOUR = {
  [LightingMode.Light]: '#444444',
  [LightingMode.Dark]: '#bbbbbb',
};
const CHIP_BG_COLOUR = {
  [LightingMode.Light]: '#e8e8e8',
  [LightingMode.Dark]: '#333333',
};
const TAG_BG_COLOUR = {
  [LightingMode.Light]: '#f0f0f0',
  [LightingMode.Dark]: '#333333',
};
const BORDER_COLOUR = {
  [LightingMode.Light]: '#1a1a1a',
  [LightingMode.Dark]: '#888888',
};
const BUTTON_BG_COLOUR = {
  [LightingMode.Light]: '#f5f5f5',
  [LightingMode.Dark]: '#333333',
};

const cardBaseStyle: React.CSSProperties = {
  width: HTML_WIDTH,
  fontFamily: "'Patrick Hand', cursive",
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: 6,
  textAlign: 'left',
};

const tagsRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-start',
  gap: 6,
  flexWrap: 'wrap',
};

const titleStyle: React.CSSProperties = {
  fontSize: 26,
  fontWeight: 600,
  margin: 0,
  lineHeight: 1.2,
};

const descriptionBaseStyle: React.CSSProperties = {
  fontSize: 14,
  margin: 0,
  lineHeight: 1.3,
  maxWidth: '90%',
};

const techRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-start',
  gap: 4,
  flexWrap: 'wrap',
};

const techIconStyle: React.CSSProperties = {
  width: 12,
  height: 12,
  display: 'block',
  flexShrink: 0,
};

const buttonsRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-start',
  gap: 6,
  flexWrap: 'wrap',
};

// instant tilt applied on hover (alternates direction per button)
const BUTTON_HOVER_TILT_DEG = 10;

// ---- wall button (3D cuboid against the wall) ------------------------------

// button dimensions (world units)
const BUTTON_WIDTH = 0.4;
const BUTTON_HEIGHT = 0.17;
const BUTTON_DEPTH = 0.12;

// toon shader colours for the wall button
const BUTTON_COLOUR = '#8a8888';
const BUTTON_SHADOW = '#8a7050';

// position relative to the ProjectMonitor group
// the group sits at y=MONITOR_Y (6.5), so offset down to place button at penguin height (~y=0.8)
const BUTTON_Y_OFFSET = -4.5;
// to the right, roughly under the info card / description area
const BUTTON_X_OFFSET = 6.0;
// slightly protruding from the wall
const BUTTON_Z_OFFSET = 0.3;
// the monitor group sits at z=MONITOR_Z (-11.9), the prompt anchor needs to be
// near the player's walking path (world z ~ -3) so it can trigger
const PROMPT_Z_OFFSET = 8.9;

interface WallButtonProps {
  drawProgress: { value: number };
  connectMaterial: (material: ShaderMaterial) => void;
}

// physical 3D button mounted on the wall below the monitor
function WallButton({ drawProgress, connectMaterial }: WallButtonProps) {
  const buttonRef = useRef<Group>(null);

  const material = useMemo(
    () => createToonMaterial({ color: BUTTON_COLOUR, shadowColor: BUTTON_SHADOW }),
    [],
  );

  useEffect(() => {
    connectMaterial(material);
  }, [material, connectMaterial]);

  return (
    <group ref={buttonRef}>
      <mesh castShadow>
        <boxGeometry args={[BUTTON_WIDTH, BUTTON_HEIGHT, BUTTON_DEPTH]} />
        <primitive object={material} attach="material" />
      </mesh>
      <InkEdgesGroup
        target={buttonRef}
        colour={INK_EDGE_COLOUR[LightingMode.Light]}
        darkColour={INK_EDGE_COLOUR[LightingMode.Dark]}
        seed={77}
        width={3}
        gapFreq={10}
        gapThreshold={0.38}
        drawProgress={drawProgress}
      />
    </group>
  );
}

// ---- main entity -----------------------------------------------------------

export type ProjectMonitorProps = ThreeElements['group'] & {
  project: {
    id: string;
    title: string;
    description: string;
    year: string;
    tags: string[];
    techStack: TechStackItem[];
    buttons: ProjectButton[];
    link: { type: string; value: string };
    media: ProjectMediaItem[];
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
  const mediaRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef(new Map<number, HTMLVideoElement>());
  const mode = useLightingMode();

  const { drawProgress, colourProgress, connectMaterial } = useEntityReveal(groupRef, { perfLabel: 'ProjectMonitor' });
  const reveal = useMemo(
    () => ({ drawProgress, colourProgress, connectMaterial }),
    [drawProgress, colourProgress, connectMaterial],
  );

  // slideshow state for multiple media items
  const hasSlideshow = project.media.length > 1;
  const [activeSlide, setActiveSlide] = useState(0);
  const activeSlideRef = useRef(0);
  activeSlideRef.current = activeSlide;
  const slideTimerRef = useRef(0);
  const prevSlideRef = useRef(0);
  // natural dimensions of each media item, pre-populated from static data
  // so the frame starts at the correct size before any media loads
  const naturalDimsRef = useRef(new Map<number, { width: number; height: number }>());
  useMemo(() => {
    project.media.forEach((item, i) => {
      naturalDimsRef.current.set(i, { width: item.width, height: item.height });
    });
  }, [project.media]);

  // WallFrame dimensions driven by the active slide's media aspect ratio,
  // initialised from the first media's known dimensions
  const firstFit = project.media.length > 0
    ? fitWithinBounds(project.media[0].width, project.media[0].height, MEDIA_MAX_WIDTH, MEDIA_MAX_HEIGHT)
    : [MEDIA_MAX_WIDTH, MEDIA_MAX_HEIGHT] as [number, number];
  const [frameWidth, setFrameWidth] = useState(firstFit[0] * PX_TO_WORLD);
  const [frameHeight, setFrameHeight] = useState(firstFit[1] * PX_TO_WORLD);

  // compute world-unit frame dimensions for a given media index by fitting
  // pixel dimensions within MEDIA_MAX bounds, then converting to world units
  // using the drei Html transform ratio (distanceFactor / 400)
  const getFrameDimsForSlide = useCallback((index: number): [number, number] => {
    const dims = naturalDimsRef.current.get(index);
    if (!dims) return [MEDIA_MAX_WIDTH * PX_TO_WORLD, MEDIA_MAX_HEIGHT * PX_TO_WORLD];
    const [fitW, fitH] = fitWithinBounds(dims.width, dims.height, MEDIA_MAX_WIDTH, MEDIA_MAX_HEIGHT);
    return [fitW * PX_TO_WORLD, fitH * PX_TO_WORLD];
  }, []);

  const getFittedDims = useCallback((index: number): [number, number] => {
    const dims = naturalDimsRef.current.get(index);
    if (!dims) return [MEDIA_MAX_WIDTH, MEDIA_MAX_HEIGHT];
    return fitWithinBounds(dims.width, dims.height, MEDIA_MAX_WIDTH, MEDIA_MAX_HEIGHT);
  }, []);

  const advanceSlide = useCallback(() => {
    setActiveSlide((prev) => {
      prevSlideRef.current = prev;
      return (prev + 1) % project.media.length;
    });
  }, [project.media.length]);

  // for image slides, auto-advance after SLIDE_DURATION seconds;
  // video slides advance when the clip finishes (via onEnded)
  useEffect(() => {
    if (!hasSlideshow) return;
    const currentItem = project.media[activeSlide];
    if (currentItem.type === 'video') return; // videos advance on onEnded
    const timer = setTimeout(advanceSlide, SLIDE_DURATION * 1000);
    return () => clearTimeout(timer);
  }, [hasSlideshow, activeSlide, project.media, advanceSlide]);

  // when the active slide changes, play the active video from the start
  // and pause all others so they don't run in the background
  useEffect(() => {
    videoRefs.current.forEach((video, index) => {
      if (index === activeSlide) {
        video.currentTime = 0;
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
  }, [activeSlide]);

  // track elapsed time for crossfade interpolation
  useEffect(() => {
    slideTimerRef.current = 0;
  }, [activeSlide]);

  // prefetch media as soon as ink edges start drawing so assets are
  // cached by the time the WallFrame mounts its Html children
  const prefetchedRef = useRef(false);

  // mount the Html info card as soon as ink edges start drawing
  // and fade it in independently over a short duration
  const CARD_FADE_DURATION = 0.5;
  const cardFadeRef = useRef(0);
  const [infoMounted, setInfoMounted] = useState(false);
  useFrame((_, delta) => {
    if (!prefetchedRef.current && drawProgress.value > -1) {
      prefetchedRef.current = true;
      for (const item of project.media) {
        if (item.type === 'image') {
          const img = new Image();
          img.src = item.src;
        } else {
          // fire a fetch to prime the browser cache for videos
          fetch(item.src).catch(() => {});
        }
      }
    }
    if (!infoMounted && drawProgress.value > -1) {
      setInfoMounted(true);
    }
    if (infoMounted && cardFadeRef.current < 1) {
      cardFadeRef.current = Math.min(cardFadeRef.current + delta / CARD_FADE_DURATION, 1);
    }
    if (cardRef.current) {
      cardRef.current.style.opacity = String(cardFadeRef.current);
    }
    // drive slideshow crossfade, HTML container resize, and 3D frame resize
    slideTimerRef.current += delta;
    const rawT = Math.min(slideTimerRef.current / SLIDE_FADE_DURATION, 1);
    // easeInOut cubic
    const t = rawT < 0.5
      ? 4 * rawT * rawT * rawT
      : 1 - Math.pow(-2 * rawT + 2, 3) / 2;

    // animate the 3D frame dimensions between prev and current slide
    const [prevFW, prevFH] = getFrameDimsForSlide(prevSlideRef.current);
    const [currFW, currFH] = getFrameDimsForSlide(activeSlide);
    const fw = prevFW + (currFW - prevFW) * t;
    const fh = prevFH + (currFH - prevFH) * t;
    if (Math.abs(fw - frameWidth) > 0.01 || Math.abs(fh - frameHeight) > 0.01) {
      setFrameWidth(fw);
      setFrameHeight(fh);
    }

    // animate the HTML media container dimensions between prev and current slide
    if (mediaRef.current) {
      const [prevW, prevH] = getFittedDims(prevSlideRef.current);
      const [currW, currH] = getFittedDims(activeSlide);
      const w = prevW + (currW - prevW) * t;
      const h = prevH + (currH - prevH) * t;
      mediaRef.current.style.width = `${w}px`;
      mediaRef.current.style.height = `${h}px`;

      // crossfade slide opacities
      const children = mediaRef.current.children;
      for (let i = 0; i < children.length; i++) {
        const child = children[i] as HTMLElement;
        if (child.tagName === 'A') continue; // skip click overlay
        let slideOpacity: number;
        if (i === activeSlide) {
          slideOpacity = t;
        } else if (i === prevSlideRef.current) {
          slideOpacity = 1 - t;
        } else {
          slideOpacity = 0;
        }
        child.style.opacity = String(slideOpacity * colourProgress.value);
      }
    }
  });

  // position the info card so its left edge clears the frame's right edge
  const frameRightEdge = FRAME_X_OFFSET + frameWidth / 2 + MONITOR_FRAME_BORDER;
  const infoCardHalfWidth = (HTML_WIDTH * PX_TO_WORLD) / 2;
  const infoX = frameRightEdge + INFO_GAP + infoCardHalfWidth;

  const { showProject } = useProjectOverlay();
  const handleViewProject = useCallback(() => {
    showProject(project);
  }, [showProject, project]);

  return (
    <group ref={groupRef} {...groupProps}>
      {/* monitor screen on the left, dimensions driven by active slide */}
      <group position={[FRAME_X_OFFSET, 0, 0]}>
          <WallFrame
            contentWidth={frameWidth}
            contentHeight={frameHeight}
            frameBorder={MONITOR_FRAME_BORDER}
            showBacking
            seed={Math.abs(phaseFromId(project.id) * 100 | 0)}
            reveal={reveal}
          >
            {project.media.length > 0 && (
              <Html transform distanceFactor={MEDIA_DISTANCE_FACTOR} zIndexRange={[0, 0]}>
                <div
                  ref={mediaRef}
                  style={{
                    position: 'relative',
                    width: MEDIA_MAX_WIDTH,
                    height: MEDIA_MAX_HEIGHT,
                  }}
                >
                  {project.media.map((item, i) => (
                    <div
                      key={item.src}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        opacity: 0,
                      }}
                    >
                      {item.type === 'video' ? (
                        <video
                          ref={(el) => {
                            if (el) videoRefs.current.set(i, el);
                            else videoRefs.current.delete(i);
                          }}
                          src={item.src}
                          autoPlay={i === 0}
                          loop={!hasSlideshow}
                          muted
                          playsInline
                          onEnded={hasSlideshow ? advanceSlide : undefined}
                          onLoadedMetadata={(e) => {
                            const v = e.currentTarget;
                            naturalDimsRef.current.set(i, {
                              width: v.videoWidth,
                              height: v.videoHeight,
                            });
                          }}
                          style={{
                            display: 'block',
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            borderRadius: 4,
                          }}
                        />
                      ) : (
                        <img
                          src={item.src}
                          alt={project.title}
                          onLoad={(e) => {
                            const img = e.currentTarget;
                            naturalDimsRef.current.set(i, {
                              width: img.naturalWidth,
                              height: img.naturalHeight,
                            });
                          }}
                          style={{
                            display: 'block',
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            borderRadius: 4,
                          }}
                        />
                      )}
                    </div>
                  ))}
                  {/* click overlay so taps open the link instead of being swallowed by the canvas */}
                  <a
                    href={project.link.value}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ position: 'absolute', inset: 0, cursor: 'pointer' }}
                  />
                </div>
              </Html>
            )}
          </WallFrame>
      </group>

      {/* info card to the right of the frame */}
      {infoMounted && (
        <group position={[infoX, 0, 0]}>
          <Html transform distanceFactor={8} zIndexRange={[0, 0]}>
            <div ref={cardRef} style={{ ...cardBaseStyle, color: CARD_TEXT_COLOUR[mode], opacity: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <h2 style={titleStyle}>{project.title}</h2>
                <span style={{ fontSize: 14, color: SECONDARY_TEXT_COLOUR[mode], whiteSpace: 'nowrap' }}>{project.year}</span>
              </div>
              {project.tags.length > 0 && (
                <div style={tagsRowStyle}>
                  {project.tags.map((tag) => (
                    <span key={tag} style={{
                      fontSize: 11,
                      color: SECONDARY_TEXT_COLOUR[mode],
                      background: TAG_BG_COLOUR[mode],
                      boxShadow: `0 0 0 1px ${BORDER_COLOUR[mode]}`,
                      borderRadius: 12,
                      padding: '1px 7px',
                    }}>{tag}</span>
                  ))}
                </div>
              )}

              <p style={{ ...descriptionBaseStyle, color: DESCRIPTION_COLOUR[mode] }}>{project.description}</p>

              <div style={techRowStyle}>
                {project.techStack.map((item) => (
                  <span key={item.id} style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 3,
                    fontSize: 11,
                    color: CHIP_TEXT_COLOUR[mode],
                    background: CHIP_BG_COLOUR[mode],
                    boxShadow: `0 0 0 1px ${BORDER_COLOUR[mode]}`,
                    borderRadius: 10,
                    padding: '2px 7px',
                    whiteSpace: 'nowrap',
                  }}>
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      style={techIconStyle}
                    />
                    {item.name}
                  </span>
                ))}
              </div>

              {project.buttons.length > 0 && (
                <div style={buttonsRowStyle}>
                  {project.buttons.map((btn, i) => {
                    const tiltDeg = (i % 2 === 0 ? 1 : -1) * BUTTON_HOVER_TILT_DEG;
                    return (
                      <a
                        key={btn.label}
                        href={btn.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-block',
                          fontSize: 13,
                          color: CARD_TEXT_COLOUR[mode],
                          background: BUTTON_BG_COLOUR[mode],
                          boxShadow: `0 0 0 1px ${BORDER_COLOUR[mode]}`,
                          borderRadius: 12,
                          padding: '4px 12px',
                          textDecoration: 'none',
                          whiteSpace: 'nowrap',
                          cursor: 'pointer',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = `rotate(${tiltDeg}deg)`;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = '';
                        }}
                      >
                        {btn.label} &rarr;
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          </Html>
        </group>
      )}

      {/* 3D wall button against the wall */}
      <group position={[BUTTON_X_OFFSET, BUTTON_Y_OFFSET, BUTTON_Z_OFFSET]}>
        <WallButton drawProgress={drawProgress} connectMaterial={connectMaterial} />
      </group>

      {/* anchor near the player's walking path so the distance check triggers,
         but offset the billboard back to the wall where the button sits */}
      <group position={[BUTTON_X_OFFSET, BUTTON_Y_OFFSET, PROMPT_Z_OFFSET]}>
        <ProximityPrompt
          onInteract={handleViewProject}
          actionText="View"
          objectText={project.title}
          maxDistance={12}
          offset={[0, 0, -(PROMPT_Z_OFFSET - BUTTON_Z_OFFSET)]}
        />
      </group>
    </group>
  );
}
