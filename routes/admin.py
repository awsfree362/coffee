from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database.db import execute_query, redis_client
from utils.middleware import check_permission, RateLimiter
from datetime import datetime, timedelta
import json

bp = Blueprint('admin', __name__, url_prefix='/api/admin')

def is_admin(user_id):
    """Check if user is admin"""
    admin = execute_query(
        'SELECT role, permissions FROM admin_users WHERE user_id = %s',
        (user_id,),
        fetch_one=True
    )
    return admin is not None

def log_admin_action(admin_id, action, entity_type, entity_id, old_values=None, new_values=None):
    """Log admin actions for audit trail"""
    execute_query(
        '''INSERT INTO audit_logs (admin_id, action, entity_type, entity_id, old_values, new_values, ip_address)
           VALUES (%s, %s, %s, %s, %s, %s, %s)''',
        (admin_id, action, entity_type, entity_id, 
         json.dumps(old_values) if old_values else None,
         json.dumps(new_values) if new_values else None,
         request.remote_addr)
    )

@bp.route('/dashboard', methods=['GET'])
@jwt_required()
def admin_dashboard():
    """Get admin dashboard statistics"""
    user_id = get_jwt_identity()
    
    if not is_admin(user_id):
        return jsonify({'error': 'Admin access required'}), 403
    
    # Get comprehensive statistics
    stats = {
        'users': get_user_statistics(),
        'revenue': get_revenue_statistics(),
        'content': get_content_statistics(),
        'activity': get_activity_statistics(),
        'reports': get_reports_statistics()
    }
    
    return jsonify(stats), 200

def get_user_statistics():
    """Get user statistics"""
    total_users = execute_query(
        'SELECT COUNT(*) as count FROM users WHERE is_active = TRUE',
        fetch_one=True
    )['count']
    
    users_by_type = execute_query(
        '''SELECT user_type, COUNT(*) as count 
           FROM users WHERE is_active = TRUE 
           GROUP BY user_type''',
        fetch=True
    )
    
    new_users_today = execute_query(
        '''SELECT COUNT(*) as count FROM users 
           WHERE DATE(created_at) = CURDATE()''',
        fetch_one=True
    )['count']
    
    new_users_this_week = execute_query(
        '''SELECT COUNT(*) as count FROM users 
           WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)''',
        fetch_one=True
    )['count']
    
    active_subscriptions = execute_query(
        '''SELECT COUNT(*) as count FROM subscriptions 
           WHERE is_active = TRUE AND payment_verified = TRUE 
           AND end_date > NOW()''',
        fetch_one=True
    )['count']
    
    return {
        'total_users': total_users,
        'users_by_type': users_by_type,
        'new_users_today': new_users_today,
        'new_users_this_week': new_users_this_week,
        'active_subscriptions': active_subscriptions
    }

def get_revenue_statistics():
    """Get revenue statistics"""
    total_revenue = execute_query(
        '''SELECT SUM(amount) as total FROM payment_transactions 
           WHERE status = 'verified' ''',
        fetch_one=True
    )['total'] or 0
    
    revenue_this_month = execute_query(
        '''SELECT SUM(amount) as total FROM payment_transactions 
           WHERE status = 'verified' 
           AND MONTH(created_at) = MONTH(NOW())
           AND YEAR(created_at) = YEAR(NOW())''',
        fetch_one=True
    )['total'] or 0
    
    revenue_by_type = execute_query(
        '''SELECT transaction_type, SUM(amount) as total 
           FROM payment_transactions 
           WHERE status = 'verified'
           GROUP BY transaction_type''',
        fetch=True
    )
    
    pending_payments = execute_query(
        '''SELECT COUNT(*) as count, SUM(amount) as total 
           FROM payment_transactions 
           WHERE status = 'pending' ''',
        fetch_one=True
    )
    
    return {
        'total_revenue': float(total_revenue),
        'revenue_this_month': float(revenue_this_month),
        'revenue_by_type': revenue_by_type,
        'pending_payments': pending_payments
    }

def get_content_statistics():
    """Get content statistics"""
    total_posts = execute_query(
        'SELECT COUNT(*) as count FROM posts WHERE is_active = TRUE',
        fetch_one=True
    )['count']
    
    posts_today = execute_query(
        '''SELECT COUNT(*) as count FROM posts 
           WHERE DATE(created_at) = CURDATE()''',
        fetch_one=True
    )['count']
    
    total_events = execute_query(
        'SELECT COUNT(*) as count FROM events WHERE is_active = TRUE',
        fetch_one=True
    )['count']
    
    total_messages = execute_query(
        'SELECT COUNT(*) as count FROM messages',
        fetch_one=True
    )['count']
    
    return {
        'total_posts': total_posts,
        'posts_today': posts_today,
        'total_events': total_events,
        'total_messages': total_messages
    }

