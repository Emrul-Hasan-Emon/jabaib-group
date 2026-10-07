import { redirect } from 'next/navigation';

// Settings is now a submenu — see /admin/page-settings, shipping-zones,
// system-settings, languages, locations, admin-users.
export default function SettingsPage() {
  redirect('/admin/page-settings');
}