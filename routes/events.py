from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database.db import execute_query
from utils.helpers import save_file, generate_ticket_code, generate_qr_code
from datetime import datetime

bp = Blueprint('events', __name__, url_prefix='/api/events')

def can_venue_post_event(user_id):
    subscription = execute_query(
        '''SELECT * FROM subscriptions 
           WHERE user_id = %s AND is_active = TRUE AND payment_verified = TRUE AND end_date > NOW()
           ORDER BY end_date DESC LIMIT 1''',
        (user_id,),
        fetch_one=True
    )
    return subscription is not None

@bp.route('/create', methods=['POST'])
@jwt_required()
def create_event():
    user_id = get_jwt_identity()
    
    user = execute_query('SELECT user_type FROM users WHERE id = %s', (user_id,), fetch_one=True)
    
    if user['user_type'] != 'venue':
        return jsonify({'error': 'Only venues can create events'}), 403
    
    if not can_venue_post_event(user_id):
        return jsonify({'error': 'Active subscription required to post events'}), 403
    
    data = request.form
    files = request.files
    
    required_fields = ['event_name', 'event_date', 'ticket_price', 'total_tickets']
    if not all(field in data for field in required_fields):
        return jsonify({'error': 'Missing required fields'}), 400
    
    event_image_url = save_file(files.get('event_image'), 'events') if 'event_image' in files else None
    
    event_id = execute_query(
        '''INSERT INTO events (venue_id, event_name, event_description, event_date, event_location, 
           ticket_price, total_tickets, available_tickets, event_image_url) 
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)''',
        (user_id, data['event_name'], data.get('event_description'), data['event_date'],
         data.get('event_location'), data['ticket_price'], data['total_tickets'], 
         data['total_tickets'], event_image_url)
    )
    
    return jsonify({'message': 'Event created', 'event_id': event_id}), 201

@bp.route('/list', methods=['GET'])
def list_events():
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 20))
    offset = (page - 1) * limit
    
    events = execute_query(
        '''SELECT e.*, u.username as venue_name, u.profile_image_url as venue_image
           FROM events e
           JOIN users u ON e.venue_id = u.id
           WHERE e.is_active = TRUE AND e.event_date > NOW()
           ORDER BY e.event_date ASC
           LIMIT %s OFFSET %s''',
        (limit, offset),
        fetch=True
    )
    
    return jsonify({'events': events, 'page': page}), 200

@bp.route('/<int:event_id>', methods=['GET'])
def get_event(event_id):
    event = execute_query(
        '''SELECT e.*, u.username as venue_name, u.profile_image_url as venue_image, u.phone as venue_phone
           FROM events e
           JOIN users u ON e.venue_id = u.id
           WHERE e.id = %s''',
        (event_id,),
        fetch_one=True
    )
    
    if not event:
        return jsonify({'error': 'Event not found'}), 404
    
    return jsonify({'event': event}), 200

@bp.route('/<int:event_id>/purchase', methods=['POST'])
@jwt_required()
def purchase_ticket(event_id):
    user_id = get_jwt_identity()
    
    event = execute_query('SELECT * FROM events WHERE id = %s', (event_id,), fetch_one=True)
    
    if not event:
        return jsonify({'error': 'Event not found'}), 404
    
    if event['available_tickets'] <= 0:
        return jsonify({'error': 'No tickets available'}), 400
    
    # Generate ticket code and QR code
    ticket_code = generate_ticket_code()
    qr_code_url = generate_qr_code(ticket_code)
    
    # Create ticket
    ticket_id = execute_query(
        '''INSERT INTO event_tickets (event_id, user_id, ticket_code, qr_code_url) 
           VALUES (%s, %s, %s, %s)''',
        (event_id, user_id, ticket_code, qr_code_url)
    )
    
    # Update available tickets
    execute_query(
        'UPDATE events SET available_tickets = available_tickets - 1 WHERE id = %s',
        (event_id,)
    )
    
    # Create payment transaction
    execute_query(
        '''INSERT INTO payment_transactions (user_id, transaction_type, amount, payment_method, status, related_id) 
           VALUES (%s, %s, %s, %s, %s, %s)''',
        (user_id, 'event_ticket', event['ticket_price'], 'manual', 'verified', ticket_id)
    )
    
    return jsonify({
        'message': 'Ticket purchased successfully',
        'ticket_id': ticket_id,
        'ticket_code': ticket_code,
        'qr_code_url': qr_code_url
    }), 201

@bp.route('/my-tickets', methods=['GET'])
@jwt_required()
def get_my_tickets():
    user_id = get_jwt_identity()
    
    tickets = execute_query(
        '''SELECT t.*, e.event_name, e.event_date, e.event_location, e.event_image_url
           FROM event_tickets t
           JOIN events e ON t.event_id = e.id
           WHERE t.user_id = %s
           ORDER BY t.purchase_date DESC''',
        (user_id,),
        fetch=True
    )
    
    return jsonify({'tickets': tickets}), 200

@bp.route('/verify-ticket', methods=['POST'])
@jwt_required()
def verify_ticket():
    user_id = get_jwt_identity()
    data = request.json
    
    user = execute_query('SELECT user_type FROM users WHERE id = %s', (user_id,), fetch_one=True)
    
    if user['user_type'] != 'venue':
        return jsonify({'error': 'Only venues can verify tickets'}), 403
    
    ticket_code = data.get('ticket_code')
    
    ticket = execute_query(
        '''SELECT t.*, e.event_name, e.venue_id, u.username as attendee_name
           FROM event_tickets t
           JOIN events e ON t.event_id = e.id
           JOIN users u ON t.user_id = u.id
           WHERE t.ticket_code = %s''',
        (ticket_code,),
        fetch_one=True
    )
    
    if not ticket:
        return jsonify({'valid': False, 'error': 'Ticket not found'}), 404
    
    if ticket['venue_id'] != user_id:
        return jsonify({'valid': False, 'error': 'Ticket not for your event'}), 403
    
    if ticket['is_used']:
        return jsonify({
            'valid': False,
            'error': 'Ticket already used',
            'used_at': ticket['used_at']
        }), 400
    
    # Mark ticket as used
    execute_query(
        'UPDATE event_tickets SET is_used = TRUE, used_at = NOW() WHERE id = %s',
        (ticket['id'],)
    )
    
    return jsonify({
        'valid': True,
        'ticket': ticket,
        'message': 'Ticket verified successfully'
    }), 200

@bp.route('/my-events', methods=['GET'])
@jwt_required()
def get_my_events():
    user_id = get_jwt_identity()
    
    events = execute_query(
        '''SELECT e.*, 
           (SELECT COUNT(*) FROM event_tickets WHERE event_id = e.id) as tickets_sold
           FROM events e
           WHERE e.venue_id = %s
           ORDER BY e.created_at DESC''',
        (user_id,),
        fetch=True
    )
    
    return jsonify({'events': events}), 200