def get_activity_statistics():
    """Get activity statistics"""
    # Get from Redis
    online_users = redis_client.scard('online_users') or 0
    
    active_conversations = execute_query(
        '''SELECT COUNT(*) as count FROM conversations 
           WHERE last_message_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)''',
        fetch_one=True
    )['count']
    
    return {
        'online_users': online_users,
        'active_conversations': active_conversations
    }

def get_reports_statistics():
    """Get reports statistics"""
    pending_reports = execute_query(
        '''SELECT COUNT(*) as count FROM reported_content 
           WHERE status = 'pending' ''',
        fetch_one=True
    )['count']
    
    reports_by_type = execute_query(
        '''SELECT content_type, COUNT(*) as count 
           FROM reported_content 
           WHERE status = 'pending'
           GROUP BY content_type''',
        fetch=True
    )
    
    return {
        'pending_reports': pending_reports,
        'reports_by_type': reports_by_type
    }

@bp.route('/users', methods=['GET'])
@jwt_required()
def list_users():
    """List all users with filters"""
    user_id = get_jwt_identity()
    
    if not is_admin(user_id):
        return jsonify({'error': 'Admin access required'}), 403
    
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 50))
    user_type = request.args.get('user_type')
    search = request.args.get('search', '')
    status = request.args.get('status', 'active')
    
    offset = (page - 1) * limit
    
    query = '''SELECT u.*, 
               (SELECT COUNT(*) FROM subscriptions WHERE user_id = u.id AND is_active = TRUE) as has_subscription,
               (SELECT COUNT(*) FROM posts WHERE user_id = u.id) as post_count
               FROM users u WHERE 1=1'''
    params = []
    
    if user_type:
        query += ' AND u.user_type = %s'
        params.append(user_type)
    
    if search:
        query += ' AND (u.username LIKE %s OR u.email LIKE %s OR u.full_name LIKE %s)'
        search_param = f'%{search}%'
        params.extend([search_param, search_param, search_param])
    
    if status == 'active':
        query += ' AND u.is_active = TRUE'
    elif status == 'inactive':
        query += ' AND u.is_active = FALSE'
    
    query += ' ORDER BY u.created_at DESC LIMIT %s OFFSET %s'
    params.extend([limit, offset])
    
    users = execute_query(query, tuple(params), fetch=True)
    
    total = execute_query(
        'SELECT COUNT(*) as count FROM users WHERE is_active = TRUE',
        fetch_one=True
    )['count']
    
    return jsonify({
        'users': users,
        'page': page,
        'total': total,
        'pages': (total + limit - 1) // limit
    }), 200

@bp.route('/users/<int:user_id>', methods=['GET', 'PUT', 'DELETE'])
@jwt_required()
def manage_user(user_id):
    """Get, update, or delete user"""
    admin_id = get_jwt_identity()
    
    if not is_admin(admin_id):
        return jsonify({'error': 'Admin access required'}), 403
    
    if request.method == 'GET':
        user = execute_query(
            '''SELECT u.*, 
               (SELECT COUNT(*) FROM posts WHERE user_id = u.id) as post_count,
               (SELECT COUNT(*) FROM subscriptions WHERE user_id = u.id) as subscription_count,
               (SELECT SUM(amount) FROM payment_transactions WHERE user_id = u.id AND status = 'verified') as total_spent
               FROM users u WHERE u.id = %s''',
            (user_id,),
            fetch_one=True
        )
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Get subscriptions
        subscriptions = execute_query(
            'SELECT * FROM subscriptions WHERE user_id = %s ORDER BY created_at DESC',
            (user_id,),
            fetch=True
        )
        
        # Get recent activity
        recent_posts = execute_query(
            'SELECT * FROM posts WHERE user_id = %s ORDER BY created_at DESC LIMIT 5',
            (user_id,),
            fetch=True
        )
        
        return jsonify({
            'user': user,
            'subscriptions': subscriptions,
            'recent_posts': recent_posts
        }), 200
    
    elif request.method == 'PUT':
        data = request.json
        
        # Get old values for audit
        old_user = execute_query(
            'SELECT * FROM users WHERE id = %s',
            (user_id,),
            fetch_one=True
        )
        
        # Update user
        updates = []
        params = []
        
        if 'is_active' in data:
            updates.append('is_active = %s')
            params.append(data['is_active'])
        
        if 'is_verified' in data:
            updates.append('is_verified = %s')
            params.append(data['is_verified'])
        
        if 'user_type' in data:
            updates.append('user_type = %s')
            params.append(data['user_type'])
        
        if updates:
            params.append(user_id)
            execute_query(
                f"UPDATE users SET {', '.join(updates)} WHERE id = %s",
                tuple(params)
            )
            
            log_admin_action(admin_id, 'update_user', 'user', user_id, old_user, data)
        
        return jsonify({'message': 'User updated successfully'}), 200
    
    elif request.method == 'DELETE':
        # Soft delete
        execute_query(
            'UPDATE users SET is_active = FALSE WHERE id = %s',
            (user_id,)
        )
        
        log_admin_action(admin_id, 'delete_user', 'user', user_id)
        
        return jsonify({'message': 'User deleted successfully'}), 200

