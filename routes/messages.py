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
    
    receiver_id = data.get('receiver_id')
    
    if not receiver_id:
        return jsonify({'error': 'receiver_id required'}), 400
    
    receiver_id = int(receiver_id)
    
    # Check messaging limits
    if not can_user_message(user_id, receiver_id):
        return jsonify({'error': 'Monthly message limit reached. Upgrade to premium.'}), 403
    
    # Get or create conversation
    conversation = execute_query(
        '''SELECT id FROM conversations 
           WHERE (user1_id = %s AND user2_id = %s) OR (user1_id = %s AND user2_id = %s)''',
        (user_id, receiver_id, receiver_id, user_id),
        fetch_one=True
    )
    
    if not conversation:
        conversation_id = execute_query(
            'INSERT INTO conversations (user1_id, user2_id) VALUES (%s, %s)',
            (min(user_id, receiver_id), max(user_id, receiver_id))
        )
    else:
        conversation_id = conversation['id']
    
    # Handle attachment
    attachment_url = None
    attachment_type = None
    if 'attachment' in files:
        file = files['attachment']
        attachment_url = save_file(file, 'messages')
        # Determine type from file
        if file.content_type.startswith('image/'):
            attachment_type = 'image'
        elif file.content_type.startswith('video/'):
            attachment_type = 'video'
        else:
            attachment_type = 'document'
    
    message_text = data.get('message_text', '').strip()
    
    if not message_text and not attachment_url:
        return jsonify({'error': 'Message text or attachment required'}), 400
    
    # Insert message
    message_id = execute_query(
        '''INSERT INTO messages (conversation_id, sender_id, message_text, attachment_url, attachment_type) 
           VALUES (%s, %s, %s, %s, %s)''',
        (conversation_id, user_id, message_text if message_text else None, attachment_url, attachment_type)
    )
    
    # Update conversation last message time
    execute_query(
        'UPDATE conversations SET last_message_at = NOW() WHERE id = %s',
        (conversation_id,)
    )
    
    # Track interaction for free visitors
    user = execute_query('SELECT user_type FROM users WHERE id = %s', (user_id,), fetch_one=True)
    if user['user_type'] == 'visitor':
        month_year = get_month_year()
        execute_query(
            '''INSERT INTO visitor_interactions (visitor_id, interaction_type, target_user_id, month_year, interaction_count)
               VALUES (%s, %s, %s, %s, 1)
               ON DUPLICATE KEY UPDATE interaction_count = interaction_count + 1''',
            (user_id, 'message', receiver_id, month_year)
        )
    
    # Get the message with user info
    message = execute_query(
        '''SELECT m.*, u.username, u.profile_image_url
           FROM messages m
           JOIN users u ON m.sender_id = u.id
           WHERE m.id = %s''',
        (message_id,),
        fetch_one=True
    )
    
    # Emit socket event
    from app import socketio
    socketio.emit('new_message', {
        'conversation_id': conversation_id,
        'message': message,
        'receiver_id': receiver_id
    }, room=f'user_{receiver_id}')
    
    return jsonify({'message': 'Message sent', 'message_id': message_id, 'data': message}), 201

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

@bp.route('/mark-read/<int:conversation_id>', methods=['POST'])
@jwt_required()
def mark_messages_read(conversation_id):
    user_id = get_jwt_identity()
    
    # Mark all messages in conversation as read
    execute_query(
        '''UPDATE messages SET is_read = TRUE, read_at = NOW() 
           WHERE conversation_id = %s AND sender_id != %s AND is_read = FALSE''',
        (conversation_id, user_id)
    )
    
    return jsonify({'message': 'Messages marked as read'}), 200

@bp.route('/delete/<int:message_id>', methods=['DELETE'])
@jwt_required()
def delete_message(message_id):
    user_id = get_jwt_identity()
    
    # Get message
    message = execute_query(
        'SELECT * FROM messages WHERE id = %s',
        (message_id,),
        fetch_one=True
    )
    
    if not message:
        return jsonify({'error': 'Message not found'}), 404
    
    # Only sender can delete
    if message['sender_id'] != user_id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    # Soft delete
    execute_query(
        'UPDATE messages SET deleted_by_sender = TRUE WHERE id = %s',
        (message_id,)
    )
    
    return jsonify({'message': 'Message deleted'}), 200

