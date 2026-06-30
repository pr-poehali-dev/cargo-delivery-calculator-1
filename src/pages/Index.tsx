import { useState, useMemo } from 'react';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';

const HERO_IMG =
  'https://cdn.poehali.dev/projects/44c67291-4a40-49c5-a852-0311e0e1ed35/files/95aefc0c-ad96-4da5-a128-016d00f362fd.jpg';

const ADMIN_PASSWORD = '1234';

type CargoType = {
  id: string;
  label: string;
  icon: string;
  multiplier: number;
};

type Route = {
  id: string;
  city: string;
  distance: number;
  days: string;
};

// Весовые диапазоны
type WeightRange = { id: string; label: string; min: number; max: number };
// Объёмные диапазоны
type VolumeRange = { id: string; label: string; min: number; max: number };
// Ячейка тарифной сетки: [routeId][weightId][volumeId] = цена
type TariffGrid = Record<string, Record<string, Record<string, number>>>;

const initialCargoTypes: CargoType[] = [
  { id: 'general', label: 'Обычный груз', icon: 'Package', multiplier: 1 },
  { id: 'fragile', label: 'Хрупкий', icon: 'PackageOpen', multiplier: 1.3 },
  { id: 'danger', label: 'Опасный', icon: 'TriangleAlert', multiplier: 1.8 },
  { id: 'cold', label: 'Скоропортящийся', icon: 'Snowflake', multiplier: 1.5 },
];

const initialRoutes: Route[] = [
  { id: 'kemerovo', city: 'Кемерово', distance: 270, days: '1 день' },
  { id: 'tomsk', city: 'Томск', distance: 210, days: '1 день' },
  { id: 'barnaul', city: 'Барнаул', distance: 230, days: '1 день' },
  { id: 'kuzbass', city: 'Кузбасс', distance: 300, days: '1–2 дня' },
];

const initialWeightRanges: WeightRange[] = [
  { id: 'w1', label: '0.1–25 кг', min: 0.1, max: 25 },
  { id: 'w2', label: '26–50 кг', min: 26, max: 50 },
  { id: 'w3', label: '51–100 кг', min: 51, max: 100 },
  { id: 'w4', label: '101–250 кг', min: 101, max: 250 },
  { id: 'w5', label: '251–500 кг', min: 251, max: 500 },
  { id: 'w6', label: '501–1000 кг', min: 501, max: 1000 },
  { id: 'w7', label: 'более 1000 кг', min: 1001, max: Infinity },
];

const initialVolumeRanges: VolumeRange[] = [
  { id: 'v1', label: '0.1–0.15 м³', min: 0.1, max: 0.15 },
  { id: 'v2', label: '0.16–0.3 м³', min: 0.16, max: 0.3 },
  { id: 'v3', label: '0.31–0.5 м³', min: 0.31, max: 0.5 },
  { id: 'v4', label: '0.51–1 м³', min: 0.51, max: 1 },
  { id: 'v5', label: '1.01–3 м³', min: 1.01, max: 3 },
  { id: 'v6', label: 'более 3 м³', min: 3.01, max: Infinity },
];

// Генерируем начальную тарифную сетку (примерные цены)
const generateInitialGrid = (routes: Route[], wRanges: WeightRange[], vRanges: VolumeRange[]): TariffGrid => {
  const basePrices: Record<string, number> = {
    kemerovo: 1400, tomsk: 1200, barnaul: 1300, kuzbass: 1600,
  };
  const grid: TariffGrid = {};
  routes.forEach((r) => {
    grid[r.id] = {};
    wRanges.forEach((w, wi) => {
      grid[r.id][w.id] = {};
      vRanges.forEach((v, vi) => {
        const base = basePrices[r.id] ?? 1500;
        grid[r.id][w.id][v.id] = Math.round(base * (1 + wi * 0.15) * (1 + vi * 0.12));
      });
    });
  });
  return grid;
};

