from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database.db import execute_query

bp = Blueprint('follows', __name__, url_prefix='/api/follows')

@bp.route('/follow/<int:user_id>', methods=['POST'])
@jwt_required()
def follow_user(user_id):
    follower_id = get_jwt_identity()
    
    if follower_id == user_id:
        return jsonify({'error': 'Cannot follow yourself'}), 400
    
    existing_follow = execute_query(
        'SELECT id FROM follows WHERE follower_id = %s AND following_id = %s',
        (follower_id, user_id),
        fetch_one=True
    )
    
    if existing_follow:
        execute_query('DELETE FROM follows WHERE follower_id = %s AND following_id = %s', (follower_id, user_id))
        return jsonify({'message': 'Unfollowed', 'following': False}), 200
    
    execute_query('INSERT INTO follows (follower_id, following_id) VALUES (%s, %s)', (follower_id, user_id))
    
    return jsonify({'message': 'Followed', 'following': True}), 200

@bp.route('/followers/<int:user_id>', methods=['GET'])
def get_followers(user_id):
    followers = execute_query(
        '''SELECT u.id, u.username, u.profile_image_url, u.user_type, u.is_verified
           FROM follows f
           JOIN users u ON f.follower_id = u.id
           WHERE f.following_id = %s
           ORDER BY f.created_at DESC''',
        (user_id,),
        fetch=True
    )
    
    return jsonify({'followers': followers, 'count': len(followers)}), 200

@bp.route('/following/<int:user_id>', methods=['GET'])
def get_following(user_id):
    following = execute_query(
        '''SELECT u.id, u.username, u.profile_image_url, u.user_type, u.is_verified
           FROM follows f
           JOIN users u ON f.following_id = u.id
           WHERE f.follower_id = %s
           ORDER BY f.created_at DESC''',
        (user_id,),
        fetch=True
    )
    
    return jsonify({'following': following, 'count': len(following)}), 200

@bp.route('/status/<int:user_id>', methods=['GET'])
@jwt_required()
def get_follow_status(user_id):
    follower_id = get_jwt_identity()
    
    is_following = execute_query(
        'SELECT id FROM follows WHERE follower_id = %s AND following_id = %s',
        (follower_id, user_id),
        fetch_one=True
    ) is not None
    
    return jsonify({'following': is_following}), 200

@bp.route('/stats/<int:user_id>', methods=['GET'])
def get_follow_stats(user_id):
    followers_count = execute_query(
        'SELECT COUNT(*) as count FROM follows WHERE following_id = %s',
        (user_id,),
        fetch_one=True
    )['count']
    
    following_count = execute_query(
        'SELECT COUNT(*) as count FROM follows WHERE follower_id = %s',
        (user_id,),
        fetch_one=True
    )['count']
    
    return jsonify({
        'followers_count': followers_count,
        'following_count': following_count
    }), 200