@bp.route('/search', methods=['GET'])
@jwt_required()
def search_messages():
    user_id = get_jwt_identity()
    query = request.args.get('q', '')
    conversation_id = request.args.get('conversation_id')
    
    if not query:
        return jsonify({'messages': []}), 200
    
    sql = '''SELECT m.*, u.username, u.profile_image_url
             FROM messages m
             JOIN conversations c ON m.conversation_id = c.id
             JOIN users u ON m.sender_id = u.id
             WHERE (c.user1_id = %s OR c.user2_id = %s)
             AND m.message_text LIKE %s'''
    
    params = [user_id, user_id, f'%{query}%']
    
    if conversation_id:
        sql += ' AND m.conversation_id = %s'
        params.append(conversation_id)
    
    sql += ' ORDER BY m.created_at DESC LIMIT 50'
    
    messages = execute_query(sql, tuple(params), fetch=True)
    
    return jsonify({'messages': messages}), 200

@bp.route('/archive/<int:conversation_id>', methods=['POST'])
@jwt_required()
def archive_conversation(conversation_id):
    user_id = get_jwt_identity()
    
    # Insert or update conversation settings
    execute_query(
        '''INSERT INTO conversation_settings (conversation_id, user_id, is_archived)
           VALUES (%s, %s, TRUE)
           ON DUPLICATE KEY UPDATE is_archived = TRUE''',
        (conversation_id, user_id)
    )
    
    return jsonify({'message': 'Conversation archived'}), 200

@bp.route('/unarchive/<int:conversation_id>', methods=['POST'])
@jwt_required()
def unarchive_conversation(conversation_id):
    user_id = get_jwt_identity()
    
    execute_query(
        '''INSERT INTO conversation_settings (conversation_id, user_id, is_archived)
           VALUES (%s, %s, FALSE)
           ON DUPLICATE KEY UPDATE is_archived = FALSE''',
        (conversation_id, user_id)
    )
    
    return jsonify({'message': 'Conversation unarchived'}), 200

@bp.route('/mute/<int:conversation_id>', methods=['POST'])
@jwt_required()
def mute_conversation(conversation_id):
    user_id = get_jwt_identity()
    
    execute_query(
        '''INSERT INTO conversation_settings (conversation_id, user_id, is_muted)
           VALUES (%s, %s, TRUE)
           ON DUPLICATE KEY UPDATE is_muted = TRUE''',
        (conversation_id, user_id)
    )
    
    return jsonify({'message': 'Conversation muted'}), 200

@bp.route('/unmute/<int:conversation_id>', methods=['POST'])
@jwt_required()
def unmute_conversation(conversation_id):
    user_id = get_jwt_identity()
    
    execute_query(
        '''INSERT INTO conversation_settings (conversation_id, user_id, is_muted)
           VALUES (%s, %s, FALSE)
           ON DUPLICATE KEY UPDATE is_muted = FALSE''',
        (conversation_id, user_id)
    )
    
    return jsonify({'message': 'Conversation unmuted'}), 200

@bp.route('/block/<int:other_user_id>', methods=['POST'])
@jwt_required()
def block_user(other_user_id):
    user_id = get_jwt_identity()
    
    # Get conversation
    conversation = execute_query(
        '''SELECT id FROM conversations 
           WHERE (user1_id = %s AND user2_id = %s) OR (user1_id = %s AND user2_id = %s)''',
        (user_id, other_user_id, other_user_id, user_id),
        fetch_one=True
    )
    
    if conversation:
        execute_query(
            '''INSERT INTO conversation_settings (conversation_id, user_id, is_blocked)
               VALUES (%s, %s, TRUE)
               ON DUPLICATE KEY UPDATE is_blocked = TRUE''',
            (conversation['id'], user_id)
        )
    
    return jsonify({'message': 'User blocked'}), 200

@bp.route('/unblock/<int:other_user_id>', methods=['POST'])
@jwt_required()
def unblock_user(other_user_id):
    user_id = get_jwt_identity()
    
    # Get conversation
    conversation = execute_query(
        '''SELECT id FROM conversations 
           WHERE (user1_id = %s AND user2_id = %s) OR (user1_id = %s AND user2_id = %s)''',
        (user_id, other_user_id, other_user_id, user_id),
        fetch_one=True
    )
    
    if conversation:
        execute_query(
            '''INSERT INTO conversation_settings (conversation_id, user_id, is_blocked)
               VALUES (%s, %s, FALSE)
               ON DUPLICATE KEY UPDATE is_blocked = FALSE''',
            (conversation['id'], user_id)
        )
    
    return jsonify({'message': 'User unblocked'}), 200

@bp.route('/conversation-settings/<int:conversation_id>', methods=['GET'])
@jwt_required()
def get_conversation_settings(conversation_id):
    user_id = get_jwt_identity()
    
    settings = execute_query(
        '''SELECT * FROM conversation_settings 
           WHERE conversation_id = %s AND user_id = %s''',
        (conversation_id, user_id),
        fetch_one=True
    )
    
    if not settings:
        return jsonify({
            'is_archived': False,
            'is_muted': False,
            'is_blocked': False
        }), 200
    
    return jsonify(settings), 200

