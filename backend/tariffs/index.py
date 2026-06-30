import json
import os
import pg8000.native

SCHEMA = 't_p53856145_cargo_delivery_calcu'

def get_conn():
    dsn = os.environ['DATABASE_URL']
    # dsn format: postgresql://user:pass@host:port/dbname
    from urllib.parse import urlparse
    p = urlparse(dsn)
    return pg8000.native.Connection(
        host=p.hostname,
        port=p.port or 5432,
        database=p.path.lstrip('/'),
        user=p.username,
        password=p.password,
    )

def handler(event: dict, context) -> dict:
    """Получение и сохранение тарифов, маршрутов и диапазонов."""
    cors = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    }

    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': cors, 'body': ''}

    method = event.get('httpMethod', 'GET')

    if method == 'GET':
        conn = get_conn()

        rows = conn.run(f'SELECT id, city, distance, days FROM {SCHEMA}.routes ORDER BY sort_order')
        routes = [{'id': r[0], 'city': r[1], 'distance': r[2], 'days': r[3]} for r in rows]

        rows = conn.run(f'SELECT id, label, min_val, max_val FROM {SCHEMA}.weight_ranges ORDER BY sort_order')
        weight_ranges = [{'id': r[0], 'label': r[1], 'min': float(r[2]), 'max': float(r[3]) if float(r[3]) < 9999998 else 1e9} for r in rows]

        rows = conn.run(f'SELECT id, label, min_val, max_val FROM {SCHEMA}.volume_ranges ORDER BY sort_order')
        volume_ranges = [{'id': r[0], 'label': r[1], 'min': float(r[2]), 'max': float(r[3]) if float(r[3]) < 9999998 else 1e9} for r in rows]

        rows = conn.run(f'SELECT route_id, weight_id, volume_id, price FROM {SCHEMA}.tariff_grid')
        grid = {}
        for route_id, weight_id, volume_id, price in rows:
            if route_id not in grid:
                grid[route_id] = {}
            if weight_id not in grid[route_id]:
                grid[route_id][weight_id] = {}
            grid[route_id][weight_id][volume_id] = price

        conn.close()

        return {
            'statusCode': 200,
            'headers': {**cors, 'Content-Type': 'application/json'},
            'body': json.dumps({'routes': routes, 'weightRanges': weight_ranges, 'volumeRanges': volume_ranges, 'tariffGrid': grid}),
        }

    if method == 'POST':
        body = json.loads(event.get('body') or '{}')
        routes = body.get('routes', [])
        weight_ranges = body.get('weightRanges', [])
        volume_ranges = body.get('volumeRanges', [])
        tariff_grid = body.get('tariffGrid', {})

        conn = get_conn()

        conn.run(f'DELETE FROM {SCHEMA}.routes')
        for i, r in enumerate(routes):
            conn.run(
                f"INSERT INTO {SCHEMA}.routes (id, city, distance, days, sort_order) VALUES (:id, :city, :dist, :days, :ord)",
                id=r['id'], city=r['city'], dist=int(r.get('distance', 0)), days=r['days'], ord=i
            )

        conn.run(f'DELETE FROM {SCHEMA}.weight_ranges')
        for i, w in enumerate(weight_ranges):
            max_val = 9999999 if w['max'] >= 1e8 else w['max']
            conn.run(
                f"INSERT INTO {SCHEMA}.weight_ranges (id, label, min_val, max_val, sort_order) VALUES (:id, :label, :mn, :mx, :ord)",
                id=w['id'], label=w['label'], mn=w['min'], mx=max_val, ord=i
            )

        conn.run(f'DELETE FROM {SCHEMA}.volume_ranges')
        for i, v in enumerate(volume_ranges):
            max_val = 9999999 if v['max'] >= 1e8 else v['max']
            conn.run(
                f"INSERT INTO {SCHEMA}.volume_ranges (id, label, min_val, max_val, sort_order) VALUES (:id, :label, :mn, :mx, :ord)",
                id=v['id'], label=v['label'], mn=v['min'], mx=max_val, ord=i
            )

        conn.run(f'DELETE FROM {SCHEMA}.tariff_grid')
        for route_id, weights in tariff_grid.items():
            for weight_id, volumes in weights.items():
                for volume_id, price in volumes.items():
                    conn.run(
                        f"INSERT INTO {SCHEMA}.tariff_grid (route_id, weight_id, volume_id, price) VALUES (:rid, :wid, :vid, :price)",
                        rid=route_id, wid=weight_id, vid=volume_id, price=int(price or 0)
                    )

        conn.close()

        return {
            'statusCode': 200,
            'headers': {**cors, 'Content-Type': 'application/json'},
            'body': json.dumps({'ok': True}),
        }

    return {'statusCode': 405, 'headers': cors, 'body': 'Method not allowed'}