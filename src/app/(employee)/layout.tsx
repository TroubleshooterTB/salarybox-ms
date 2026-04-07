export default function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center">
      <main className="w-full max-w-md min-h-screen bg-slate-950 text-white relative overflow-x-hidden pb-10 shadow-[0_0_80px_rgba(30,58,138,0.2)]">
        {children}
      </main>
    </div>
  );
}
