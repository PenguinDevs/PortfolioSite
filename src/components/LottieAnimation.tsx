'use client';

import { useEffect, useRef } from 'react';
import Lottie from 'lottie-react';
import JettData from './animations/Jett.json';

interface LottieAnimationProps {
  className?: string;
  width?: number | string;
  height?: number | string;
}

const LottieAnimation: React.FC<LottieAnimationProps> = ({ 
  className = '',
  width = 80,
  height = 80 
}) => {
  return (
    <div className={className} style={{ width, height }}>
      <Lottie
        animationData={JettData}
        loop={true}
        autoplay={true}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
};

export default LottieAnimation;