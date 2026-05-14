import { getRecentNotifications } from '@/lib/dashboard/notification-queries'
import { Topbar } from './Topbar'

/**
 * Server-component wrapper voor Topbar: fetcht recente notificaties en
 * passet ze door zodat het bell-icoon dropdown-content kan tonen zonder
 * dat de client zelf RSC-data hoeft op te halen.
 */
export async function TopbarServer() {
  const notifications = await getRecentNotifications(10)
  return <Topbar notifications={notifications} />
}
