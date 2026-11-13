import { Check, ChevronsUpDown, Package, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { StudioProduct } from '@/lib/cardModel';
import { cn } from '@/lib/utils';

interface ProductPickerProps {
  id: string;
  products: StudioProduct[];
  loading: boolean;
  selectedId: string | null;
  selectedName: string | null;
  onSelect: (product: StudioProduct) => void;
  onClear: () => void;
}

export function ProductPicker({
  id,
  products,
  loading,
  selectedId,
  selectedName,
  onSelect,
  onClear,
}: ProductPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return products;
    return products.filter(p =>
      [p.name, p.code, p.family].some(text => text.toLowerCase().includes(needle))
    );
  }, [products, query]);

  return (
    <div className="flex gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="h-10 flex-1 justify-between bg-card px-3 font-normal"
          >
            <span className={cn('flex items-center gap-2 truncate', !selectedName && 'text-muted-foreground')}>
              <Package className="size-4 shrink-0 text-ink-soft" aria-hidden />
              {selectedName ?? (loading ? 'Loading products…' : 'Link a Salesforce product')}
            </span>
            <ChevronsUpDown className="size-4 shrink-0 opacity-50" aria-hidden />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[min(26rem,calc(100vw-2rem))] p-0">
          <div className="border-b border-border p-2">
            <input
              autoFocus
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Search name, code, or family"
              aria-label="Search products"
              className="w-full rounded-md bg-paper px-2.5 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            />
          </div>
          <ul role="listbox" aria-label="Products" className="max-h-72 overflow-y-auto p-1">
            {filtered.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-ink-soft">No active products match.</li>
            )}
            {filtered.map(product => (
              <li key={product.id} role="option" aria-selected={product.id === selectedId}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(product);
                    setOpen(false);
                    setQuery('');
                  }}
                  className="flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left hover:bg-signal-soft"
                >
                  <Check
                    className={cn('size-4 shrink-0 text-signal', product.id !== selectedId && 'invisible')}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{product.name}</span>
                    <span className="block truncate font-mono text-[0.7rem] text-ink-soft">
                      {[product.code, product.family].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </PopoverContent>
      </Popover>
      {selectedId && (
        <Button
          type="button"
          variant="ghost"
          size="icon-lg"
          className="size-10"
          onClick={onClear}
          aria-label="Unlink product"
        >
          <X aria-hidden />
        </Button>
      )}
    </div>
  );
}
