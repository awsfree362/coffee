from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database.db import execute_query, redis_client
from datetime import datetime
import json
import os

bp = Blueprint('notifications', __name__, url_prefix='/api/notifications')

class NotificationService:
    """Advanced notification service with multiple channels"""
    
    @staticmethod
    def create_notification(user_id, notification_type, title, message, data=None, priority='normal'):
        """Create a new notification"""
        notification_id = execute_query(
            '''INSERT INTO notifications (user_id, type, title, message, data, priority, is_read)
               VALUES (%s, %s, %s, %s, %s, %s, FALSE)''',
            (user_id, notification_type, title, message, json.dumps(data or {}), priority)
        )
        
        # Add to Redis for real-time delivery
        redis_client.lpush(f'notifications:{user_id}', json.dumps({
            'id': notification_id,
            'type': notification_type,
            'title': title,
            'message': message,
            'data': data,
            'priority': priority,
            'created_at': datetime.now().isoformat()
        }))
        
        # Send push notification if enabled
        NotificationService.send_push_notification(user_id, title, message)
        
        return notification_id
    
    @staticmethod
    def send_push_notification(user_id, title, message):
        """Send push notification via FCM/APNS"""
        # Get user's device tokens
        tokens = execute_query(
            'SELECT device_token FROM user_devices WHERE user_id = %s AND is_active = TRUE',
            (user_id,),
            fetch=True
        )
        
        if not tokens:
            return
        
        # In production, integrate with Firebase Cloud Messaging
        # For now, store in Redis for processing
        for token_row in tokens:
            redis_client.lpush('push_queue', json.dumps({
                'token': token_row['device_token'],
                'title': title,
                'message': message,
                'user_id': user_id
            }))
    
    @staticmethod
    def send_email_notification(user_id, subject, template, data):
        """Send email notification"""
        user = execute_query(
            'SELECT email, username FROM users WHERE id = %s',
            (user_id,),
            fetch_one=True
        )
        
        if not user:
            return
        
        # Queue email for sending
        redis_client.lpush('email_queue', json.dumps({
            'to': user['email'],
            'subject': subject,
            'template': template,
            'data': {**data, 'username': user['username']},
            'user_id': user_id
        }))
    
    @staticmethod
    def send_sms_notification(user_id, message):
        """Send SMS notification via Twilio/similar"""
        user = execute_query(
            'SELECT phone FROM users WHERE id = %s AND phone IS NOT NULL',
            (user_id,),
            fetch_one=True
        )
        
        if not user or not user['phone']:
            return
        
        # Queue SMS for sending
        redis_client.lpush('sms_queue', json.dumps({
            'to': user['phone'],
            'message': message,
            'user_id': user_id
        }))

