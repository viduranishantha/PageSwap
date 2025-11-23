import { useState, useEffect } from 'react';
import * as Avatar from '@radix-ui/react-avatar';
import styles from './UserAvatar.module.css';
import { useImageRepository } from '../repositories';

interface UserAvatarProps {
  avatarId: string;
  firstName?: string;
  lastName?: string;
  size?: number;
  /** Optional preloaded image URL (blob: or http). If provided, component will not fetch. */
  imageUrl?: string | null;
}

export function UserAvatar({ avatarId, firstName, lastName, size = 40, imageUrl: externalImageUrl = null }: UserAvatarProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(externalImageUrl);
  const [loading, setLoading] = useState(!externalImageUrl);
  const imageRepository = useImageRepository();

  useEffect(() => {
    // If a parent provided a preloaded image URL, use it and do not fetch or revoke it here.
    if (externalImageUrl) {
      setImageUrl(externalImageUrl);
      setLoading(false);
      return;
    }

    let cancelled = false;
    let createdUrl: string | null = null;

    const loadImage = async () => {
      try {
        const url = await imageRepository.get(avatarId);
        if (cancelled) {
          // We created a URL but the component unmounted; revoke immediately.
          try { URL.revokeObjectURL(url); } catch (e) { void e; }
          return;
        }
        createdUrl = url;
        setImageUrl(url);
      } catch (_err: unknown) {
        void _err;
        // Try fallback; handle unknown error type safely
        try {
          const fallbackUrl = await imageRepository.get('placeholder-dp.png');
          if (cancelled) {
            try { URL.revokeObjectURL(fallbackUrl); } catch (e) { void e; }
            return;
          }
          createdUrl = fallbackUrl;
          setImageUrl(fallbackUrl);
        } catch (e) {
          void e;
          if (!cancelled) setImageUrl(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadImage();

    return () => {
      cancelled = true;
      if (createdUrl) {
        try {
          URL.revokeObjectURL(createdUrl);
        } catch (e) { void e; }
      }
    };
  }, [avatarId, externalImageUrl, imageRepository]);

  const initials =
    [firstName, lastName]
      .filter(Boolean)
      .map((name) => name?.[0]?.toUpperCase())
      .join('')
      .slice(0, 2) || '?';

  return (
    <Avatar.Root
      className={`${styles.root} ${loading ? styles.loading : ''}`}
      style={{
        width: size,
        height: size,
      }}
    >
      {loading ? (
        <div className={styles.loadingText}>...</div>
      ) : (
        <>
          <Avatar.Image
            src={imageUrl || undefined}
            alt={`${firstName || ''} ${lastName || ''}`.trim() || 'User'}
            className={styles.image}
          />
          <Avatar.Fallback
            className={styles.fallback}
            style={{
              fontSize: size * 0.4,
            }}
            delayMs={600}
          >
            {initials}
          </Avatar.Fallback>
        </>
      )}
    </Avatar.Root>
  );
}
