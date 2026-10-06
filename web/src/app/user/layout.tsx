import { UserAuthProvider } from '@/lib/user-auth';

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <UserAuthProvider>{children}</UserAuthProvider>;
}
