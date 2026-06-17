import { useCallback, useEffect, useState } from 'react'

import { deleteUser, fetchUsers, updateUser } from '../services/parkingApi'
import type { User, UserRole } from '../types'

export function UserManagementPanel() {
  const [users, setUsers] = useState<User[]>([])
  const [message, setMessage] = useState<string | null>(null)

  const loadUsers = useCallback(async () => {
    try {
      const data = await fetchUsers()
      setUsers(data)
    } catch {
      setMessage('Unable to load users.')
    }
  }, [])

  useEffect(() => {
    void loadUsers()
  }, [loadUsers])

  async function handleRoleChange(userId: string, role: UserRole) {
    setMessage(null)
    try {
      await updateUser(userId, { role })
      setMessage('User updated.')
      await loadUsers()
    } catch {
      setMessage('Unable to update user.')
    }
  }

  async function handleDelete(userId: string) {
    setMessage(null)
    try {
      await deleteUser(userId)
      setMessage('User deleted.')
      await loadUsers()
    } catch {
      setMessage('Unable to delete user.')
    }
  }

  return (
    <div>
      {message ? <p className="mb-3 text-sm text-emerald-300">{message}</p> : null}
      <div className="space-y-2">
        {users.map((user) => (
          <div
            key={user.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm"
          >
            <div>
              <p className="font-medium text-white">{user.full_name ?? user.email}</p>
              <p className="text-slate-400">{user.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={user.role}
                onChange={(event) =>
                  void handleRoleChange(user.id, event.target.value as UserRole)
                }
                className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs"
              >
                <option value="DRIVER">DRIVER</option>
                <option value="MANAGEMENT">MANAGEMENT</option>
              </select>
              <button
                type="button"
                onClick={() => void handleDelete(user.id)}
                className="rounded-lg border border-rose-500/40 px-2 py-1 text-xs text-rose-300 hover:bg-rose-500/10"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