@bp.route('/payments/pending', methods=['GET'])
@jwt_required()
def pending_payments():
    """Get pending payment verifications"""
    admin_id = get_jwt_identity()
    
    if not is_admin(admin_id):
        return jsonify({'error': 'Admin access required'}), 403
    
    payments = execute_query(
        '''SELECT pt.*, u.username, u.email, u.user_type, s.subscription_type
           FROM payment_transactions pt
           JOIN users u ON pt.user_id = u.id
           LEFT JOIN subscriptions s ON pt.related_id = s.id AND pt.transaction_type = 'subscription'
           WHERE pt.status = 'pending'
           ORDER BY pt.created_at DESC''',
        fetch=True
    )
    
    return jsonify({'payments': payments}), 200

@bp.route('/payments/<int:payment_id>/verify', methods=['POST'])
@jwt_required()
def verify_payment(payment_id):
    """Verify a payment"""
    admin_id = get_jwt_identity()
    
    if not is_admin(admin_id):
        return jsonify({'error': 'Admin access required'}), 403
    
    data = request.json
    action = data.get('action')  # 'approve' or 'reject'
    notes = data.get('notes', '')
    
    payment = execute_query(
        'SELECT * FROM payment_transactions WHERE id = %s',
        (payment_id,),
        fetch_one=True
    )
    
    if not payment:
        return jsonify({'error': 'Payment not found'}), 404
    
    if action == 'approve':
        # Update payment status
        execute_query(
            'UPDATE payment_transactions SET status = %s WHERE id = %s',
            ('verified', payment_id)
        )
        
        # Activate subscription if applicable
        if payment['transaction_type'] == 'subscription':
            execute_query(
                'UPDATE subscriptions SET payment_verified = TRUE, is_active = TRUE WHERE id = %s',
                (payment['related_id'],)
            )
            
            # Process affiliate commission
            user = execute_query(
                'SELECT referred_by FROM users WHERE id = %s',
                (payment['user_id'],),
                fetch_one=True
            )
            
            if user and user['referred_by']:
                commission_amount = payment['amount'] * 0.20
                execute_query(
                    '''INSERT INTO affiliate_earnings (affiliate_user_id, referred_user_id, subscription_id, commission_amount)
                       VALUES (%s, %s, %s, %s)''',
                    (user['referred_by'], payment['user_id'], payment['related_id'], commission_amount)
                )
        
        log_admin_action(admin_id, 'approve_payment', 'payment', payment_id, None, {'notes': notes})
        
        return jsonify({'message': 'Payment approved'}), 200
    
    elif action == 'reject':
        execute_query(
            'UPDATE payment_transactions SET status = %s WHERE id = %s',
            ('failed', payment_id)
        )
        
        log_admin_action(admin_id, 'reject_payment', 'payment', payment_id, None, {'notes': notes})
        
        return jsonify({'message': 'Payment rejected'}), 200
    
    return jsonify({'error': 'Invalid action'}), 400

@bp.route('/reports', methods=['GET'])
@jwt_required()
def get_reports():
    """Get reported content"""
    admin_id = get_jwt_identity()
    
    if not is_admin(admin_id):
        return jsonify({'error': 'Admin access required'}), 403
    
    status = request.args.get('status', 'pending')
    
    reports = execute_query(
        '''SELECT rc.*, u.username as reporter_username
           FROM reported_content rc
           JOIN users u ON rc.reporter_id = u.id
           WHERE rc.status = %s
           ORDER BY rc.created_at DESC''',
        (status,),
        fetch=True
    )
    
    return jsonify({'reports': reports}), 200