@bp.route('/requests', methods=['GET'])
@jwt_required()
def get_message_requests():
    user_id = get_jwt_identity()
    
    # Get conversations where user hasn't replied yet (message requests)
    requests = execute_query(
        '''SELECT DISTINCT
           CASE WHEN c.user1_id = %s THEN c.user2_id ELSE c.user1_id END as user_id,
           u.username, u.profile_image_url, u.user_type,
           (SELECT message_text FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
           c.id as conversation_id
           FROM conversations c
           JOIN users u ON (CASE WHEN c.user1_id = %s THEN c.user2_id ELSE c.user1_id END) = u.id
           WHERE (c.user1_id = %s OR c.user2_id = %s)
           AND NOT EXISTS (
               SELECT 1 FROM messages m 
               WHERE m.conversation_id = c.id AND m.sender_id = %s
           )
           AND EXISTS (
               SELECT 1 FROM messages m 
               WHERE m.conversation_id = c.id AND m.sender_id != %s
           )
           ORDER BY c.last_message_at DESC''',
        (user_id, user_id, user_id, user_id, user_id, user_id),
        fetch=True
    )
    
    return jsonify({'requests': requests}), 200

@bp.route('/decline-request/<int:other_user_id>', methods=['POST'])
@jwt_required()
def decline_message_request(other_user_id):
    user_id = get_jwt_identity()
    
    # Get conversation
    conversation = execute_query(
        '''SELECT id FROM conversations 
           WHERE (user1_id = %s AND user2_id = %s) OR (user1_id = %s AND user2_id = %s)''',
        (user_id, other_user_id, other_user_id, user_id),
        fetch_one=True
    )
    
    if conversation:
        # Delete all messages in the conversation
        execute_query(
            'DELETE FROM messages WHERE conversation_id = %s',
            (conversation['id'],)
        )
        
        # Delete the conversation
        execute_query(
            'DELETE FROM conversations WHERE id = %s',
            (conversation['id'],)
        )
    
    return jsonify({'message': 'Message request declined'}), 200

@bp.route('/export-data', methods=['GET'])
@jwt_required()
def export_message_data():
    from flask import send_file
    import json
    import io
    from datetime import datetime
    
    user_id = get_jwt_identity()
    
    # Get user info
    user = execute_query(
        'SELECT id, username, email, user_type FROM users WHERE id = %s',
        (user_id,),
        fetch_one=True
    )
    
    # Get all conversations
    conversations = execute_query(
        '''SELECT c.*, 
           CASE WHEN c.user1_id = %s THEN c.user2_id ELSE c.user1_id END as other_user_id,
           u.username as other_username
           FROM conversations c
           JOIN users u ON (CASE WHEN c.user1_id = %s THEN c.user2_id ELSE c.user1_id END) = u.id
           WHERE c.user1_id = %s OR c.user2_id = %s
           ORDER BY c.created_at DESC''',
        (user_id, user_id, user_id, user_id),
        fetch=True
    )
    
    # Get all messages for each conversation
    export_data = {
        'export_info': {
            'user_id': user['id'],
            'username': user['username'],
            'email': user['email'],
            'user_type': user['user_type'],
            'export_date': datetime.now().isoformat(),
            'total_conversations': len(conversations)
        },
        'conversations': []
    }
    
    for conv in conversations:
        messages = execute_query(
            '''SELECT m.*, u.username as sender_username
               FROM messages m
               JOIN users u ON m.sender_id = u.id
               WHERE m.conversation_id = %s
               ORDER BY m.created_at ASC''',
            (conv['id'],),
            fetch=True
        )
        
        # Get conversation settings
        settings = execute_query(
            '''SELECT * FROM conversation_settings 
               WHERE conversation_id = %s AND user_id = %s''',
            (conv['id'], user_id),
            fetch_one=True
        )
        
        conv_data = {
            'conversation_id': conv['id'],
            'other_user': {
                'user_id': conv['other_user_id'],
                'username': conv['other_username']
            },
            'created_at': conv['created_at'].isoformat() if conv['created_at'] else None,
            'last_message_at': conv['last_message_at'].isoformat() if conv['last_message_at'] else None,
            'settings': {
                'is_archived': settings['is_archived'] if settings else False,
                'is_muted': settings['is_muted'] if settings else False,
                'nickname': settings['nickname'] if settings else None
            },
            'total_messages': len(messages),
            'messages': []
        }
        
        for msg in messages:
            msg_data = {
                'message_id': msg['id'],
                'sender': {
                    'user_id': msg['sender_id'],
                    'username': msg['sender_username']
                },
                'message_text': msg['message_text'],
                'attachment_url': msg['attachment_url'],
                'attachment_type': msg['attachment_type'],
                'is_read': bool(msg['is_read']),
                'created_at': msg['created_at'].isoformat() if msg['created_at'] else None,
                'read_at': msg['read_at'].isoformat() if msg['read_at'] else None
            }
            conv_data['messages'].append(msg_data)
        
        export_data['conversations'].append(conv_data)
    
    # Create JSON file in memory
    json_data = json.dumps(export_data, indent=2, ensure_ascii=False)
    json_bytes = io.BytesIO(json_data.encode('utf-8'))
    json_bytes.seek(0)
    
    # Send file
    return send_file(
        json_bytes,
        mimetype='application/json',
        as_attachment=True,
        download_name=f'coffee_messages_export_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json'
    )

