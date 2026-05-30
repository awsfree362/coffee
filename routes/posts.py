from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, verify_jwt_in_request
from database.db import execute_query
from utils.helpers import save_file, get_month_year
from datetime import datetime

bp = Blueprint('posts', __name__, url_prefix='/api/posts')

def can_user_post(user_id):
    user = execute_query('SELECT user_type FROM users WHERE id = %s', (user_id,), fetch_one=True)
    
    subscription = execute_query(
        '''SELECT * FROM subscriptions 
           WHERE user_id = %s AND is_active = TRUE AND payment_verified = TRUE AND end_date > NOW()
           ORDER BY end_date DESC LIMIT 1''',
        (user_id,),
        fetch_one=True
    )
    
    return subscription is not None

def can_user_like(user_id):
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
    
    # Check free tier limit
    month_year = get_month_year()
    interaction = execute_query(
        '''SELECT interaction_count FROM visitor_interactions 
           WHERE visitor_id = %s AND interaction_type = %s AND month_year = %s''',
        (user_id, 'like', month_year),
        fetch_one=True
    )
    
    return not interaction or interaction['interaction_count'] < 10

def can_user_comment(user_id):
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
    
    # Check free tier limit
    month_year = get_month_year()
    interaction = execute_query(
        '''SELECT interaction_count FROM visitor_interactions 
           WHERE visitor_id = %s AND interaction_type = %s AND month_year = %s''',
        (user_id, 'comment', month_year),
        fetch_one=True
    )
    
    return not interaction or interaction['interaction_count'] < 10

@bp.route('/create', methods=['POST'])
@jwt_required()
def create_post():
    user_id = get_jwt_identity()
    
    if not can_user_post(user_id):
        return jsonify({'error': 'Active subscription required to post'}), 403
    
    data = request.form
    files = request.files
    
    if 'media' not in files:
        return jsonify({'error': 'Media file required'}), 400
    
    media_file = files['media']
    media_type = data.get('media_type', 'image')
    
    media_url = save_file(media_file, 'posts')
    
    post_id = execute_query(
        '''INSERT INTO posts (user_id, caption, media_type, media_url, duration) 
           VALUES (%s, %s, %s, %s, %s)''',
        (user_id, data.get('caption'), media_type, media_url, data.get('duration', 0))
    )
    
    return jsonify({'message': 'Post created', 'post_id': post_id}), 201

@bp.route('/feed', methods=['GET'])
def get_feed():
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 20))
    offset = (page - 1) * limit
    
    posts = execute_query(
        '''SELECT p.*, u.username, u.profile_image_url, u.user_type
           FROM posts p
           JOIN users u ON p.user_id = u.id
           WHERE p.is_active = TRUE
           ORDER BY p.created_at DESC
           LIMIT %s OFFSET %s''',
        (limit, offset),
        fetch=True
    )
    
    return jsonify({'posts': posts, 'page': page}), 200

@bp.route('/<int:post_id>', methods=['GET'])
def get_post(post_id):
    post = execute_query(
        '''SELECT p.*, u.username, u.profile_image_url, u.user_type
           FROM posts p
           JOIN users u ON p.user_id = u.id
           WHERE p.id = %s AND p.is_active = TRUE''',
        (post_id,),
        fetch_one=True
    )
    
    if not post:
        return jsonify({'error': 'Post not found'}), 404
    
    # Increment view count
    execute_query('UPDATE posts SET views_count = views_count + 1 WHERE id = %s', (post_id,))
    
    return jsonify({'post': post}), 200

@bp.route('/<int:post_id>/like', methods=['POST'])
@jwt_required()
def like_post(post_id):
    user_id = get_jwt_identity()
    
    if not can_user_like(user_id):
        return jsonify({'error': 'Monthly like limit reached. Upgrade to premium.'}), 403
    
    # Check if already liked
    existing_like = execute_query(
        'SELECT id FROM post_likes WHERE post_id = %s AND user_id = %s',
        (post_id, user_id),
        fetch_one=True
    )
    
    if existing_like:
        # Unlike
        execute_query('DELETE FROM post_likes WHERE post_id = %s AND user_id = %s', (post_id, user_id))
        execute_query('UPDATE posts SET likes_count = likes_count - 1 WHERE id = %s', (post_id,))
        return jsonify({'message': 'Post unliked'}), 200
    
    # Like
    execute_query('INSERT INTO post_likes (post_id, user_id) VALUES (%s, %s)', (post_id, user_id))
    execute_query('UPDATE posts SET likes_count = likes_count + 1 WHERE id = %s', (post_id,))
    
    # Track interaction for free visitors
    user = execute_query('SELECT user_type FROM users WHERE id = %s', (user_id,), fetch_one=True)
    if user['user_type'] == 'visitor':
        month_year = get_month_year()
        execute_query(
            '''INSERT INTO visitor_interactions (visitor_id, interaction_type, month_year, interaction_count)
               VALUES (%s, %s, %s, 1)
               ON DUPLICATE KEY UPDATE interaction_count = interaction_count + 1''',
            (user_id, 'like', month_year)
        )
    
    return jsonify({'message': 'Post liked'}), 200

@bp.route('/<int:post_id>/comment', methods=['POST'])
@jwt_required()
def comment_on_post(post_id):
    user_id = get_jwt_identity()
    
    if not can_user_comment(user_id):
        return jsonify({'error': 'Monthly comment limit reached. Upgrade to premium.'}), 403
    
    data = request.json
    
    if not data.get('comment_text'):
        return jsonify({'error': 'Comment text required'}), 400
    
    comment_id = execute_query(
        'INSERT INTO post_comments (post_id, user_id, comment_text) VALUES (%s, %s, %s)',
        (post_id, user_id, data['comment_text'])
    )
    
    execute_query('UPDATE posts SET comments_count = comments_count + 1 WHERE id = %s', (post_id,))
    
    # Track interaction for free visitors
    user = execute_query('SELECT user_type FROM users WHERE id = %s', (user_id,), fetch_one=True)
    if user['user_type'] == 'visitor':
        month_year = get_month_year()
        execute_query(
            '''INSERT INTO visitor_interactions (visitor_id, interaction_type, month_year, interaction_count)
               VALUES (%s, %s, %s, 1)
               ON DUPLICATE KEY UPDATE interaction_count = interaction_count + 1''',
            (user_id, 'comment', month_year)
        )
    
    return jsonify({'message': 'Comment added', 'comment_id': comment_id}), 201

@bp.route('/<int:post_id>/comments', methods=['GET'])
def get_post_comments(post_id):
    comments = execute_query(
        '''SELECT c.*, u.username, u.profile_image_url
           FROM post_comments c
           JOIN users u ON c.user_id = u.id
           WHERE c.post_id = %s
           ORDER BY c.created_at DESC''',
        (post_id,),
        fetch=True
    )
    
    return jsonify({'comments': comments}), 200

@bp.route('/user/<int:user_id>', methods=['GET'])
def get_user_posts(user_id):
    posts = execute_query(
        '''SELECT p.*, u.username, u.profile_image_url
           FROM posts p
           JOIN users u ON p.user_id = u.id
           WHERE p.user_id = %s AND p.is_active = TRUE
           ORDER BY p.created_at DESC''',
        (user_id,),
        fetch=True
    )
    
    return jsonify({'posts': posts}), 200
