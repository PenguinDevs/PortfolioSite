'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useProjectOverlay } from '../contexts/ProjectOverlayContext';
import { useLightingMode } from '../hooks';
import { INK_EDGE_COLOUR, BACKGROUND_COLOUR } from '../constants';
import { TEXT_WINDOW_FONT } from './TextWindow';

const FADE_MS = 250;

// media viewer dimensions
const MEDIA_MAX_WIDTH = 540;
const MEDIA_MAX_HEIGHT = 340;

// lightbox transition time (ms)
const LIGHTBOX_FADE_MS = 200;

export function ProjectOverlay() {
  const mode = useLightingMode();
  const { activeProject, hideProject } = useProjectOverlay();
  const filterId = useId();

  // fade animation state
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // media slideshow state
  const [activeSlide, setActiveSlide] = useState(0);

  // lightbox (enlarged media) state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const lightboxTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const openLightbox = useCallback(() => {
    setLightboxOpen(true);
    requestAnimationFrame(() => setLightboxVisible(true));
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxVisible(false);
    lightboxTimeoutRef.current = setTimeout(() => setLightboxOpen(false), LIGHTBOX_FADE_MS);
  }, []);

  const edgeColour = INK_EDGE_COLOUR[mode];
  const bgColour = BACKGROUND_COLOUR[mode];
  const textColour = edgeColour;

  // fade in when a project becomes active
  useEffect(() => {
    if (activeProject) {
      setActiveSlide(0);
      setLightboxOpen(false);
      setLightboxVisible(false);
      setMounted(true);
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
      timeoutRef.current = setTimeout(() => setMounted(false), FADE_MS);
    }
    return () => {
      clearTimeout(timeoutRef.current);
      clearTimeout(lightboxTimeoutRef.current);
    };
  }, [activeProject]);

  // close on Escape (lightbox first, then overlay)
  useEffect(() => {
    if (!mounted) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        if (lightboxOpen) {
          closeLightbox();
        } else {
          hideProject();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mounted, lightboxOpen, closeLightbox, hideProject]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) hideProject();
    },
    [hideProject],
  );

  const goToSlide = useCallback((index: number) => {
    setActiveSlide(index);
  }, []);

  if (!mounted || !activeProject) return null;

  const hasMultipleMedia = activeProject.media.length > 1;

  return (
    <div
      onClick={handleBackdropClick}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.6)',
        opacity: visible ? 1 : 0,
        transition: `opacity ${FADE_MS}ms ease`,
        fontFamily: TEXT_WINDOW_FONT,
        cursor: 'pointer',
      }}
    >
      {/* Card */}
      <div
        style={{
          position: 'relative',
          width: 580,
          maxWidth: 'calc(100vw - 48px)',
          maxHeight: 'calc(100vh - 48px)',
          padding: 32,
          cursor: 'default',
          transform: visible ? 'translateY(0)' : 'translateY(12px)',
          transition: `transform ${FADE_MS}ms ease, opacity ${FADE_MS}ms ease`,
          overflowY: 'auto',
        }}
      >
        {/* Background fill */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: bgColour,
            opacity: 0.96,
            borderRadius: 2,
          }}
        />

        {/* SVG filter for hand-drawn ink wobble */}
        <svg
          style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}
          aria-hidden
        >
          <defs>
            <filter id={filterId}>
              <feTurbulence
                type="turbulence"
                baseFrequency="0.03"
                numOctaves={4}
                seed={9}
                result="noise"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="noise"
                scale={3}
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>
          </defs>
        </svg>

        {/* Ink border */}
        <svg
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            filter: `url(#${CSS.escape(filterId)})`,
          }}
          preserveAspectRatio="none"
          aria-hidden
        >
          <rect x="0" y="0" width="100%" height="3" fill={edgeColour} />
          <rect x="0" y="100%" width="100%" height="3" fill={edgeColour} transform="translate(0, -3)" />
          <rect x="0" y="0" width="3" height="100%" fill={edgeColour} />
          <rect x="100%" y="0" width="3" height="100%" fill={edgeColour} transform="translate(-3, 0)" />
        </svg>

        {/* Content */}
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Close button */}
          <button
            onClick={hideProject}
            style={{
              position: 'absolute',
              top: -16,
              right: -16,
              background: 'none',
              border: 'none',
              color: textColour,
              fontSize: 28,
              cursor: 'pointer',
              lineHeight: 1,
              padding: 4,
              fontFamily: TEXT_WINDOW_FONT,
            }}
            aria-label="Close"
          >
            x
          </button>

          {/* Media viewer */}
          {activeProject.media.length > 0 && (
            <div style={{ position: 'relative' }}>
              <div
                style={{
                  width: '100%',
                  maxWidth: MEDIA_MAX_WIDTH,
                  maxHeight: MEDIA_MAX_HEIGHT,
                  margin: '0 auto',
                  overflow: 'hidden',
                  borderRadius: 4,
                  position: 'relative',
                }}
              >
                {activeProject.media.map((item, i) => (
                  <div
                    key={item.src}
                    onClick={openLightbox}
                    style={{
                      display: i === activeSlide ? 'block' : 'none',
                      width: '100%',
                      cursor: 'zoom-in',
                    }}
                  >
                    {item.type === 'video' ? (
                      <video
                        src={item.src}
                        autoPlay
                        loop
                        muted
                        playsInline
                        style={{
                          display: 'block',
                          width: '100%',
                          maxHeight: MEDIA_MAX_HEIGHT,
                          objectFit: 'contain',
                        }}
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.src}
                        alt={activeProject.title}
                        style={{
                          display: 'block',
                          width: '100%',
                          maxHeight: MEDIA_MAX_HEIGHT,
                          objectFit: 'contain',
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Slideshow navigation arrows */}
              {hasMultipleMedia && (
                <>
                  <button
                    onClick={() => goToSlide((activeSlide - 1 + activeProject.media.length) % activeProject.media.length)}
                    style={{
                      position: 'absolute',
                      left: 4,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'rgba(0,0,0,0.4)',
                      border: 'none',
                      color: '#fff',
                      fontSize: 22,
                      cursor: 'pointer',
                      borderRadius: '50%',
                      width: 36,
                      height: 36,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: TEXT_WINDOW_FONT,
                    }}
                    aria-label="Previous slide"
                  >
                    &lt;
                  </button>
                  <button
                    onClick={() => goToSlide((activeSlide + 1) % activeProject.media.length)}
                    style={{
                      position: 'absolute',
                      right: 4,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'rgba(0,0,0,0.4)',
                      border: 'none',
                      color: '#fff',
                      fontSize: 22,
                      cursor: 'pointer',
                      borderRadius: '50%',
                      width: 36,
                      height: 36,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: TEXT_WINDOW_FONT,
                    }}
                    aria-label="Next slide"
                  >
                    &gt;
                  </button>
                </>
              )}

              {/* Slideshow dots */}
              {hasMultipleMedia && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: 6,
                    marginTop: 8,
                  }}
                >
                  {activeProject.media.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => goToSlide(i)}
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        border: `1.5px solid ${textColour}`,
                        background: i === activeSlide ? textColour : 'transparent',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                      aria-label={`Go to slide ${i + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Title and year */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <h2
              style={{
                margin: 0,
                fontSize: 30,
                fontWeight: 700,
                color: textColour,
                fontFamily: TEXT_WINDOW_FONT,
              }}
            >
              {activeProject.title}
            </h2>
            <span
              style={{
                fontSize: 18,
                color: textColour,
                opacity: 0.5,
                fontFamily: TEXT_WINDOW_FONT,
                whiteSpace: 'nowrap',
              }}
            >
              {activeProject.year}
            </span>
          </div>

          {/* Tags */}
          {activeProject.tags.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {activeProject.tags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    fontSize: 14,
                    color: textColour,
                    opacity: 0.6,
                    background: mode === 'light' ? '#f0f0f0' : 'rgba(255,255,255,0.08)',
                    border: `1px solid ${textColour}`,
                    borderRadius: 12,
                    padding: '2px 10px',
                    fontFamily: TEXT_WINDOW_FONT,
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Description */}
          <p
            style={{
              margin: 0,
              fontSize: 20,
              lineHeight: 1.35,
              color: textColour,
              opacity: 0.85,
              fontFamily: TEXT_WINDOW_FONT,
            }}
          >
            {activeProject.description}
          </p>

          {/* Tech stack */}
          {activeProject.techStack.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {activeProject.techStack.map((item) => (
                <span
                  key={item.id}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 14,
                    color: textColour,
                    opacity: 0.7,
                    background: mode === 'light' ? '#e8e8e8' : 'rgba(255,255,255,0.06)',
                    border: `1px solid ${textColour}`,
                    borderRadius: 10,
                    padding: '2px 8px',
                    fontFamily: TEXT_WINDOW_FONT,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    style={{ width: 14, height: 14, display: 'block', flexShrink: 0 }}
                  />
                  {item.name}
                </span>
              ))}
            </div>
          )}

          {/* Action buttons */}
          {activeProject.buttons.length > 0 && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
              {activeProject.buttons.map((btn) => (
                <a
                  key={btn.label}
                  href={btn.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-block',
                    padding: '8px 20px',
                    fontSize: 20,
                    fontWeight: 600,
                    color: bgColour,
                    backgroundColor: textColour,
                    textDecoration: 'none',
                    borderRadius: 2,
                    fontFamily: TEXT_WINDOW_FONT,
                  }}
                >
                  {btn.label}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox: enlarged media view */}
      {lightboxOpen && (() => {
        const currentItem = activeProject.media[activeSlide];
        if (!currentItem) return null;
        return (
          <div
            onClick={closeLightbox}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 1100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0, 0, 0, 0.85)',
              opacity: lightboxVisible ? 1 : 0,
              transition: `opacity ${LIGHTBOX_FADE_MS}ms ease`,
              cursor: 'zoom-out',
            }}
          >
            {currentItem.type === 'video' ? (
              <video
                src={currentItem.src}
                autoPlay
                loop
                muted
                playsInline
                onClick={(e) => e.stopPropagation()}
                style={{
                  display: 'block',
                  maxWidth: 'calc(100vw - 64px)',
                  maxHeight: 'calc(100vh - 64px)',
                  objectFit: 'contain',
                  borderRadius: 4,
                  cursor: 'default',
                  transform: lightboxVisible ? 'scale(1)' : 'scale(0.95)',
                  transition: `transform ${LIGHTBOX_FADE_MS}ms ease`,
                }}
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentItem.src}
                alt={activeProject.title}
                onClick={(e) => e.stopPropagation()}
                style={{
                  display: 'block',
                  maxWidth: 'calc(100vw - 64px)',
                  maxHeight: 'calc(100vh - 64px)',
                  objectFit: 'contain',
                  borderRadius: 4,
                  cursor: 'default',
                  transform: lightboxVisible ? 'scale(1)' : 'scale(0.95)',
                  transition: `transform ${LIGHTBOX_FADE_MS}ms ease`,
                }}
              />
            )}

            {/* Lightbox navigation arrows */}
            {hasMultipleMedia && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    goToSlide((activeSlide - 1 + activeProject.media.length) % activeProject.media.length);
                  }}
                  style={{
                    position: 'absolute',
                    left: 16,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'rgba(255,255,255,0.15)',
                    border: 'none',
                    color: '#fff',
                    fontSize: 28,
                    cursor: 'pointer',
                    borderRadius: '50%',
                    width: 44,
                    height: 44,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: TEXT_WINDOW_FONT,
                  }}
                  aria-label="Previous slide"
                >
                  &lt;
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    goToSlide((activeSlide + 1) % activeProject.media.length);
                  }}
                  style={{
                    position: 'absolute',
                    right: 16,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'rgba(255,255,255,0.15)',
                    border: 'none',
                    color: '#fff',
                    fontSize: 28,
                    cursor: 'pointer',
                    borderRadius: '50%',
                    width: 44,
                    height: 44,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: TEXT_WINDOW_FONT,
                  }}
                  aria-label="Next slide"
                >
                  &gt;
                </button>
              </>
            )}

            {/* Close hint */}
            <button
              onClick={closeLightbox}
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                background: 'none',
                border: 'none',
                color: '#fff',
                fontSize: 32,
                cursor: 'pointer',
                lineHeight: 1,
                padding: 4,
                fontFamily: TEXT_WINDOW_FONT,
                opacity: 0.7,
              }}
              aria-label="Close lightbox"
            >
              x
            </button>
          </div>
        );
      })()}
    </div>
  );
}
