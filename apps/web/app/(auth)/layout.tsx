export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Minimal layout - let pages control their own full-page design
  return <>{children}</>;
}
