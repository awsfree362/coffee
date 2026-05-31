from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database.db import execute_query
from utils.helpers import save_file, get_month_year

bp = Blueprint('reels', __name__, url_prefix='/api/reels')

def can_user_create_reel(user_id):
    user = execute_query('SELECT user_type FROM users WHERE id = %s', (user_id,), fetch_one=True)
    
    if user['user_type'] == 'visitor':
        return False
    
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
def create_reel():
    user_id = get_jwt_identity()
    
    if not can_user_create_reel(user_id):
        return jsonify({
            'error': 'Subscription Required',
            'message': 'You need an active subscription to create reels. Subscribe now!',
            'redirect': '/subscription'
        }), 403
    
    data = request.form
    files = request.files
    
    if 'video' not in files:
        return jsonify({'error': 'Video file required'}), 400
    
    video_file = files['video']
    video_url = save_file(video_file, 'reels')
    
    reel_id = execute_query(
        '''INSERT INTO reels (user_id, caption, video_url, duration) 
           VALUES (%s, %s, %s, %s)''',
        (user_id, data.get('caption'), video_url, data.get('duration', 0))
    )
    
    return jsonify({'message': 'Reel created', 'reel_id': reel_id}), 201

@bp.route('/feed', methods=['GET'])
def get_reels_feed():
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 20))
    offset = (page - 1) * limit
    
    reels = execute_query(
        '''SELECT r.*, u.username, u.profile_image_url, u.user_type, u.is_verified
           FROM reels r
           JOIN users u ON r.user_id = u.id
           WHERE r.is_active = TRUE
           ORDER BY r.created_at DESC
           LIMIT %s OFFSET %s''',
        (limit, offset),
        fetch=True
    )
    
    return jsonify({'reels': reels, 'page': page}), 200

@bp.route('/<int:reel_id>', methods=['GET'])
def get_reel(reel_id):
    reel = execute_query(
        '''SELECT r.*, u.username, u.profile_image_url, u.user_type, u.is_verified
           FROM reels r
           JOIN users u ON r.user_id = u.id
           WHERE r.id = %s AND r.is_active = TRUE''',
        (reel_id,),
        fetch_one=True
    )
    
    if not reel:
        return jsonify({'error': 'Reel not found'}), 404
    
    execute_query('UPDATE reels SET views_count = views_count + 1 WHERE id = %s', (reel_id,))
    
    return jsonify({'reel': reel}), 200

@bp.route('/<int:reel_id>/like', methods=['POST'])
@jwt_required()
def like_reel(reel_id):
    user_id = get_jwt_identity()
    
    existing_like = execute_query(
        'SELECT id FROM reel_likes WHERE reel_id = %s AND user_id = %s',
        (reel_id, user_id),
        fetch_one=True
    )
    
    if existing_like:
        execute_query('DELETE FROM reel_likes WHERE reel_id = %s AND user_id = %s', (reel_id, user_id))
        execute_query('UPDATE reels SET likes_count = likes_count - 1 WHERE id = %s', (reel_id,))
        return jsonify({'message': 'Reel unliked', 'liked': False}), 200
    
    execute_query('INSERT INTO reel_likes (reel_id, user_id) VALUES (%s, %s)', (reel_id, user_id))
    execute_query('UPDATE reels SET likes_count = likes_count + 1 WHERE id = %s', (reel_id,))
    
    return jsonify({'message': 'Reel liked', 'liked': True}), 200

@bp.route('/<int:reel_id>/comment', methods=['POST'])
@jwt_required()
def comment_on_reel(reel_id):
    user_id = get_jwt_identity()
    data = request.json
    
    if not data.get('comment_text'):
        return jsonify({'error': 'Comment text required'}), 400
    
    comment_id = execute_query(
        'INSERT INTO reel_comments (reel_id, user_id, comment_text) VALUES (%s, %s, %s)',
        (reel_id, user_id, data['comment_text'])
    )
    
    execute_query('UPDATE reels SET comments_count = comments_count + 1 WHERE id = %s', (reel_id,))
    
    return jsonify({'message': 'Comment added', 'comment_id': comment_id}), 201

@bp.route('/<int:reel_id>/comments', methods=['GET'])
def get_reel_comments(reel_id):
    comments = execute_query(
        '''SELECT c.*, u.username, u.profile_image_url
           FROM reel_comments c
           JOIN users u ON c.user_id = u.id
           WHERE c.reel_id = %s
           ORDER BY c.created_at DESC''',
        (reel_id,),
        fetch=True
    )
    
    return jsonify({'comments': comments}), 200

@bp.route('/<int:reel_id>/update', methods=['PUT'])
@jwt_required()
def update_reel(reel_id):
    user_id = get_jwt_identity()
    
    reel = execute_query('SELECT user_id FROM reels WHERE id = %s', (reel_id,), fetch_one=True)
    if not reel or reel['user_id'] != user_id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    data = request.json
    execute_query('UPDATE reels SET caption = %s WHERE id = %s', (data.get('caption'), reel_id))
    
    return jsonify({'message': 'Reel updated'}), 200

@bp.route('/<int:reel_id>/delete', methods=['DELETE'])
@jwt_required()
def delete_reel(reel_id):
    user_id = get_jwt_identity()
    
    reel = execute_query('SELECT user_id FROM reels WHERE id = %s', (reel_id,), fetch_one=True)
    if not reel or reel['user_id'] != user_id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    execute_query('UPDATE reels SET is_active = FALSE WHERE id = %s', (reel_id,))
    
    return jsonify({'message': 'Reel deleted'}), 200

@bp.route('/user/<int:user_id>', methods=['GET'])
def get_user_reels(user_id):
    reels = execute_query(
        '''SELECT r.*, u.username, u.profile_image_url
           FROM reels r
           JOIN users u ON r.user_id = u.id
           WHERE r.user_id = %s AND r.is_active = TRUE
           ORDER BY r.created_at DESC''',
        (user_id,),
        fetch=True
    )
    
    return jsonify({'reels': reels}), 200
