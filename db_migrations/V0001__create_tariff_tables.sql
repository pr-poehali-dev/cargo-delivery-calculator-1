
CREATE TABLE t_p53856145_cargo_delivery_calcu.routes (
  id TEXT PRIMARY KEY,
  city TEXT NOT NULL,
  distance INTEGER NOT NULL DEFAULT 0,
  days TEXT NOT NULL DEFAULT '1 день',
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE t_p53856145_cargo_delivery_calcu.weight_ranges (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  min_val NUMERIC NOT NULL,
  max_val NUMERIC NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE t_p53856145_cargo_delivery_calcu.volume_ranges (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  min_val NUMERIC NOT NULL,
  max_val NUMERIC NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE t_p53856145_cargo_delivery_calcu.tariff_grid (
  route_id TEXT NOT NULL,
  weight_id TEXT NOT NULL,
  volume_id TEXT NOT NULL,
  price INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (route_id, weight_id, volume_id)
);
