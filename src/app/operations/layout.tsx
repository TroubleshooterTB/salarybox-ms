export default function OperationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 text-slate-900 font-sans antialiased selection:bg-gray-200">
      {children}
    </div>
  );
}
