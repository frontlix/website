import {
  getRecentNotifications,
  getUnreadNotificationCount,
} from '@/lib/dashboard/notification-queries'
import { Topbar } from './Topbar'

/**
 * Server-component wrapper voor Topbar: fetcht recente notificaties +
 * ongelezen-count parallel zodat het bel-icoon direct het juiste badge-
 * getal kan tonen zonder client-side RSC-roundtrip.
 *
 * `limit: 15` voor de dropdown, meer dan we tonen zou pixels kosten
 * zonder mens-meerwaarde.
 */
export async function TopbarServer() {
  const [notifications, unreadCount] = await Promise.all([
    getRecentNotifications(15),
    getUnreadNotificationCount(),
  ])
  return <Topbar notifications={notifications} unreadCount={unreadCount} />
}
