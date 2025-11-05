/**
 * Header component - Top navigation for Limina FIX Analyzer
 */
export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex">
          <a className="mr-6 flex items-center space-x-2" href="/">
            <span className="font-bold text-xl">Limina FIX Analyzer</span>
          </a>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-2">
          <nav className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">
              Production-ready FIX protocol analyzer
            </span>
          </nav>
        </div>
      </div>
    </header>
  );
}
