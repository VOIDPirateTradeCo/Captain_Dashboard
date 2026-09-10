# Torus POS — Point of Sale Service for Torus Coffee Company
# Deploy on PINKCADY Docker Desktop
# Exposes: GET /health, GET /api/orders, POST /api/orders

from flask import Flask, request, jsonify
import sqlite3
import os
from pathlib import Path

app = Flask(__name__)

DB_PATH = os.environ.get('TORUS_POS_DB', str(Path(__file__).parent / 'data' / 'torus-pos.db'))
API_KEY = os.environ.get('POS_API_KEY', 'torus-pos-default-key-change-me')


def get_db():
    db = sqlite3.connect(DB_PATH)
    db.row_factory = sqlite3.Row
    return db


def init_db():
    db = get_db()
    db.execute('''
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            item TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            price REAL NOT NULL,
            total REAL NOT NULL,
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    db.commit()
    db.close()


def require_api_key():
    key = request.headers.get('x-pos-api-key') or request.headers.get('authorization', '').replace('Bearer ', '')
    if key != API_KEY:
        return False
    return True


@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'service': 'torus-pos', 'version': '1.0.0'})


with app.app_context():
    init_db()


@app.route('/api/orders', methods=['GET'])
def list_orders():
    if not require_api_key():
        return jsonify({'error': 'Unauthorized'}), 401
    db = get_db()
    orders = db.execute('SELECT * FROM orders ORDER BY created_at DESC LIMIT 100').fetchall()
    db.close()
    return jsonify([dict(o) for o in orders])


@app.route('/api/orders', methods=['POST'])
def create_order():
    if not require_api_key():
        return jsonify({'error': 'Unauthorized'}), 401
    data = request.get_json()
    if not data:
        return jsonify({'error': 'JSON body required'}), 400
    
    item = data.get('item')
    quantity = data.get('quantity', 1)
    price = data.get('price', 0.0)
    
    if not item:
        return jsonify({'error': 'item is required'}), 400
    
    total = float(quantity) * float(price)
    
    db = get_db()
    cursor = db.execute(
        'INSERT INTO orders (item, quantity, price, total, status) VALUES (?, ?, ?, ?, ?)',
        (item, quantity, price, total, 'pending')
    )
    db.commit()
    order_id = cursor.lastrowid
    db.close()
    
    return jsonify({
        'id': order_id,
        'item': item,
        'quantity': quantity,
        'price': price,
        'total': total,
        'status': 'pending'
    }), 201


@app.route('/api/orders/<int:order_id>', methods=['GET'])
def get_order(order_id):
    if not require_api_key():
        return jsonify({'error': 'Unauthorized'}), 401
    db = get_db()
    order = db.execute('SELECT * FROM orders WHERE id = ?', (order_id,)).fetchone()
    db.close()
    if not order:
        return jsonify({'error': 'Order not found'}), 404
    return jsonify(dict(order))


@app.route('/api/orders/<int:order_id>', methods=['PUT'])
def update_order(order_id):
    if not require_api_key():
        return jsonify({'error': 'Unauthorized'}), 401
    data = request.get_json()
    db = get_db()
    order = db.execute('SELECT * FROM orders WHERE id = ?', (order_id,)).fetchone()
    if not order:
        db.close()
        return jsonify({'error': 'Order not found'}), 404
    
    status = data.get('status', order['status'])
    db.execute('UPDATE orders SET status = ? WHERE id = ?', (status, order_id))
    db.commit()
    db.close()
    return jsonify({'id': order_id, 'status': status})


if __name__ == '__main__':
    Path(DB_PATH).parent.mkdir(parents=True, exist_ok=True)
    init_db()
    print(f'Torus POS starting on port 3100')
    print(f'DB: {DB_PATH}')
    app.run(host='0.0.0.0', port=3100, debug=False)
