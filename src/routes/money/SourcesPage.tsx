import { useDatabase } from '@/app/db/useDatabase'
import { NamedEntityManager } from './NamedEntityManager'

export function SourcesPage() {
  const { repos } = useDatabase()
  return (
    <NamedEntityManager
      title="Sources"
      singular="source"
      icon="💼"
      emptyLabel="No income sources yet"
      repo={repos.sources}
    />
  )
}
