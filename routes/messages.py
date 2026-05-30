from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from flask_socketio import emit, join_room
from database.db import execute_query
from utils.helpers import save_file, get_month_year

bp = Blueprint('messages', __name__, url_prefix='/api/messages')

def can_user_message(user_id, target_user_id):
    user = execute_query('SELECT user_type FROM users WHERE id = %s', (user_id,), fetch_one=True)
    
    if user['user_type'] != 'visitor':
        return True
    
    subscription = execute_query(
        '''SELECT * FROM subscriptions 
           WHERE user_id = %s AND is_active = TRUE AND payment_verified = TRUE AND end_date > NOW()
           ORDER BY end_date DESC LIMIT 1''',
        (user_id,),
        fetch_one=True
    )
    
    if subscription:
        return True
    
    # Check free tier limit (5 different users per month)
    month_year = get_month_year()
    count = execute_query(
        '''SELECT COUNT(DISTINCT target_user_id) as count FROM visitor_interactions 
           WHERE visitor_id = %s AND interaction_type = %s AND month_year = %s''',
        (user_id, 'message', month_year),
        fetch_one=True
    )
    
    # Check if already messaged this user this month
    existing = execute_query(
        '''SELECT id FROM visitor_interactions 
           WHERE visitor_id = %s AND interaction_type = %s AND target_user_id = %s AND month_year = %s''',
        (user_id, 'message', target_user_id, month_year),
        fetch_one=True
    )
    
    return existing or (count['count'] < 5)

@bp.route('/conversations', methods=['GET'])
@jwt_required()
def get_conversations():
    user_id = get_jwt_identity()
    
    conversations = execute_query(
        '''SELECT c.*, 
           CASE WHEN c.user1_id = %s THEN c.user2_id ELSE c.user1_id END as other_user_id,
           u.username, u.profile_image_url,
           (SELECT message_text FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
           (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND sender_id != %s AND is_read = FALSE) as unread_count
           FROM conversations c
           JOIN users u ON (CASE WHEN c.user1_id = %s THEN c.user2_id ELSE c.user1_id END) = u.id
           WHERE c.user1_id = %s OR c.user2_id = %s
           ORDER BY c.last_message_at DESC''',
        (user_id, user_id, user_id, user_id, user_id),
        fetch=True
    )
    
    return jsonify({'conversations': conversations}), 200

@bp.route('/conversation/<int:other_user_id>', methods=['GET'])
@jwt_required()
def get_or_create_conversation(other_user_id):
    user_id = get_jwt_identity()
    
    # Check if conversation exists
    conversation = execute_query(
        '''SELECT * FROM conversations 
           WHERE (user1_id = %s AND user2_id = %s) OR (user1_id = %s AND user2_id = %s)''',
        (user_id, other_user_id, other_user_id, user_id),
        fetch_one=True
    )
    
    if not conversation:
        # Create new conversation
        conversation_id = execute_query(
            'INSERT INTO conversations (user1_id, user2_id) VALUES (%s, %s)',
            (min(user_id, other_user_id), max(user_id, other_user_id))
        )
        conversation = {'id': conversation_id, 'user1_id': user_id, 'user2_id': other_user_id}
    
    # Get messages
    messages = execute_query(
        '''SELECT m.*, u.username, u.profile_image_url
           FROM messages m
           JOIN users u ON m.sender_id = u.id
           WHERE m.conversation_id = %s
           ORDER BY m.created_at ASC''',
        (conversation['id'],),
        fetch=True
    )
    
    # Mark messages as read
    execute_query(
        'UPDATE messages SET is_read = TRUE WHERE conversation_id = %s AND sender_id = %s',
        (conversation['id'], other_user_id)
    )
    
    return jsonify({'conversation': conversation, 'messages': messages}), 200

