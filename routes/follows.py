from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database.db import execute_query

bp = Blueprint('follows', __name__, url_prefix='/api/follows')

@bp.route('/follow/<int:user_id>', methods=['POST'])
@jwt_required()
def toggle_follow(user_id):
    """Follow or unfollow a user"""
    follower_id = get_jwt_identity()
    
    if follower_id == user_id:
        return jsonify({'error': 'Cannot follow yourself'}), 400
    
    # Check if already following
    existing = execute_query(
        'SELECT id FROM user_follows WHERE follower_id = %s AND following_id = %s',
        (follower_id, user_id),
        fetch_one=True
    )
    
    if existing:
        # Unfollow
        execute_query(
            'DELETE FROM user_follows WHERE follower_id = %s AND following_id = %s',
            (follower_id, user_id)
        )
        return jsonify({'following': False, 'message': 'Unfollowed'}), 200
    else:
        # Follow
        execute_query(
            'INSERT INTO user_follows (follower_id, following_id) VALUES (%s, %s)',
            (follower_id, user_id)
        )
        return jsonify({'following': True, 'message': 'Following'}), 200

@bp.route('/status/<int:user_id>', methods=['GET'])
@jwt_required()
def check_follow_status(user_id):
    """Check if current user follows the specified user"""
    follower_id = get_jwt_identity()
    
    following = execute_query(
        'SELECT id FROM user_follows WHERE follower_id = %s AND following_id = %s',
        (follower_id, user_id),
        fetch_one=True
    )
    
    return jsonify({'following': following is not None}), 200

@bp.route('/stats/<int:user_id>', methods=['GET'])
def get_follow_stats(user_id):
    """Get follower and following counts for a user"""
    
    followers = execute_query(
        'SELECT COUNT(*) as count FROM user_follows WHERE following_id = %s',
        (user_id,),
        fetch_one=True
    )
    
    following = execute_query(
        'SELECT COUNT(*) as count FROM user_follows WHERE follower_id = %s',
        (user_id,),
        fetch_one=True
    )
    
    return jsonify({
        'followers_count': followers['count'],
        'following_count': following['count']
    }), 200

@bp.route('/followers/<int:user_id>', methods=['GET'])
def get_followers(user_id):
    """Get list of followers"""
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 20))
    offset = (page - 1) * limit
    
    followers = execute_query(
        '''SELECT u.id, u.username, u.full_name, u.profile_image_url, 
                  u.user_type, u.is_verified, u.bio
           FROM user_follows uf
           JOIN users u ON uf.follower_id = u.id
           WHERE uf.following_id = %s AND u.is_active = TRUE
           ORDER BY uf.created_at DESC
           LIMIT %s OFFSET %s''',
        (user_id, limit, offset),
        fetch=True
    )
    
    return jsonify({'followers': followers}), 200

@bp.route('/following/<int:user_id>', methods=['GET'])
def get_following(user_id):
    """Get list of users being followed"""
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 20))
    offset = (page - 1) * limit
    
    following = execute_query(
        '''SELECT u.id, u.username, u.full_name, u.profile_image_url, 
                  u.user_type, u.is_verified, u.bio
           FROM user_follows uf
           JOIN users u ON uf.following_id = u.id
           WHERE uf.follower_id = %s AND u.is_active = TRUE
           ORDER BY uf.created_at DESC
           LIMIT %s OFFSET %s''',
        (user_id, limit, offset),
        fetch=True
    )
    
    return jsonify({'following': following}), 200

@bp.route('/mutual/<int:user_id>', methods=['GET'])
@jwt_required()
def get_mutual_follows(user_id):
    """Get mutual followers between current user and specified user"""
    current_user_id = get_jwt_identity()
    
    mutual = execute_query(
        '''SELECT DISTINCT u.id, u.username, u.full_name, u.profile_image_url,
                  u.user_type, u.is_verified
           FROM users u
           WHERE u.id IN (
               SELECT following_id FROM user_follows WHERE follower_id = %s
           )
           AND u.id IN (
               SELECT following_id FROM user_follows WHERE follower_id = %s
           )
           AND u.is_active = TRUE
           LIMIT 20''',
        (current_user_id, user_id),
        fetch=True
    )
    
    return jsonify({
        'mutual': mutual,
        'count': len(mutual)
    }), 200
