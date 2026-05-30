from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, verify_jwt_in_request
from database.db import execute_query, redis_client
from utils.middleware import cache_response
import json

bp = Blueprint('search', __name__, url_prefix='/api/search')

@bp.route('/users', methods=['GET'])
def search_users():
    """Advanced user search with filters"""
    query = request.args.get('q', '')
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 20))
    offset = (page - 1) * limit
    
    sql = '''SELECT u.*, 
             (SELECT COUNT(*) FROM posts WHERE user_id = u.id AND is_active = TRUE) as post_count,
             (SELECT AVG(rating) FROM user_ratings WHERE rated_user_id = u.id) as avg_rating
             FROM users u WHERE u.is_active = TRUE'''
    params = []
    
    if query:
        sql += ' AND (u.username LIKE %s OR u.full_name LIKE %s OR u.bio LIKE %s)'
        search_term = f'%{query}%'
        params.extend([search_term, search_term, search_term])
    
    # Filters
    if request.args.get('user_type'):
        sql += ' AND u.user_type = %s'
        params.append(request.args.get('user_type'))
    
    if request.args.get('ethnicity'):
        sql += ' AND u.ethnicity = %s'
        params.append(request.args.get('ethnicity'))
    
    # Sorting
    sort_by = request.args.get('sort_by', 'relevance')
    if sort_by == 'popular':
        sql += ' ORDER BY post_count DESC, u.profile_views DESC'
    elif sort_by == 'newest':
        sql += ' ORDER BY u.created_at DESC'
    else:
        sql += ' ORDER BY u.profile_views DESC'
    
    sql += ' LIMIT %s OFFSET %s'
    params.extend([limit, offset])
    
    results = execute_query(sql, tuple(params), fetch=True)
    
    return jsonify({'results': results, 'page': page}), 200

@bp.route('/recommendations', methods=['GET'])
@jwt_required()
def get_recommendations():
    """Get personalized recommendations"""
    user_id = get_jwt_identity()
    limit = int(request.args.get('limit', 10))
    
    # Recommend based on interaction history
    recommendations = execute_query(
        '''SELECT u.*, 
           (SELECT COUNT(*) FROM posts WHERE user_id = u.id) as post_count
           FROM users u
           WHERE u.is_active = TRUE AND u.id != %s
           ORDER BY post_count DESC, u.profile_views DESC
           LIMIT %s''',
        (user_id, limit),
        fetch=True
    )
    
    return jsonify({'recommendations': recommendations}), 200

@bp.route('/trending', methods=['GET'])
@cache_response(timeout=300)
def get_trending():
    """Get trending content"""
    
    trending_users = execute_query(
        '''SELECT u.*, COUNT(p.id) as recent_posts
           FROM users u
           LEFT JOIN posts p ON u.id = p.user_id 
           AND p.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
           WHERE u.is_active = TRUE
           GROUP BY u.id
           ORDER BY recent_posts DESC
           LIMIT 10''',
        fetch=True
    )
    
    trending_posts = execute_query(
        '''SELECT p.*, u.username, u.profile_image_url
           FROM posts p
           JOIN users u ON p.user_id = u.id
           WHERE p.is_active = TRUE
           ORDER BY (p.likes_count * 2 + p.comments_count * 3) DESC
           LIMIT 10''',
        fetch=True
    )
    
    return jsonify({
        'trending_users': trending_users,
        'trending_posts': trending_posts
    }), 200
