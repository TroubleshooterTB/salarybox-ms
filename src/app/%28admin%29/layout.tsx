export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <main className="flex-1 w-full bg-slate-50 relative overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
