import styles from './AddUserDialog.module.css';
import { AVATAR_IDS } from '../repositories';
import { UserAvatar } from './UserAvatar';

interface AvatarPickerProps {
  value?: string | null; // expects resource string like '<id>.jpg'
  onChange: (id: string) => void; // will be passed resource string
  imageUrls?: Record<string, string> | null; // optional preloaded blob URLs keyed by resource
  disabled?: boolean;
}

export default function AvatarPicker({ value, onChange, imageUrls = null, disabled = false }: AvatarPickerProps) {
  return (
    <div className={styles.avatarPickerContainer}>
        <hr className={styles.divider} />
        <label className={styles.label}>Available Avatars</label>
        <div className={styles.avatarGrid} role="list">
        {AVATAR_IDS.map((id) => {
            const resource = `${id}.jpg`;
            return (
            <button
                key={resource}
                type="button"
                className={styles.avatarButton}
                aria-pressed={value === resource}
                onClick={() => !disabled && onChange(resource)}
                title="Select avatar"
                disabled={disabled}
            >
                <UserAvatar avatarId={resource} imageUrl={imageUrls ? imageUrls[resource] : undefined} size={60} />
            </button>
            );
        })}
        </div>
    </div>
  );
}