const Index = () => {
  const [routes, setRoutes] = useState<Route[]>(initialRoutes);
  const [cargoTypes] = useState<CargoType[]>(initialCargoTypes);
  const [weightRanges, setWeightRanges] = useState<WeightRange[]>(initialWeightRanges);
  const [volumeRanges, setVolumeRanges] = useState<VolumeRange[]>(initialVolumeRanges);
  const [tariffGrid, setTariffGrid] = useState<TariffGrid>(() =>
    generateInitialGrid(initialRoutes, initialWeightRanges, initialVolumeRanges)
  );

  const [routeId, setRouteId] = useState('kemerovo');
  const [cargoId, setCargoId] = useState('general');
  const [weight, setWeight] = useState('15');
  const [volume, setVolume] = useState('0.12');

  const [adminOpen, setAdminOpen] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [passInput, setPassInput] = useState('');
  const [adminTab, setAdminTab] = useState<'routes' | 'grid' | 'ranges'>('grid');
  const [adminRouteId, setAdminRouteId] = useState('kemerovo');

  // Найти диапазон по значению
  const findWeightRange = (w: number) =>
    weightRanges.find((r) => w >= r.min && w <= r.max);
  const findVolumeRange = (v: number) =>
    volumeRanges.find((r) => v >= r.min && v <= r.max);

  const result = useMemo(() => {
    const cargo = cargoTypes.find((c) => c.id === cargoId);
    if (!cargo) return null;
    const w = parseFloat(weight) || 0;
    const v = parseFloat(volume) || 0;
    const wr = findWeightRange(w);
    const vr = findVolumeRange(v);
    if (!wr || !vr) return null;
    const price = tariffGrid[routeId]?.[wr.id]?.[vr.id];
    if (!price) return null;
    return Math.round(price * cargo.multiplier);
  }, [tariffGrid, routeId, cargoId, weight, volume, weightRanges, volumeRanges, cargoTypes]);

  const selectedRoute = routes.find((r) => r.id === routeId);

  const updateTariffCell = (routeId: string, wId: string, vId: string, value: string) => {
    setTariffGrid((prev) => ({
      ...prev,
      [routeId]: {
        ...prev[routeId],
        [wId]: {
          ...prev[routeId]?.[wId],
          [vId]: Number(value) || 0,
        },
      },
    }));
  };

  const updateRoute = (id: string, field: keyof Route, value: string) => {
    setRoutes((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, [field]: field === 'city' || field === 'days' ? value : Number(value) }
          : r
      )
    );
  };

  const addRoute = () => {
    const newId = `route_${Date.now()}`;
    const newRoute: Route = { id: newId, city: 'Новый город', distance: 0, days: '1 день' };
    setRoutes((prev) => [...prev, newRoute]);
    // Добавляем строки в сетку
    const newGrid = { ...tariffGrid, [newId]: {} };
    weightRanges.forEach((w) => {
      newGrid[newId][w.id] = {};
      volumeRanges.forEach((v) => { newGrid[newId][w.id][v.id] = 0; });
    });
    setTariffGrid(newGrid);
  };

  const deleteRoute = (id: string) => {
    setRoutes((prev) => prev.filter((r) => r.id !== id));
    if (routeId === id) setRouteId(routes.find((r) => r.id !== id)?.id || '');
    const newGrid = { ...tariffGrid };
    delete newGrid[id];
    setTariffGrid(newGrid);
  };

  const addWeightRange = () => {
    const newId = `w_${Date.now()}`;
    const newWr: WeightRange = { id: newId, label: 'Новый диапазон', min: 0, max: 0 };
    setWeightRanges((prev) => [...prev, newWr]);
    const newGrid = { ...tariffGrid };
    routes.forEach((r) => {
      if (!newGrid[r.id]) newGrid[r.id] = {};
      newGrid[r.id][newId] = {};
      volumeRanges.forEach((v) => { newGrid[r.id][newId][v.id] = 0; });
    });
    setTariffGrid(newGrid);
  };

  const addVolumeRange = () => {
    const newId = `v_${Date.now()}`;
    const newVr: VolumeRange = { id: newId, label: 'Новый диапазон', min: 0, max: 0 };
    setVolumeRanges((prev) => [...prev, newVr]);
    const newGrid = { ...tariffGrid };
    routes.forEach((r) => {
      if (!newGrid[r.id]) newGrid[r.id] = {};
      weightRanges.forEach((w) => {
        if (!newGrid[r.id][w.id]) newGrid[r.id][w.id] = {};
        newGrid[r.id][w.id][newId] = 0;
      });
    });
    setTariffGrid(newGrid);
  };

  const deleteWeightRange = (id: string) => {
    setWeightRanges((prev) => prev.filter((w) => w.id !== id));
  };

  const deleteVolumeRange = (id: string) => {
    setVolumeRanges((prev) => prev.filter((v) => v.id !== id));
  };

  const updateWeightRange = (id: string, field: keyof WeightRange, value: string) => {
    setWeightRanges((prev) =>
      prev.map((w) =>
        w.id === id ? { ...w, [field]: field === 'label' ? value : Number(value) } : w
      )
    );
  };

  const updateVolumeRange = (id: string, field: keyof VolumeRange, value: string) => {
    setVolumeRanges((prev) =>
      prev.map((v) =>
        v.id === id ? { ...v, [field]: field === 'label' ? value : Number(value) } : v
      )
    );
  };

  const nav = [
    { label: 'Калькулятор', href: '#calc' },
    { label: 'Маршруты', href: '#routes' },
    { label: 'Тарифы', href: '#tariffs' },
    { label: 'О компании', href: '#about' },
    { label: 'Контакты', href: '#contacts' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* HEADER */}
      <header className="fixed top-0 inset-x-0 z-50 bg-background/85 backdrop-blur-md border-b border-border">
        <div className="container flex items-center justify-between h-16">
          <a href="#top" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-accent flex items-center justify-center rounded">
              <Icon name="Truck" size={20} className="text-accent-foreground" />
            </div>
            <span className="font-display font-700 text-xl tracking-tight">
              Меркурий-Авто <span className="text-accent">ГТК</span>
            </span>
          </a>
          <nav className="hidden md:flex items-center gap-8">
            {nav.map((n) => (
              <a
                key={n.href}
                href={n.href}
                className="text-sm font-500 text-muted-foreground hover:text-foreground transition-colors"
              >
                {n.label}
              </a>
            ))}
          </nav>
          <a href="tel:+73833103868" className="hidden sm:flex items-center gap-2 text-sm font-600">
            <Icon name="Phone" size={16} className="text-accent" />
            8 383 310-38-68
          </a>
        </div>
      </header>

      {/* HERO */}
      <section id="top" className="relative pt-16 min-h-[88vh] flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <img src={HERO_IMG} alt="Грузоперевозки" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-primary/95 via-primary/80 to-primary/40" />
        </div>
        <div className="container relative z-10 py-20">
          <div className="max-w-2xl animate-fade-in">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-6 bg-accent/15 border border-accent/30 rounded-full">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-xs font-600 uppercase tracking-wider text-accent-foreground/90">
                Грузоперевозки по Сибири
              </span>
            </div>
            <h1 className="font-display font-700 text-5xl md:text-7xl leading-[0.95] text-primary-foreground mb-6">
              Доставим груз<br />из Новосибирска<br />
              <span className="text-accent">точно в срок</span>
            </h1>
            <p className="text-lg text-primary-foreground/80 mb-8 max-w-lg">
              Кемерово · Томск · Барнаул · Кузбасс. Прозрачный расчёт стоимости
              по весу, объёму и характеру груза.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground font-600 h-14 px-8 text-base">
                <a href="#calc">
                  <Icon name="Calculator" size={20} className="mr-2" />
                  Рассчитать доставку
                </a>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-14 px-8 text-base bg-transparent border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground hover:text-primary font-600">
                <a href="#routes">Наши маршруты</a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="border-b border-border bg-card">
        <div className="container grid grid-cols-2 md:grid-cols-4 divide-x divide-border">
          {[
            { v: '12 лет', l: 'на рынке логистики' },
            { v: '4 региона', l: 'постоянных маршрутов' },
            { v: '24/7', l: 'приём заявок' },
            { v: '99.6%', l: 'доставок вовремя' },
          ].map((s, i) => (
            <div key={i} className="py-8 px-4 text-center">
              <div className="font-display font-700 text-3xl md:text-4xl text-foreground">{s.v}</div>
              <div className="text-sm text-muted-foreground mt-1">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CALCULATOR */}
      <section id="calc" className="py-24 grid-texture">
        <div className="container">
          <div className="max-w-2xl mb-12">
            <div className="text-accent font-600 text-sm uppercase tracking-wider mb-3">Калькулятор</div>
            <h2 className="font-display font-700 text-4xl md:text-5xl mb-4">Расчёт стоимости доставки</h2>
            <p className="text-muted-foreground text-lg">
              Укажите параметры груза — система подберёт тариф по весовому и объёмному диапазону.
            </p>
          </div>

          <div className="grid lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3 bg-card border border-border rounded-2xl p-8 space-y-8">
              {/* route */}
              <div>
                <Label className="font-600 mb-3 block">Направление</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {routes.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setRouteId(r.id)}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${
                        routeId === r.id ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/40'
                      }`}
                    >
                      <div className="font-600 text-sm">{r.city}</div>
                      <div className="text-xs text-muted-foreground">{r.distance} км</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* cargo type */}
              <div>
                <Label className="font-600 mb-3 block">Характер груза</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {cargoTypes.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setCargoId(c.id)}
                      className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1.5 transition-all ${
                        cargoId === c.id ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/40'
                      }`}
                    >
                      <Icon name={c.icon} size={22} className={cargoId === c.id ? 'text-accent' : 'text-muted-foreground'} />
                      <span className="text-xs font-500 text-center leading-tight">{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* weight & volume */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="weight" className="font-600 mb-2 block">Вес, кг</Label>
                  <Input id="weight" type="number" value={weight} onChange={(e) => setWeight(e.target.value)} className="h-12 text-lg" />
                  {weight && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Диапазон: <span className="font-600 text-foreground">{findWeightRange(parseFloat(weight))?.label ?? '—'}</span>
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="volume" className="font-600 mb-2 block">Объём, м³</Label>
                  <Input id="volume" type="number" step="0.01" value={volume} onChange={(e) => setVolume(e.target.value)} className="h-12 text-lg" />
                  {volume && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Диапазон: <span className="font-600 text-foreground">{findVolumeRange(parseFloat(volume))?.label ?? '—'}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* result */}
            <div className="lg:col-span-2 bg-primary text-primary-foreground rounded-2xl p-8 flex flex-col">
              <div className="text-primary-foreground/60 text-sm uppercase tracking-wider mb-2">Стоимость доставки</div>
              <div className="font-display font-700 text-5xl mb-1 text-accent">
                {result !== null ? `${result.toLocaleString('ru-RU')} ₽` : '—'}
              </div>
              <div className="text-primary-foreground/60 text-sm mb-8">
                Новосибирск → {selectedRoute?.city}
              </div>
              {result === null && (
                <p className="text-xs text-primary-foreground/50 mb-4">
                  Введите вес и объём в пределах доступных диапазонов
                </p>
              )}
              <div className="space-y-3 text-sm border-t border-primary-foreground/15 pt-6 mb-8">
                <div className="flex justify-between">
                  <span className="text-primary-foreground/60">Весовой диапазон</span>
                  <span className="font-600">{findWeightRange(parseFloat(weight))?.label ?? '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-primary-foreground/60">Объёмный диапазон</span>
                  <span className="font-600">{findVolumeRange(parseFloat(volume))?.label ?? '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-primary-foreground/60">Срок доставки</span>
                  <span className="font-600">{selectedRoute?.days}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-primary-foreground/60">Тип груза</span>
                  <span className="font-600">{cargoTypes.find((c) => c.id === cargoId)?.label}</span>
                </div>
              </div>
              <Button
                onClick={() => toast({ title: 'Заявка отправлена!', description: 'Менеджер свяжется с вами для подтверждения.' })}
                className="mt-auto bg-accent hover:bg-accent/90 text-accent-foreground font-600 h-12"
              >
                Оформить заявку
              </Button>
              <p className="text-xs text-primary-foreground/50 text-center mt-3">
                Расчёт предварительный, итог уточняет менеджер
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ROUTES */}
      <section id="routes" className="py-24 bg-card border-y border-border">
        <div className="container">
          <div className="flex items-end justify-between flex-wrap gap-4 mb-12">
            <div>
              <div className="text-accent font-600 text-sm uppercase tracking-wider mb-3">География</div>
              <h2 className="font-display font-700 text-4xl md:text-5xl">Маршруты доставки</h2>
            </div>
            <p className="text-muted-foreground max-w-sm">
              Регулярные рейсы из Новосибирска по ключевым направлениям Сибири.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {routes.map((r) => (
              <div key={r.id} className="group bg-background border border-border rounded-2xl p-6 hover:border-accent transition-all hover:-translate-y-1">
                <div className="flex items-center justify-between mb-6">
                  <Icon name="MapPin" size={24} className="text-accent" />
                  <span className="text-xs font-600 px-2 py-1 bg-secondary rounded-full">{r.days}</span>
                </div>
                <div className="text-sm text-muted-foreground mb-1">Новосибирск →</div>
                <div className="font-display font-700 text-2xl mb-4">{r.city}</div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Icon name="Route" size={15} />
                  {r.distance} км
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TARIFFS */}
      <section id="tariffs" className="py-24">
        <div className="container">
          <div className="flex items-end justify-between flex-wrap gap-4 mb-12">
            <div>
              <div className="text-accent font-600 text-sm uppercase tracking-wider mb-3">Прайс-лист</div>
              <h2 className="font-display font-700 text-4xl md:text-5xl">Тарифы и цены</h2>
              <p className="text-muted-foreground mt-2">Стоимость в рублях · Новосибирск → город</p>
            </div>

            {/* ADMIN DIALOG */}
            <Dialog open={adminOpen} onOpenChange={(o) => { setAdminOpen(o); if (!o) { setAuthorized(false); setPassInput(''); } }}>
              <DialogTrigger asChild>
                <Button variant="outline" className="font-600">
                  <Icon name="Lock" size={16} className="mr-2" />
                  Панель редактирования
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-5xl w-full">
                <DialogHeader>
                  <DialogTitle className="font-display text-2xl">
                    {authorized ? 'Редактирование тарифов' : 'Вход для сотрудников'}
                  </DialogTitle>
                </DialogHeader>
                {!authorized ? (
                  <div className="py-4 space-y-4 max-w-sm">
                    <p className="text-sm text-muted-foreground">Введите пароль для управления тарифами и маршрутами.</p>
                    <Input
                      type="password"
                      placeholder="Пароль (по умолчанию 1234)"
                      value={passInput}
                      onChange={(e) => setPassInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (passInput === ADMIN_PASSWORD ? setAuthorized(true) : toast({ title: 'Неверный пароль', variant: 'destructive' }))}
                      className="h-12"
                    />
                    <Button
                      className="w-full h-12 bg-accent hover:bg-accent/90 text-accent-foreground font-600"
                      onClick={() => passInput === ADMIN_PASSWORD ? setAuthorized(true) : toast({ title: 'Неверный пароль', variant: 'destructive' })}
                    >
                      Войти
                    </Button>
                  </div>
                ) : (
                  <div className="py-2">
                    {/* Вкладки панели */}
                    <div className="flex gap-2 mb-6 border-b border-border">
                      {([
                        { id: 'grid', label: 'Тарифная сетка', icon: 'Table' },
                        { id: 'routes', label: 'Маршруты', icon: 'MapPin' },
                        { id: 'ranges', label: 'Диапазоны', icon: 'SlidersHorizontal' },
                      ] as { id: 'grid' | 'routes' | 'ranges'; label: string; icon: string }[]).map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setAdminTab(t.id)}
                          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-600 border-b-2 -mb-px transition-colors ${
                            adminTab === t.id ? 'border-accent text-accent' : 'border-transparent text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <Icon name={t.icon} size={15} />
                          {t.label}
                        </button>
                      ))}
                    </div>

                    {/* --- Вкладка: Тарифная сетка --- */}
                    {adminTab === 'grid' && (
                      <div className="space-y-4">
                        {/* Выбор маршрута */}
                        <div className="flex gap-2 flex-wrap">
                          {routes.map((r) => (
                            <button
                              key={r.id}
                              onClick={() => setAdminRouteId(r.id)}
                              className={`px-3 py-1.5 rounded-lg text-sm font-600 border-2 transition-all ${
                                adminRouteId === r.id ? 'border-accent bg-accent/5 text-accent' : 'border-border text-muted-foreground hover:border-accent/40'
                              }`}
                            >
                              {r.city}
                            </button>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground">Редактируйте цены (₽) для маршрута <b>Новосибирск → {routes.find(r => r.id === adminRouteId)?.city}</b></p>
                        <div className="overflow-auto max-h-[50vh] border border-border rounded-xl">
                          <table className="text-sm w-full">
                            <thead className="sticky top-0 bg-secondary z-10">
                              <tr>
                                <th className="p-2 text-left font-600 text-xs border-r border-border min-w-[110px]">Вес \ Объём</th>
                                {volumeRanges.map((v) => (
                                  <th key={v.id} className="p-2 text-center font-600 text-xs min-w-[90px] border-r border-border last:border-r-0">{v.label}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {weightRanges.map((w) => (
                                <tr key={w.id} className="border-t border-border">
                                  <td className="p-2 font-600 text-xs bg-secondary/50 border-r border-border">{w.label}</td>
                                  {volumeRanges.map((v) => (
                                    <td key={v.id} className="p-1 border-r border-border last:border-r-0">
                                      <input
                                        type="number"
                                        value={tariffGrid[adminRouteId]?.[w.id]?.[v.id] ?? 0}
                                        onChange={(e) => updateTariffCell(adminRouteId, w.id, v.id, e.target.value)}
                                        className="w-full h-8 px-2 text-center text-sm border border-border rounded-md bg-background focus:outline-none focus:border-accent"
                                      />
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <p className="text-xs text-muted-foreground">Цены применяются к характеру груза умножением на коэффициент.</p>
                      </div>
                    )}

                    {/* --- Вкладка: Маршруты --- */}
                    {adminTab === 'routes' && (
                      <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                        {routes.map((r) => (
                          <div key={r.id} className="border border-border rounded-xl p-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
                              <div>
                                <Label className="text-xs">Город</Label>
                                <Input value={r.city} onChange={(e) => updateRoute(r.id, 'city', e.target.value)} className="h-10" />
                              </div>
                              <div>
                                <Label className="text-xs">Км</Label>
                                <Input type="number" value={r.distance} onChange={(e) => updateRoute(r.id, 'distance', e.target.value)} className="h-10" />
                              </div>
                              <div>
                                <Label className="text-xs">Срок</Label>
                                <Input value={r.days} onChange={(e) => updateRoute(r.id, 'days', e.target.value)} className="h-10" />
                              </div>
                              <button
                                onClick={() => deleteRoute(r.id)}
                                className="h-10 w-10 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:border-destructive hover:text-destructive transition-colors"
                              >
                                <Icon name="Trash2" size={16} />
                              </button>
                            </div>
                          </div>
                        ))}
                        <Button onClick={addRoute} variant="outline" className="w-full h-10 border-dashed font-600 text-accent border-accent/40 hover:bg-accent/5">
                          <Icon name="Plus" size={16} className="mr-2" />
                          Добавить маршрут
                        </Button>
                      </div>
                    )}

                    {/* --- Вкладка: Диапазоны --- */}
                    {adminTab === 'ranges' && (
                      <div className="grid md:grid-cols-2 gap-6 max-h-[50vh] overflow-y-auto pr-1">
                        {/* Весовые */}
                        <div>
                          <p className="font-600 text-sm mb-3 flex items-center gap-2">
                            <Icon name="Weight" size={15} className="text-accent" />
                            Весовые диапазоны (кг)
                          </p>
                          <div className="space-y-2">
                            {weightRanges.map((w) => (
                              <div key={w.id} className="flex gap-2 items-center">
                                <Input value={w.label} onChange={(e) => updateWeightRange(w.id, 'label', e.target.value)} className="h-9 flex-1 text-xs" placeholder="Название" />
                                <button
                                  onClick={() => deleteWeightRange(w.id)}
                                  className="h-9 w-9 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:border-destructive hover:text-destructive transition-colors shrink-0"
                                >
                                  <Icon name="X" size={14} />
                                </button>
                              </div>
                            ))}
                            <Button onClick={addWeightRange} variant="outline" className="w-full h-9 border-dashed text-xs font-600 text-accent border-accent/40 hover:bg-accent/5">
                              <Icon name="Plus" size={14} className="mr-1" />
                              Добавить диапазон
                            </Button>
                          </div>
                        </div>
                        {/* Объёмные */}
                        <div>
                          <p className="font-600 text-sm mb-3 flex items-center gap-2">
                            <Icon name="Box" size={15} className="text-accent" />
                            Объёмные диапазоны (м³)
                          </p>
                          <div className="space-y-2">
                            {volumeRanges.map((v) => (
                              <div key={v.id} className="flex gap-2 items-center">
                                <Input value={v.label} onChange={(e) => updateVolumeRange(v.id, 'label', e.target.value)} className="h-9 flex-1 text-xs" placeholder="Название" />
                                <button
                                  onClick={() => deleteVolumeRange(v.id)}
                                  className="h-9 w-9 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:border-destructive hover:text-destructive transition-colors shrink-0"
                                >
                                  <Icon name="X" size={14} />
                                </button>
                              </div>
                            ))}
                            <Button onClick={addVolumeRange} variant="outline" className="w-full h-9 border-dashed text-xs font-600 text-accent border-accent/40 hover:bg-accent/5">
                              <Icon name="Plus" size={14} className="mr-1" />
                              Добавить диапазон
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>

          {/* Публичная тарифная сетка — по вкладкам городов */}
          <div className="space-y-4">
            <div className="flex gap-2 flex-wrap border-b border-border pb-2">
              {routes.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setAdminRouteId(r.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-600 transition-all ${
                    adminRouteId === r.id ? 'bg-accent text-accent-foreground' : 'bg-secondary text-foreground hover:bg-secondary/70'
                  }`}
                >
                  {r.city}
                </button>
              ))}
            </div>

            <div className="overflow-x-auto border border-border rounded-2xl">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-secondary">
                    <th className="p-3 text-left font-600 border-r border-border">Вес \ Объём</th>
                    {volumeRanges.map((v) => (
                      <th key={v.id} className="p-3 text-center font-600 border-r border-border last:border-r-0 text-xs">{v.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {weightRanges.map((w) => (
                    <tr key={w.id} className="border-t border-border hover:bg-secondary/30 transition-colors">
                      <td className="p-3 font-600 text-xs bg-secondary/40 border-r border-border">{w.label}</td>
                      {volumeRanges.map((v) => {
                        const price = tariffGrid[adminRouteId]?.[w.id]?.[v.id];
                        return (
                          <td key={v.id} className="p-3 text-center border-r border-border last:border-r-0">
                            <span className="text-accent font-600">{price ? price.toLocaleString('ru-RU') + ' ₽' : '—'}</span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">
              Новосибирск → <b>{routes.find(r => r.id === adminRouteId)?.city}</b> · Для хрупкого ×1.3, скоропортящегося ×1.5, опасного ×1.8
            </p>
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="py-24 bg-primary text-primary-foreground">
        <div className="container grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="text-accent font-600 text-sm uppercase tracking-wider mb-3">О компании</div>
            <h2 className="font-display font-700 text-4xl md:text-5xl mb-6">
              Логистика, на которую можно положиться
            </h2>
            <p className="text-primary-foreground/70 text-lg mb-8">
              Меркурий-Авто ГТК — транспортная компания из Новосибирска, специализирующаяся на
              автогрузоперевозках по Сибирскому региону. Собственный автопарк,
              опытные водители и страхование каждого груза.
            </p>
            <div className="space-y-4">
              {[
                'Собственный автопарк и контроль на каждом этапе',
                'Страхование грузов и полная материальная ответственность',
                'Прозрачные тарифы без скрытых платежей',
              ].map((t, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Icon name="CircleCheck" size={22} className="text-accent shrink-0 mt-0.5" />
                  <span className="text-primary-foreground/85">{t}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-5">
            {[
              { icon: 'ShieldCheck', t: 'Страховка груза', d: 'на всю стоимость' },
              { icon: 'Clock', t: 'Точно в срок', d: '99.6% доставок' },
              { icon: 'Truck', t: 'Свой автопарк', d: 'от 1 до 20 тонн' },
              { icon: 'Headset', t: 'Поддержка 24/7', d: 'на связи всегда' },
            ].map((f, i) => (
              <div key={i} className="bg-primary-foreground/5 border border-primary-foreground/10 rounded-2xl p-6">
                <Icon name={f.icon} size={28} className="text-accent mb-4" />
                <div className="font-600 text-lg">{f.t}</div>
                <div className="text-primary-foreground/60 text-sm">{f.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CONTACTS */}
      <section id="contacts" className="py-24">
        <div className="container grid lg:grid-cols-2 gap-16">
          <div>
            <div className="text-accent font-600 text-sm uppercase tracking-wider mb-3">Контакты</div>
            <h2 className="font-display font-700 text-4xl md:text-5xl mb-8">Свяжитесь с нами</h2>
            <div className="space-y-5">
              {[
                { icon: 'Phone', l: 'Телефон', v: '8 383 310-38-68 · 8-983-310-38-68 · 8-913-893-26-24' },
                { icon: 'Mail', l: 'Почта', v: 'merkury-avto@mail.ru' },
                { icon: 'MapPin', l: 'Адрес', v: 'г. Новосибирск, Троллейная, 87' },
                { icon: 'Clock', l: 'Режим', v: 'Приём заявок 24/7' },
              ].map((c, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                    <Icon name={c.icon} size={20} className="text-accent" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">{c.l}</div>
                    <div className="font-600">{c.v}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              toast({ title: 'Заявка отправлена!', description: 'Мы перезвоним вам в ближайшее время.' });
              (e.target as HTMLFormElement).reset();
            }}
            className="bg-card border border-border rounded-2xl p-8 space-y-4"
          >
            <h3 className="font-display font-700 text-2xl mb-2">Обратная связь</h3>
            <div>
              <Label className="font-600 mb-2 block">Имя</Label>
              <Input required placeholder="Ваше имя" className="h-12" />
            </div>
            <div>
              <Label className="font-600 mb-2 block">Телефон</Label>
              <Input required type="tel" placeholder="+7 (___) ___-__-__" className="h-12" />
            </div>
            <div>
              <Label className="font-600 mb-2 block">Сообщение</Label>
              <Textarea placeholder="Опишите груз и направление" rows={4} />
            </div>
            <Button type="submit" className="w-full h-12 bg-accent hover:bg-accent/90 text-accent-foreground font-600">
              Отправить заявку
            </Button>
          </form>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-primary text-primary-foreground/70 py-10 border-t border-primary-foreground/10">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-accent flex items-center justify-center rounded">
              <Icon name="Truck" size={18} className="text-accent-foreground" />
            </div>
            <span className="font-display font-700 text-lg text-primary-foreground">
              Меркурий-Авто <span className="text-accent">ГТК</span>
            </span>
          </div>
          <p className="text-sm">© 2026 Меркурий-Авто ГТК. Автогрузоперевозки по Сибири.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
