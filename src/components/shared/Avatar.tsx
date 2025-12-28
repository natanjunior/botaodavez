import React from 'react';
import Image from 'next/image';

export interface AvatarProps {
  seed: string;
  size?: number;
  className?: string;
  style?: 'avataaars' | 'bottts' | 'fun-emoji' | 'lorelei' | 'personas';
}

/**
 * Avatar component using DiceBear API
 * Generates consistent, unique avatars based on a seed string
 *
 * @param seed - Unique seed for avatar generation (usually participant name)
 * @param size - Avatar size in pixels (default: 80)
 * @param className - Additional CSS classes
 * @param style - DiceBear avatar style (default: 'fun-emoji')
 */
export function Avatar({ seed, size = 80, className = '', style = 'fun-emoji' }: AvatarProps) {
  // Encode seed for URL safety
  const encodedSeed = encodeURIComponent(seed);

  // DiceBear API URL
  const avatarUrl = `https://api.dicebear.com/7.x/${style}/svg?seed=${encodedSeed}&size=${size}`;

  return (
    <div
      className={`
        relative inline-block rounded-full overflow-hidden
        border-2 border-gray-700
        skeu-shadow-raised
        ${className}
      `.trim()}
      style={{ width: size, height: size }}
    >
      <Image
        src={avatarUrl}
        alt={`Avatar for ${seed}`}
        width={size}
        height={size}
        className="object-cover"
        unoptimized // DiceBear generates dynamic SVGs
      />
    </div>
  );
}

/**
 * Avatar with online/offline indicator
 */
export function AvatarWithStatus({
  seed,
  size = 80,
  isOnline = false,
  className = '',
  style = 'fun-emoji',
}: AvatarProps & { isOnline?: boolean }) {
  return (
    <div className="relative inline-block">
      <Avatar seed={seed} size={size} className={className} style={style} />

      {/* Online/Offline LED indicator */}
      <div
        className={`
          absolute bottom-0 right-0
          skeu-led
          ${isOnline ? 'skeu-led-online' : 'skeu-led-offline'}
        `.trim()}
        aria-label={isOnline ? 'Online' : 'Offline'}
      />
    </div>
  );
}

/**
 * Avatar with participant name label
 */
export function AvatarWithLabel({
  seed,
  name,
  size = 60,
  isOnline = false,
  className = '',
}: AvatarProps & { name: string; isOnline?: boolean }) {
  return (
    <div className={`flex flex-col items-center gap-2 ${className}`.trim()}>
      <AvatarWithStatus seed={seed} size={size} isOnline={isOnline} />
      <span className="text-sm font-medium text-white truncate max-w-[80px]" title={name}>
        {name}
      </span>
    </div>
  );
}