# Notification triggers
class NotificationTriggers:
    """Automatic notification triggers for various events"""
    
    @staticmethod
    def on_new_message(sender_id, recipient_id, message_preview):
        """Trigger when new message received"""
        sender = execute_query(
            'SELECT username, profile_image_url FROM users WHERE id = %s',
            (sender_id,),
            fetch_one=True
        )
        
        NotificationService.create_notification(
            user_id=recipient_id,
            notification_type='new_message',
            title=f'New message from {sender["username"]}',
            message=message_preview[:100],
            data={'sender_id': sender_id, 'sender_username': sender['username']},
            priority='high'
        )
    
    @staticmethod
    def on_post_like(liker_id, post_owner_id, post_id):
        """Trigger when post is liked"""
        liker = execute_query(
            'SELECT username FROM users WHERE id = %s',
            (liker_id,),
            fetch_one=True
        )
        
        NotificationService.create_notification(
            user_id=post_owner_id,
            notification_type='post_like',
            title='New like on your post',
            message=f'{liker["username"]} liked your post',
            data={'liker_id': liker_id, 'post_id': post_id},
            priority='normal'
        )
    
    @staticmethod
    def on_post_comment(commenter_id, post_owner_id, post_id, comment_text):
        """Trigger when post is commented"""
        commenter = execute_query(
            'SELECT username FROM users WHERE id = %s',
            (commenter_id,),
            fetch_one=True
        )
        
        NotificationService.create_notification(
            user_id=post_owner_id,
            notification_type='post_comment',
            title='New comment on your post',
            message=f'{commenter["username"]}: {comment_text[:50]}...',
            data={'commenter_id': commenter_id, 'post_id': post_id},
            priority='normal'
        )
    
    @staticmethod
    def on_subscription_expiring(user_id, days_remaining):
        """Trigger when subscription is about to expire"""
        NotificationService.create_notification(
            user_id=user_id,
            notification_type='subscription_expiring',
            title='Subscription Expiring Soon',
            message=f'Your subscription expires in {days_remaining} days. Renew now to keep your features!',
            data={'days_remaining': days_remaining},
            priority='high'
        )
        
        # Also send email
        NotificationService.send_email_notification(
            user_id=user_id,
            subject='Your Coffee subscription is expiring soon',
            template='subscription_expiring',
            data={'days_remaining': days_remaining}
        )
    
    @staticmethod
    def on_affiliate_earning(affiliate_id, amount, referred_username):
        """Trigger when affiliate earns commission"""
        NotificationService.create_notification(
            user_id=affiliate_id,
            notification_type='affiliate_earning',
            title='New Affiliate Commission!',
            message=f'You earned R{amount:.2f} from {referred_username}\'s subscription',
            data={'amount': amount, 'referred_username': referred_username},
            priority='high'
        )
    
    @staticmethod
    def on_payment_verified(user_id, subscription_id):
        """Trigger when payment is verified"""
        NotificationService.create_notification(
            user_id=user_id,
            notification_type='payment_verified',
            title='Payment Verified!',
            message='Your payment has been verified. All features are now unlocked!',
            data={'subscription_id': subscription_id},
            priority='high'
        )
        
        NotificationService.send_email_notification(
            user_id=user_id,
            subject='Payment Verified - Welcome to Coffee Premium',
            template='payment_verified',
            data={'subscription_id': subscription_id}
        )
    
    @staticmethod
    def on_event_ticket_purchased(user_id, event_name, ticket_code):
        """Trigger when event ticket is purchased"""
        NotificationService.create_notification(
            user_id=user_id,
            notification_type='ticket_purchased',
            title='Ticket Purchased Successfully',
            message=f'Your ticket for {event_name} is ready!',
            data={'event_name': event_name, 'ticket_code': ticket_code},
            priority='high'
        )
        
        NotificationService.send_email_notification(
            user_id=user_id,
            subject=f'Your ticket for {event_name}',
            template='ticket_purchased',
            data={'event_name': event_name, 'ticket_code': ticket_code}
        )

@bp.route('/list', methods=['GET'])
@jwt_required()
def get_notifications():
    """Get user notifications with pagination"""
    user_id = get_jwt_identity()
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 20))
    unread_only = request.args.get('unread_only', 'false').lower() == 'true'
    
    offset = (page - 1) * limit
    
    query = '''SELECT * FROM notifications 
               WHERE user_id = %s'''
    params = [user_id]
    
    if unread_only:
        query += ' AND is_read = FALSE'
    
    query += ' ORDER BY created_at DESC LIMIT %s OFFSET %s'
    params.extend([limit, offset])
    
    notifications = execute_query(query, tuple(params), fetch=True)
    
    # Get unread count
    unread_count = execute_query(
        'SELECT COUNT(*) as count FROM notifications WHERE user_id = %s AND is_read = FALSE',
        (user_id,),
        fetch_one=True
    )['count']
    
    return jsonify({
        'notifications': notifications,
        'unread_count': unread_count,
        'page': page,
        'has_more': len(notifications) == limit
    }), 200

