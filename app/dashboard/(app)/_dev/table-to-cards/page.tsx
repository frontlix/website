import { TableToCards } from '@/components/dashboard/ui/TableToCards'

type Row = { id: string; name: string; status: string; m2: number; date: string }

const ROWS: Row[] = [
  { id: '1', name: 'Jan Jansen', status: 'Open', m2: 84, date: '2026-05-20' },
  { id: '2', name: 'Klaas de Vries', status: 'Offerte verstuurd', m2: 120, date: '2026-05-18' },
  { id: '3', name: 'Sophie Bakker', status: 'Afspraak ingepland', m2: 64, date: '2026-05-15' },
]

export default function DevTableToCardsPage() {
  return (
    <div style={{ padding: 24 }}>
      <h1>Dev: TableToCards</h1>
      <TableToCards<Row>
        keyField="id"
        rows={ROWS}
        rowHref={(r) => `/dashboard/_dev/table-to-cards?row=${r.id}`}
        columns={[
          { key: 'name', label: 'Naam', mobile: 'primary' },
          { key: 'status', label: 'Status', mobile: 'primary' },
          { key: 'm2', label: 'm²', mobile: 'secondary', align: 'right' },
          { key: 'date', label: 'Datum', mobile: 'secondary' },
        ]}
      />
    </div>
  )
}