@bp.route('/send', methods=['POST'])
@jwt_required()
def send_message():
    user_id = get_jwt_identity()
    data = request.form
    files = request.files
    
    conversation_id = data.get('conversation_id')
    other_user_id = data.get('other_user_id')
    
    if not conversation_id and not other_user_id:
        return jsonify({'error': 'conversation_id or other_user_id required'}), 400
    
    # Check messaging limits
    if other_user_id and not can_user_message(user_id, int(other_user_id)):
        return jsonify({'error': 'Monthly message limit reached. Upgrade to premium.'}), 403
    
    # Get or create conversation
    if not conversation_id:
        conversation = execute_query(
            '''SELECT id FROM conversations 
               WHERE (user1_id = %s AND user2_id = %s) OR (user1_id = %s AND user2_id = %s)''',
            (user_id, other_user_id, other_user_id, user_id),
            fetch_one=True
        )
        
        if not conversation:
            conversation_id = execute_query(
                'INSERT INTO conversations (user1_id, user2_id) VALUES (%s, %s)',
                (min(user_id, int(other_user_id)), max(user_id, int(other_user_id)))
            )
        else:
            conversation_id = conversation['id']
    
    # Handle attachment
    attachment_url = None
    attachment_type = None
    if 'attachment' in files:
        attachment_url = save_file(files['attachment'], 'messages')
        attachment_type = data.get('attachment_type', 'image')
    
    # Insert message
    message_id = execute_query(
        '''INSERT INTO messages (conversation_id, sender_id, message_text, attachment_url, attachment_type) 
           VALUES (%s, %s, %s, %s, %s)''',
        (conversation_id, user_id, data.get('message_text'), attachment_url, attachment_type)
    )
    
    # Update conversation last message time
    execute_query(
        'UPDATE conversations SET last_message_at = NOW() WHERE id = %s',
        (conversation_id,)
    )
    
    # Track interaction for free visitors
    user = execute_query('SELECT user_type FROM users WHERE id = %s', (user_id,), fetch_one=True)
    if user['user_type'] == 'visitor' and other_user_id:
        month_year = get_month_year()
        execute_query(
            '''INSERT INTO visitor_interactions (visitor_id, interaction_type, target_user_id, month_year, interaction_count)
               VALUES (%s, %s, %s, %s, 1)
               ON DUPLICATE KEY UPDATE interaction_count = interaction_count + 1''',
            (user_id, 'message', other_user_id, month_year)
        )
    
    # Emit socket event
    from app import socketio
    message = execute_query('SELECT * FROM messages WHERE id = %s', (message_id,), fetch_one=True)
    socketio.emit('new_message', message, room=f'conversation_{conversation_id}')
    
    return jsonify({'message': 'Message sent', 'message_id': message_id}), 201

@bp.route('/check-limit', methods=['GET'])
@jwt_required()
def check_message_limit():
    user_id = get_jwt_identity()
    
    user = execute_query('SELECT user_type FROM users WHERE id = %s', (user_id,), fetch_one=True)
    
    if user['user_type'] != 'visitor':
        return jsonify({'can_message': True, 'limit': None}), 200
    
    subscription = execute_query(
        '''SELECT * FROM subscriptions 
           WHERE user_id = %s AND is_active = TRUE AND payment_verified = TRUE AND end_date > NOW()
           ORDER BY end_date DESC LIMIT 1''',
        (user_id,),
        fetch_one=True
    )
    
    if subscription:
        return jsonify({'can_message': True, 'limit': None}), 200
    
    # Check free tier limit
    month_year = get_month_year()
    count = execute_query(
        '''SELECT COUNT(DISTINCT target_user_id) as count FROM visitor_interactions 
           WHERE visitor_id = %s AND interaction_type = %s AND month_year = %s''',
        (user_id, 'message', month_year),
        fetch_one=True
    )
    
    return jsonify({
        'can_message': count['count'] < 5,
        'limit': 5,
        'used': count['count']
    }), 200

# Socket.IO event handlers
def register_socketio_handlers(socketio):
    @socketio.on('connect')
    def handle_connect():
        from flask_jwt_extended import decode_token
        from flask import request
        token = request.args.get('token')
        if token:
            try:
                decoded = decode_token(token)
                user_id = decoded['sub']
                from app import online_users
                online_users.add(user_id)
                socketio.emit('user_status', {'user_id': user_id, 'online': True}, broadcast=True)
            except:
                pass
    
    @socketio.on('disconnect')
    def handle_disconnect():
        from flask_jwt_extended import decode_token
        from flask import request
        token = request.args.get('token')
        if token:
            try:
                decoded = decode_token(token)
                user_id = decoded['sub']
                from app import online_users
                online_users.discard(user_id)
                socketio.emit('user_status', {'user_id': user_id, 'online': False}, broadcast=True)
            except:
                pass
    
    @socketio.on('join_conversation')
    def handle_join_conversation(data):
        conversation_id = data.get('conversation_id')
        join_room(f'conversation_{conversation_id}')

    @socketio.on('typing')
    def handle_typing(data):
        conversation_id = data.get('conversation_id')
        user_id = data.get('user_id')
        emit('user_typing', {'user_id': user_id}, room=f'conversation_{conversation_id}', include_self=False)