@bp.route('/delete-conversation/<int:conversation_id>', methods=['DELETE'])
@jwt_required()
def delete_conversation(conversation_id):
    user_id = get_jwt_identity()
    
    # Verify user is part of the conversation
    conversation = execute_query(
        '''SELECT * FROM conversations 
           WHERE id = %s AND (user1_id = %s OR user2_id = %s)''',
        (conversation_id, user_id, user_id),
        fetch_one=True
    )
    
    if not conversation:
        return jsonify({'error': 'Conversation not found'}), 404
    
    # Delete all messages in the conversation
    execute_query(
        'DELETE FROM messages WHERE conversation_id = %s',
        (conversation_id,)
    )
    
    # Delete conversation settings
    execute_query(
        'DELETE FROM conversation_settings WHERE conversation_id = %s',
        (conversation_id,)
    )
    
    # Delete the conversation
    execute_query(
        'DELETE FROM conversations WHERE id = %s',
        (conversation_id,)
    )
    
    return jsonify({'message': 'Conversation deleted successfully'}), 200

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
                
                # Join user's personal room
                from flask_socketio import join_room
                join_room(f'user_{user_id}')
                
                # Update online status in database
                execute_query(
                    '''INSERT INTO user_online_status (user_id, is_online, last_seen)
                       VALUES (%s, TRUE, NOW())
                       ON DUPLICATE KEY UPDATE is_online = TRUE, last_seen = NOW()''',
                    (user_id,)
                )
                
                socketio.emit('user_status', {'user_id': user_id, 'online': True}, broadcast=True)
            except Exception as e:
                print(f"Connect error: {e}")
    
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
                
                # Update online status in database
                execute_query(
                    '''UPDATE user_online_status 
                       SET is_online = FALSE, last_seen = NOW() 
                       WHERE user_id = %s''',
                    (user_id,)
                )
                
                socketio.emit('user_status', {'user_id': user_id, 'online': False}, broadcast=True)
            except Exception as e:
                print(f"Disconnect error: {e}")
    
    @socketio.on('join_conversation')
    def handle_join_conversation(data):
        from flask_socketio import join_room
        user_id = data.get('user_id')
        if user_id:
            join_room(f'user_{user_id}')
    
    @socketio.on('typing_start')
    def handle_typing_start(data):
        from flask_socketio import emit
        conversation_id = data.get('conversation_id')
        user_id = data.get('user_id')
        receiver_id = data.get('receiver_id')
        
        if receiver_id:
            emit('user_typing', {
                'conversation_id': conversation_id,
                'user_id': user_id,
                'typing': True
            }, room=f'user_{receiver_id}')
    
    @socketio.on('typing_stop')
    def handle_typing_stop(data):
        from flask_socketio import emit
        conversation_id = data.get('conversation_id')
        user_id = data.get('user_id')
        receiver_id = data.get('receiver_id')
        
        if receiver_id:
            emit('user_typing', {
                'conversation_id': conversation_id,
                'user_id': user_id,
                'typing': False
            }, room=f'user_{receiver_id}')
    
    @socketio.on('message_read')
    def handle_message_read(data):
        from flask_socketio import emit
        message_id = data.get('message_id')
        conversation_id = data.get('conversation_id')
        reader_id = data.get('reader_id')
        sender_id = data.get('sender_id')
        
        # Update message read status
        execute_query(
            'UPDATE messages SET is_read = TRUE, read_at = NOW() WHERE id = %s',
            (message_id,)
        )
        
        # Notify sender
        if sender_id:
            emit('message_read_receipt', {
                'message_id': message_id,
                'conversation_id': conversation_id,
                'reader_id': reader_id
            }, room=f'user_{sender_id}')
