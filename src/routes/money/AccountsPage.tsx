import { useDatabase } from '@/app/db/useDatabase'
import { NamedEntityManager } from './NamedEntityManager'

export function AccountsPage() {
  const { repos } = useDatabase()
  return (
    <NamedEntityManager
      title="Accounts"
      singular="account"
      icon="🏦"
      emptyLabel="No accounts yet"
      repo={repos.accounts}
    />
  )
}
