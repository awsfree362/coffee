from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database.db import execute_query
from datetime import datetime, timedelta
from routes.notifications import NotificationService

bp = Blueprint('bookings', __name__, url_prefix='/api/bookings')

@bp.route('/create', methods=['POST'])
@jwt_required()
def create_booking():
    """Create a new booking"""
    user_id = get_jwt_identity()
    data = request.json
    
    escort_id = data.get('escort_id')
    booking_date = data.get('booking_date')
    duration_hours = data.get('duration_hours')
    location = data.get('location')
    price = data.get('price')
    notes = data.get('notes')
    
    # Check if escort exists and is available
    escort = execute_query(
        'SELECT * FROM users WHERE id = %s AND user_type = %s AND is_active = TRUE',
        (escort_id, 'escort'),
        fetch_one=True
    )
    
    if not escort:
        return jsonify({'error': 'Escort not found'}), 404
    
    # Check for conflicts
    conflict = execute_query(
        '''SELECT id FROM bookings 
           WHERE escort_id = %s 
           AND status IN ('pending', 'confirmed')
           AND booking_date = %s''',
        (escort_id, booking_date),
        fetch_one=True
    )
    
    if conflict:
        return jsonify({'error': 'Time slot not available'}), 400
    
    # Create booking
    booking_id = execute_query(
        '''INSERT INTO bookings (client_id, escort_id, booking_date, duration_hours, 
           location, price, notes, status, payment_status)
           VALUES (%s, %s, %s, %s, %s, %s, %s, 'pending', 'pending')''',
        (user_id, escort_id, booking_date, duration_hours, location, price, notes)
    )
    
    # Notify escort
    NotificationService.create_notification(
        user_id=escort_id,
        notification_type='new_booking',
        title='New Booking Request',
        message=f'You have a new booking request for {booking_date}',
        data={'booking_id': booking_id},
        priority='high'
    )
    
    return jsonify({
        'message': 'Booking created successfully',
        'booking_id': booking_id
    }), 201

@bp.route('/my-bookings', methods=['GET'])
@jwt_required()
def get_my_bookings():
    """Get user's bookings"""
    user_id = get_jwt_identity()
    
    user = execute_query('SELECT user_type FROM users WHERE id = %s', (user_id,), fetch_one=True)
    
    if user['user_type'] == 'escort':
        bookings = execute_query(
            '''SELECT b.*, u.username as client_name, u.phone as client_phone
               FROM bookings b
               JOIN users u ON b.client_id = u.id
               WHERE b.escort_id = %s
               ORDER BY b.booking_date DESC''',
            (user_id,),
            fetch=True
        )
    else:
        bookings = execute_query(
            '''SELECT b.*, u.username as escort_name, u.phone as escort_phone
               FROM bookings b
               JOIN users u ON b.escort_id = u.id
               WHERE b.client_id = %s
               ORDER BY b.booking_date DESC''',
            (user_id,),
            fetch=True
        )
    
    return jsonify({'bookings': bookings}), 200

@bp.route('/<int:booking_id>/confirm', methods=['POST'])
@jwt_required()
def confirm_booking(booking_id):
    """Confirm a booking (escort only)"""
    user_id = get_jwt_identity()
    
    booking = execute_query(
        'SELECT * FROM bookings WHERE id = %s AND escort_id = %s',
        (booking_id, user_id),
        fetch_one=True
    )
    
    if not booking:
        return jsonify({'error': 'Booking not found'}), 404
    
    execute_query(
        'UPDATE bookings SET status = %s WHERE id = %s',
        ('confirmed', booking_id)
    )
    
    # Notify client
    NotificationService.create_notification(
        user_id=booking['client_id'],
        notification_type='booking_confirmed',
        title='Booking Confirmed',
        message='Your booking has been confirmed',
        data={'booking_id': booking_id},
        priority='high'
    )
    
    return jsonify({'message': 'Booking confirmed'}), 200

