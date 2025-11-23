import { useEffect, useState, useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Cross2Icon } from "@radix-ui/react-icons";
import { CaretUpIcon } from "@radix-ui/react-icons";
import { CaretDownIcon } from "@radix-ui/react-icons";
import styles from './AddUserDialog.module.css';
import { useUserRepository, useImageRepository } from '../repositories';
import { AVATAR_IDS } from '../repositories';
import AvatarPicker from './AvatarPicker';
import { UserAvatar } from './UserAvatar';
import type { IUser } from '../types/IUser';

interface Props {
	onSuccess?: () => void;
}

export default function AddUserDialog({ onSuccess }: Props) {
	const [open, setOpen] = useState(false);
	const [firstName, setFirstName] = useState('');
	const [lastName, setLastName] = useState('');
	const [age, setAge] = useState<string>('');
	const [avatarId, setAvatarId] = useState<string | null>(null);
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [saving, setSaving] = useState(false);
	const [, setSuccess] = useState<string | null>(null);

	const userRepository = useUserRepository();
	const imageRepository = useImageRepository();
	const [imageUrls, setImageUrls] = useState<Record<string, string> | null>(null);
	const [avatarsOpen, setAvatarsOpen] = useState(true);
	const [previewLoading, setPreviewLoading] = useState(false);
	const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
	const previewUrlRef = useRef<string | null>(null);

	function resetForm() {
		setFirstName('');
		setLastName('');
		setAge('');
		setAvatarId(null);
		setErrors({});
		setSaving(false);
		setSuccess(null);
	}

	const previewRequestIdRef = useRef(0);

	async function handleSelectAvatar(id: string) {
		// set selected id immediately so UI reflects choice
		setAvatarId(id);
		setPreviewLoading(true);
		setPreviewImageUrl(null);

		// revoke any previous preview URL
		if (previewUrlRef.current) {
			try { URL.revokeObjectURL(previewUrlRef.current); } catch { /* ignore */ }
			previewUrlRef.current = null;
		}

		const reqId = ++previewRequestIdRef.current;

		try {
			const url = await imageRepository.get(id);
			// if a newer request started, discard this URL
			if (previewRequestIdRef.current !== reqId) {
				try { URL.revokeObjectURL(url); } catch { /* ignore */ }
				return;
			}
			previewUrlRef.current = url;
			setPreviewImageUrl(url);
		} catch {
			// ignore fetch error, keep preview null
		} finally {
			if (previewRequestIdRef.current === reqId) setPreviewLoading(false);
		}
	}

	const validate = () => {
		const e: Record<string, string> = {};
		if (!firstName.trim()) e.firstName = 'First name is required';
		if (!lastName.trim()) e.lastName = 'Last name is required';
		if (age.trim() === '') e.age = 'Age is required';
		else if (Number.isNaN(Number(age)) || Number(age) <= 0) e.age = 'Age must be a number greater than 0';
		if (!avatarId) e.avatar = 'Please select an avatar';
		setErrors(e);
		return Object.keys(e).length === 0;
	};

	const handleSubmit = async (e?: React.FormEvent) => {
		e?.preventDefault();
		if (!validate()) return;

		setSaving(true);
		try {
			let profileImageUrl = '';
			if (avatarId) {
				// Store the resource id (e.g. "avatar1.jpg") instead of a blob URL.
				// The `UserAvatar` component will call `imageRepository.get` when rendering.
				profileImageUrl = avatarId;
			} else {
				profileImageUrl = 'placeholder-dp.png';
			}

			const user: IUser = {
				id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
				firstName: firstName.trim(),
				lastName: lastName.trim(),
				age: age.trim() ? Number(age) : undefined,
				profileImageUrl,
			};

			await userRepository.add(user);
			setSuccess('User added');
			// notify parent page to refresh its list
			try {
				onSuccess?.();
			} catch {
				// ignore errors from parent callback
			}
			// Small delay so user sees success, then close
			setTimeout(() => {
				setOpen(false);
				resetForm();
			}, 600);
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : 'Failed to save user';
			setErrors({ form: message });
		} finally {
			setSaving(false);
		}
	};

	useEffect(() => {
		// Only preload avatars when the avatar grid is opened.
		// This keeps initial load light and lets the open animation run
		// before images are fetched.
		if (!avatarsOpen) return;

		let mounted = true;
		const resources = AVATAR_IDS.map((id) => `${id}.jpg`).concat(['placeholder-dp.png']);
		const loaded: Record<string, string> = {};

		(async () => {
			for (const r of resources) {
				try {
					const url = await imageRepository.get(r);
					loaded[r] = url;
				} catch {
					// ignore single-image failures
				}
			}
			if (mounted) setImageUrls({ ...loaded });
		})();

		return () => {
			mounted = false;
			Object.values(loaded).forEach((u) => {
				try { URL.revokeObjectURL(u); } catch { /* ignore */ }
			});
			// clear the mapping so we don't hold blob URLs when closed
			try { setImageUrls(null); } catch { /* ignore */ }
		};
	}, [imageRepository, avatarsOpen]);

	// cleanup preview blob URL when component unmounts
	useEffect(() => {
		return () => {
			if (previewUrlRef.current) {
				try { URL.revokeObjectURL(previewUrlRef.current); } catch { /* ignore */ }
				previewUrlRef.current = null;
			}
		};
	}, []);

	return (
		<Dialog.Root open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
			<Dialog.Trigger asChild>
				<button type="button" className={styles.rootButton}>Add User</button>
			</Dialog.Trigger>

			<Dialog.Portal>
				<Dialog.Overlay className={styles.overlay} />
				<Dialog.Content className={styles.content} aria-describedby="add-user-dialog">
					<div className={styles.header}>
						<div className={styles.title}>Add User to System</div>
                        <Dialog.Close asChild>
                            <button className={styles.closeButton} aria-label="Close">
                                <Cross2Icon />
                            </button>
                        </Dialog.Close>
					</div>
					<form onSubmit={handleSubmit} className={styles.form} id="add-user-dialog">
						<div className={styles.previewCol}>
							<div className={styles.previewBox}>
								<UserAvatar
									avatarId={avatarId ?? 'placeholder-dp.png'}
												imageUrl={previewImageUrl ?? (avatarId ? imageUrls?.[avatarId] : imageUrls?.['placeholder-dp.png'])}
									size={135}
								/>
											{previewLoading && (
												<div className={styles.previewOverlay}>
													<div className={styles.spinner} />
												</div>
											)}
							</div>
							<button
								type="button"
								className={styles.selectAvatarBtn}
								aria-expanded={avatarsOpen}
								aria-controls="avatar-grid"
								onClick={() => setAvatarsOpen((v) => !v)}
							>
								Select {' '}
								{avatarsOpen ? <CaretUpIcon className={styles.caretIcon} /> : <CaretDownIcon className={styles.caretIcon} />}
							</button>
                        </div>
						<div className={`${styles.loadAvatar} ${avatarsOpen ? styles.open : styles.closed}`} id="avatar-grid" aria-hidden={!avatarsOpen}>
							<div className={styles.fullWidth}>
								<AvatarPicker value={avatarId ?? undefined} onChange={(id) => void handleSelectAvatar(id)} imageUrls={imageUrls} disabled={saving} />
								{errors.avatar && <div className={styles.error}>{errors.avatar}</div>}
							</div>
						</div>

						<div className={styles.field}>
							<label className={styles.label} htmlFor="firstName">First name <span className={styles.requiredText} aria-hidden="true">*</span><span className={styles.srOnly}>(required)</span></label>
							<input id="firstName" className={styles.input} value={firstName} onChange={(ev) => setFirstName(ev.target.value)} disabled={saving} required aria-required="true" />
							{errors.firstName && <div className={styles.error}>{errors.firstName}</div>}
						</div>

						<div className={styles.field}>
							<label className={styles.label} htmlFor="lastName">Last name <span className={styles.requiredText} aria-hidden="true">*</span><span className={styles.srOnly}>(required)</span></label>
							<input id="lastName" className={styles.input} value={lastName} onChange={(ev) => setLastName(ev.target.value)} disabled={saving} required aria-required="true" />
							{errors.lastName && <div className={styles.error}>{errors.lastName}</div>}
						</div>

						<div className={styles.field}>
							<label className={styles.label} htmlFor="age">Age <span className={styles.requiredText} aria-hidden="true">*</span><span className={styles.srOnly}>(required)</span></label>
							<input id="age" className={styles.input} type="number" min={1} value={age} onChange={(ev) => setAge(ev.target.value)} disabled={saving} required aria-required="true" />
							{errors.age && <div className={styles.error}>{errors.age}</div>}
						</div>

						{errors.form && <div className={`${styles.fullWidth} ${styles.error}`}>{errors.form}</div>}

						<div className={styles.actions}>
                            <div className={styles.cancelContainer}>
								<button type="button" className={`${styles.rootButton} ${styles.cancelBtn}`} onClick={() => setOpen(false)} disabled={saving}>
									Cancel
								</button>
							</div>
                            <div className={styles.createContainer}>
								<button type="submit" className={styles.submit} disabled={saving}>
									{saving ? 'Saving...' : 'Create'}
								</button>
							</div>

						</div>
					</form>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