@bp.route('/reports/<int:report_id>/resolve', methods=['POST'])
@jwt_required()
def resolve_report(report_id):
    """Resolve a report"""
    admin_id = get_jwt_identity()
    
    if not is_admin(admin_id):
        return jsonify({'error': 'Admin access required'}), 403
    
    data = request.json
    action = data.get('action')  # 'remove_content', 'warn_user', 'ban_user', 'dismiss'
    notes = data.get('notes', '')
    
    report = execute_query(
        'SELECT * FROM reported_content WHERE id = %s',
        (report_id,),
        fetch_one=True
    )
    
    if not report:
        return jsonify({'error': 'Report not found'}), 404
    
    # Take action based on decision
    if action == 'remove_content':
        if report['content_type'] == 'post':
            execute_query(
                'UPDATE posts SET is_active = FALSE WHERE id = %s',
                (report['content_id'],)
            )
        elif report['content_type'] == 'user':
            execute_query(
                'UPDATE users SET is_active = FALSE WHERE id = %s',
                (report['content_id'],)
            )
    
    elif action == 'ban_user':
        # Get the user who created the content
        if report['content_type'] == 'post':
            post = execute_query(
                'SELECT user_id FROM posts WHERE id = %s',
                (report['content_id'],),
                fetch_one=True
            )
            if post:
                execute_query(
                    'UPDATE users SET is_active = FALSE WHERE id = %s',
                    (post['user_id'],)
                )
    
    # Update report status
    execute_query(
        '''UPDATE reported_content 
           SET status = 'resolved', reviewed_by = %s, resolution_notes = %s, resolved_at = NOW()
           WHERE id = %s''',
        (admin_id, notes, report_id)
    )
    
    log_admin_action(admin_id, 'resolve_report', 'report', report_id, None, {'action': action, 'notes': notes})
    
    return jsonify({'message': 'Report resolved'}), 200

@bp.route('/analytics/export', methods=['POST'])
@jwt_required()
def export_analytics():
    """Export system analytics"""
    admin_id = get_jwt_identity()
    
    if not is_admin(admin_id):
        return jsonify({'error': 'Admin access required'}), 403
    
    data = request.json
    report_type = data.get('report_type')  # 'users', 'revenue', 'activity'
    date_from = data.get('date_from')
    date_to = data.get('date_to')
    
    # Generate report based on type
    # Store in Redis for download
    export_key = f"admin_export:{admin_id}:{datetime.now().timestamp()}"
    
    report_data = {
        'type': report_type,
        'generated_at': datetime.now().isoformat(),
        'generated_by': admin_id
    }
    
    redis_client.setex(export_key, 3600, json.dumps(report_data))
    
    return jsonify({
        'message': 'Export ready',
        'download_key': export_key
    }), 200

@bp.route('/settings', methods=['GET', 'PUT'])
@jwt_required()
def system_settings():
    """Get or update system settings"""
    admin_id = get_jwt_identity()
    
    if not is_admin(admin_id):
        return jsonify({'error': 'Admin access required'}), 403
    
    if request.method == 'GET':
        settings = execute_query(
            'SELECT * FROM system_settings ORDER BY setting_key',
            fetch=True
        )
        return jsonify({'settings': settings}), 200
    
    else:  # PUT
        data = request.json
        
        for key, value in data.items():
            execute_query(
                'UPDATE system_settings SET setting_value = %s WHERE setting_key = %s',
                (str(value), key)
            )
        
        log_admin_action(admin_id, 'update_settings', 'system', None, None, data)
        
        return jsonify({'message': 'Settings updated'}), 200

@bp.route('/audit-log', methods=['GET'])
@jwt_required()
def get_audit_log():
    """Get audit log"""
    admin_id = get_jwt_identity()
    
    if not is_admin(admin_id):
        return jsonify({'error': 'Admin access required'}), 403
    
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 50))
    offset = (page - 1) * limit
    
    logs = execute_query(
        '''SELECT al.*, au.role as admin_role, u.username as admin_username
           FROM audit_logs al
           LEFT JOIN admin_users au ON al.admin_id = au.id
           LEFT JOIN users u ON au.user_id = u.id
           ORDER BY al.created_at DESC
           LIMIT %s OFFSET %s''',
        (limit, offset),
        fetch=True
    )
    
    return jsonify({'logs': logs, 'page': page}), 200
