from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database.db import execute_query
from utils.helpers import save_file

bp = Blueprint('users', __name__, url_prefix='/api/users')

def can_view_contact(viewer_id, profile_user_id):
    # Check if viewer has premium subscription
    viewer_subscription = execute_query(
        '''SELECT * FROM subscriptions 
           WHERE user_id = %s AND is_active = TRUE AND payment_verified = TRUE AND end_date > NOW()
           ORDER BY end_date DESC LIMIT 1''',
        (viewer_id,),
        fetch_one=True
    )
    
    if viewer_subscription:
        return True
    
    # Check if profile owner has active subscription
    profile_subscription = execute_query(
        '''SELECT * FROM subscriptions 
           WHERE user_id = %s AND is_active = TRUE AND payment_verified = TRUE AND end_date > NOW()
           ORDER BY end_date DESC LIMIT 1''',
        (profile_user_id,),
        fetch_one=True
    )
    
    return profile_subscription is not None

@bp.route('/profile/<int:user_id>', methods=['GET'])
def get_user_profile(user_id):
    user = execute_query(
        '''SELECT id, username, full_name, bio, ethnicity, profile_image_url, user_type, created_at
           FROM users WHERE id = %s AND is_active = TRUE''',
        (user_id,),
        fetch_one=True
    )
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Get subscription status
    subscription = execute_query(
        '''SELECT * FROM subscriptions 
           WHERE user_id = %s AND is_active = TRUE AND payment_verified = TRUE AND end_date > NOW()
           ORDER BY end_date DESC LIMIT 1''',
        (user_id,),
        fetch_one=True
    )
    
    user['has_active_subscription'] = subscription is not None
    user['subscription_end_date'] = subscription['end_date'] if subscription else None
    
    # Get post count
    post_count = execute_query(
        'SELECT COUNT(*) as count FROM posts WHERE user_id = %s AND is_active = TRUE',
        (user_id,),
        fetch_one=True
    )
    user['post_count'] = post_count['count']
    
    return jsonify({'user': user}), 200

@bp.route('/profile/<int:user_id>/contact', methods=['GET'])
@jwt_required()
def get_user_contact(user_id):
    viewer_id = get_jwt_identity()
    
    if not can_view_contact(viewer_id, user_id):
        return jsonify({
            'error': 'Contact information locked',
            'message': 'Upgrade to premium or wait for profile owner to renew subscription'
        }), 403
    
    user = execute_query(
        'SELECT phone, email, address FROM users WHERE id = %s',
        (user_id,),
        fetch_one=True
    )
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify({'contact': user}), 200

@bp.route('/profile/update', methods=['PUT'])
@jwt_required()
def update_profile():
    user_id = get_jwt_identity()
    data = request.form
    files = request.files
    
    updates = []
    params = []
    
    if 'full_name' in data:
        updates.append('full_name = %s')
        params.append(data['full_name'])
    
    if 'bio' in data:
        updates.append('bio = %s')
        params.append(data['bio'])
    
    if 'ethnicity' in data:
        updates.append('ethnicity = %s')
        params.append(data['ethnicity'])
    
    if 'phone' in data:
        updates.append('phone = %s')
        params.append(data['phone'])
    
    if 'address' in data:
        updates.append('address = %s')
        params.append(data['address'])
    
    if 'city' in data:
        updates.append('city = %s')
        params.append(data['city'])
    
    if 'profile_image' in files:
        profile_image_url = save_file(files['profile_image'], 'profiles')
        updates.append('profile_image_url = %s')
        params.append(profile_image_url)
    
    if not updates:
        return jsonify({'error': 'No fields to update'}), 400
    
    params.append(user_id)
    query = f"UPDATE users SET {', '.join(updates)} WHERE id = %s"
    
    execute_query(query, tuple(params))
    
    return jsonify({'message': 'Profile updated successfully'}), 200

@bp.route('/search', methods=['GET'])
def search_users():
    query = request.args.get('q', '')
    user_type = request.args.get('user_type', '')
    city = request.args.get('city', '')
    ethnicity = request.args.get('ethnicity', '')
    verified = request.args.get('verified', '')
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 20))
    offset = (page - 1) * limit
    
    # Build query conditions - exclude visitors from search
    conditions = ['is_active = TRUE', "user_type != 'visitor'"]
    params = []
    
    if user_type:
        conditions.append('user_type = %s')
        params.append(user_type)
    
    if city:
        conditions.append('city = %s')
        params.append(city)
    
    if ethnicity:
        conditions.append('ethnicity = %s')
        params.append(ethnicity)
    
    if verified:
        conditions.append('is_verified = TRUE')
    
    if query:
        conditions.append('(username LIKE %s OR full_name LIKE %s OR bio LIKE %s OR city LIKE %s)')
        search_term = f'%{query}%'
        params.extend([search_term, search_term, search_term, search_term])
    
    params.extend([limit, offset])
    
    where_clause = ' AND '.join(conditions)
    
    users = execute_query(
        f'''SELECT id, username, full_name, bio, ethnicity, city, profile_image_url, user_type, is_verified
           FROM users 
           WHERE {where_clause}
           LIMIT %s OFFSET %s''',
        tuple(params),
        fetch=True
    )
    
    return jsonify({'users': users, 'page': page}), 200

@bp.route('/featured', methods=['GET'])
def get_featured_users():
    limit = int(request.args.get('limit', 10))
    user_type = request.args.get('type', 'escort')
    
    users = execute_query(
        '''SELECT u.id, u.username, u.full_name, u.bio, u.ethnicity, u.city, u.profile_image_url, u.user_type, u.is_verified,
           (SELECT COUNT(*) FROM posts WHERE user_id = u.id AND is_active = TRUE) as post_count
           FROM users u
           JOIN subscriptions s ON u.id = s.user_id
           WHERE u.is_active = TRUE AND u.user_type = %s 
           AND s.is_active = TRUE AND s.payment_verified = TRUE AND s.end_date > NOW()
           ORDER BY post_count DESC, u.created_at DESC
           LIMIT %s''',
        (user_type, limit),
        fetch=True
    )
    
    return jsonify({'users': users}), 200

@bp.route('/online', methods=['GET'])
def get_online_users():
    from app import online_users
    limit = int(request.args.get('limit', 8))
    user_type = request.args.get('type', 'escort')
    
    if not online_users:
        # Return recent active users if no one is online
        users = execute_query(
            '''SELECT id, username, full_name, bio, ethnicity, city, profile_image_url, user_type, is_verified
               FROM users 
               WHERE is_active = TRUE AND user_type = %s
               ORDER BY created_at DESC
               LIMIT %s''',
            (user_type, limit),
            fetch=True
        )
    else:
        online_ids = ','.join(str(uid) for uid in online_users)
        users = execute_query(
            f'''SELECT id, username, full_name, bio, ethnicity, city, profile_image_url, user_type, is_verified
               FROM users 
               WHERE is_active = TRUE AND user_type = %s AND id IN ({online_ids})
               LIMIT %s''',
            (user_type, limit),
            fetch=True
        )
    
    for user in users:
        user['is_online'] = user['id'] in online_users
    
    return jsonify({'users': users}), 200
