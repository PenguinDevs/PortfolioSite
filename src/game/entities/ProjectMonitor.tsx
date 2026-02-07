'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Group } from 'three';
import type { ThreeElements } from '@react-three/fiber';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { WallFrame } from './WallFrame';
import { ProximityPrompt } from '../components';
import { useEntityReveal } from '../hooks';
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

const cardStyle: React.CSSProperties = {
  width: HTML_WIDTH,
  fontFamily: "'Patrick Hand', cursive",
  color: '#1a1a1a',
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
  justifyContent: 'flex-start',
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

const buttonsRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-start',
  gap: 6,
  flexWrap: 'wrap',
};

const buttonStyle: React.CSSProperties = {
  display: 'inline-block',
  fontSize: 11,
  color: '#1a1a1a',
  background: '#f5f5f5',
  border: '1px solid #1a1a1a',
  borderRadius: 10,
  padding: '3px 10px',
  textDecoration: 'none',
  whiteSpace: 'nowrap',
  cursor: 'pointer',
};

// ---- main entity -----------------------------------------------------------

export type ProjectMonitorProps = ThreeElements['group'] & {
  project: {
    id: string;
    title: string;
    description: string;
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

  const { drawProgress, colourProgress, connectMaterial } = useEntityReveal(groupRef);
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

  // mount the Html info card only once colour starts revealing
  const [infoMounted, setInfoMounted] = useState(false);
  useFrame((_, delta) => {
    if (!infoMounted && colourProgress.value > 0.01) {
      setInfoMounted(true);
    }
    // drive card and media opacity from colour reveal progress
    if (cardRef.current) {
      cardRef.current.style.opacity = String(colourProgress.value);
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

  const openLink = useCallback(() => {
    window.open(project.link.value, '_blank', 'noopener,noreferrer');
  }, [project.link.value]);

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

              {project.buttons.length > 0 && (
                <div style={buttonsRowStyle}>
                  {project.buttons.map((btn) => (
                    <a
                      key={btn.label}
                      href={btn.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={buttonStyle}
                    >
                      {btn.label} &rarr;
                    </a>
                  ))}
                </div>
              )}
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