@bp.route('/<int:booking_id>/cancel', methods=['POST'])
@jwt_required()
def cancel_booking(booking_id):
    """Cancel a booking"""
    user_id = get_jwt_identity()
    data = request.json
    
    booking = execute_query(
        'SELECT * FROM bookings WHERE id = %s AND (client_id = %s OR escort_id = %s)',
        (booking_id, user_id, user_id),
        fetch_one=True
    )
    
    if not booking:
        return jsonify({'error': 'Booking not found'}), 404
    
    execute_query(
        'UPDATE bookings SET status = %s, cancellation_reason = %s WHERE id = %s',
        ('cancelled', data.get('reason'), booking_id)
    )
    
    # Notify other party
    notify_user = booking['escort_id'] if booking['client_id'] == user_id else booking['client_id']
    NotificationService.create_notification(
        user_id=notify_user,
        notification_type='booking_cancelled',
        title='Booking Cancelled',
        message='A booking has been cancelled',
        data={'booking_id': booking_id},
        priority='high'
    )
    
    return jsonify({'message': 'Booking cancelled'}), 200

@bp.route('/availability', methods=['GET', 'POST'])
@jwt_required()
def manage_availability():
    """Get or set availability schedule"""
    user_id = get_jwt_identity()
    
    if request.method == 'GET':
        schedule = execute_query(
            'SELECT * FROM availability_schedule WHERE user_id = %s ORDER BY day_of_week, start_time',
            (user_id,),
            fetch=True
        )
        return jsonify({'schedule': schedule}), 200
    
    else:  # POST
        data = request.json
        
        # Clear existing schedule
        execute_query('DELETE FROM availability_schedule WHERE user_id = %s', (user_id,))
        
        # Insert new schedule
        for slot in data.get('schedule', []):
            execute_query(
                '''INSERT INTO availability_schedule (user_id, day_of_week, start_time, end_time, is_available)
                   VALUES (%s, %s, %s, %s, %s)''',
                (user_id, slot['day_of_week'], slot['start_time'], slot['end_time'], slot.get('is_available', True))
            )
        
        return jsonify({'message': 'Availability updated'}), 200

@bp.route('/rate/<int:booking_id>', methods=['POST'])
@jwt_required()
def rate_booking(booking_id):
    """Rate a completed booking"""
    user_id = get_jwt_identity()
    data = request.json
    
    booking = execute_query(
        'SELECT * FROM bookings WHERE id = %s AND client_id = %s AND status = %s',
        (booking_id, user_id, 'completed'),
        fetch_one=True
    )
    
    if not booking:
        return jsonify({'error': 'Booking not found or not completed'}), 404
    
    # Check if already rated
    existing = execute_query(
        'SELECT id FROM user_ratings WHERE rater_id = %s AND rated_user_id = %s',
        (user_id, booking['escort_id']),
        fetch_one=True
    )
    
    if existing:
        # Update existing rating
        execute_query(
            'UPDATE user_ratings SET rating = %s, review_text = %s WHERE id = %s',
            (data['rating'], data.get('review_text'), existing['id'])
        )
    else:
        # Create new rating
        execute_query(
            '''INSERT INTO user_ratings (rater_id, rated_user_id, rating, review_text, is_verified_booking)
               VALUES (%s, %s, %s, %s, TRUE)''',
            (user_id, booking['escort_id'], data['rating'], data.get('review_text'))
        )
    
    # Update user's average rating
    avg_rating = execute_query(
        'SELECT AVG(rating) as avg, COUNT(*) as count FROM user_ratings WHERE rated_user_id = %s',
        (booking['escort_id'],),
        fetch_one=True
    )
    
    execute_query(
        'UPDATE users SET average_rating = %s, total_ratings = %s WHERE id = %s',
        (avg_rating['avg'], avg_rating['count'], booking['escort_id'])
    )
    
    return jsonify({'message': 'Rating submitted'}), 200
