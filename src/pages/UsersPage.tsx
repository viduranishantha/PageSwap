import { useState, useEffect, useCallback } from 'react';
import { useUserRepository } from '../repositories';
import type { IUser } from '../types/IUser.ts';
import { UserTable } from '../components/UserTable';
import styles from './UsersPage.module.css';
import AddUserDialog from '../components/AddUserDialog';

export function UsersPage() {
  const userRepository = useUserRepository();
  const [users, setUsers] = useState<IUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    try {
      const allUsers = await userRepository.getAll(0, Number.MAX_SAFE_INTEGER);
      setUsers(allUsers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed get users.');
    } finally {
      setLoading(false);
    }
  }, [userRepository]);

  useEffect(() => {
    const getUsers = async () => {
      await loadUsers();
    };

    getUsers();
  }, [loadUsers]);


  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <h1 className={styles.loadingTitle}>User Management</h1>
        <p className={styles.loadingText}>Loading users...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <h1 className={styles.errorTitle}>User Management</h1>
        <p className={styles.errorText}>Error: {error}</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <i className={`fa-solid fa-gear ${styles.userIcon}`}></i>
        <div className={styles.title}>User Management</div>
        <div className={styles.addUser}>
          <AddUserDialog onSuccess={loadUsers} />
        </div>
      </div>

      <div className={styles.tableWrapper}>
        <UserTable users={users} />
      </div>
    </div>
  );
}
