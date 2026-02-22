'use client';

import { useFrame } from '@react-three/fiber';
import { Vector3 } from 'three';
import { usePlayerRef } from '../../contexts/PlayerContext';
import { ProximityService } from './ProximityService';

const _playerPos = new Vector3();

// thin bridge component: reads the player world position once per frame
// and feeds it into the ProximityService singleton
export function ProximityUpdater() {
  const playerRef = usePlayerRef();

  useFrame(() => {
    const group = playerRef.current;
    if (!group) return;
    group.getWorldPosition(_playerPos);
    ProximityService.update(_playerPos);
  });

  return null;
}