@bp.route('/mark-read', methods=['POST'])
@jwt_required()
def mark_as_read():
    """Mark notifications as read"""
    user_id = get_jwt_identity()
    data = request.json
    
    notification_ids = data.get('notification_ids', [])
    mark_all = data.get('mark_all', False)
    
    if mark_all:
        execute_query(
            'UPDATE notifications SET is_read = TRUE WHERE user_id = %s',
            (user_id,)
        )
    elif notification_ids:
        placeholders = ','.join(['%s'] * len(notification_ids))
        execute_query(
            f'UPDATE notifications SET is_read = TRUE WHERE id IN ({placeholders}) AND user_id = %s',
            (*notification_ids, user_id)
        )
    
    return jsonify({'message': 'Notifications marked as read'}), 200

@bp.route('/preferences', methods=['GET', 'PUT'])
@jwt_required()
def notification_preferences():
    """Get or update notification preferences"""
    user_id = get_jwt_identity()
    
    if request.method == 'GET':
        prefs = execute_query(
            'SELECT * FROM notification_preferences WHERE user_id = %s',
            (user_id,),
            fetch_one=True
        )
        
        if not prefs:
            # Create default preferences
            execute_query(
                '''INSERT INTO notification_preferences 
                   (user_id, email_enabled, push_enabled, sms_enabled, 
                    new_message, post_interaction, subscription_alerts, affiliate_updates)
                   VALUES (%s, TRUE, TRUE, FALSE, TRUE, TRUE, TRUE, TRUE)''',
                (user_id,)
            )
            prefs = execute_query(
                'SELECT * FROM notification_preferences WHERE user_id = %s',
                (user_id,),
                fetch_one=True
            )
        
        return jsonify({'preferences': prefs}), 200
    
    else:  # PUT
        data = request.json
        
        execute_query(
            '''UPDATE notification_preferences SET
               email_enabled = %s, push_enabled = %s, sms_enabled = %s,
               new_message = %s, post_interaction = %s, 
               subscription_alerts = %s, affiliate_updates = %s
               WHERE user_id = %s''',
            (data.get('email_enabled'), data.get('push_enabled'), data.get('sms_enabled'),
             data.get('new_message'), data.get('post_interaction'),
             data.get('subscription_alerts'), data.get('affiliate_updates'), user_id)
        )
        
        return jsonify({'message': 'Preferences updated'}), 200

@bp.route('/register-device', methods=['POST'])
@jwt_required()
def register_device():
    """Register device for push notifications"""
    user_id = get_jwt_identity()
    data = request.json
    
    device_token = data.get('device_token')
    device_type = data.get('device_type')  # ios, android, web
    
    if not device_token:
        return jsonify({'error': 'Device token required'}), 400
    
    # Check if device already registered
    existing = execute_query(
        'SELECT id FROM user_devices WHERE user_id = %s AND device_token = %s',
        (user_id, device_token),
        fetch_one=True
    )
    
    if existing:
        execute_query(
            'UPDATE user_devices SET is_active = TRUE, last_active = NOW() WHERE id = %s',
            (existing['id'],)
        )
    else:
        execute_query(
            '''INSERT INTO user_devices (user_id, device_token, device_type, is_active)
               VALUES (%s, %s, %s, TRUE)''',
            (user_id, device_token, device_type)
        )
    
    return jsonify({'message': 'Device registered successfully'}), 200

@bp.route('/unregister-device', methods=['POST'])
@jwt_required()
def unregister_device():
    """Unregister device from push notifications"""
    user_id = get_jwt_identity()
    data = request.json
    
    device_token = data.get('device_token')
    
    execute_query(
        'UPDATE user_devices SET is_active = FALSE WHERE user_id = %s AND device_token = %s',
        (user_id, device_token)
    )
    
    return jsonify({'message': 'Device unregistered'}), 200

@bp.route('/test', methods=['POST'])
@jwt_required()
def send_test_notification():
    """Send test notification"""
    user_id = get_jwt_identity()
    
    NotificationService.create_notification(
        user_id=user_id,
        notification_type='test',
        title='Test Notification',
        message='This is a test notification from Coffee Platform',
        priority='normal'
    )
    
    return jsonify({'message': 'Test notification sent'}), 200
