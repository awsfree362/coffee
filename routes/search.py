from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, jwt_required
from database.db import execute_query
from datetime import datetime, timedelta
import re

bp = Blueprint('search', __name__, url_prefix='/api/search')

@bp.route('/query', methods=['GET'])
def search_query():
    """Main search endpoint with all filters"""
    query = request.args.get('q', '').strip()
    search_type = request.args.get('type', 'escort')  # escort, venue, all
    city = request.args.get('city', '')
    ethnicity = request.args.get('ethnicity', '')
    verified = request.args.get('verified', '')
    sort_by = request.args.get('sort', 'relevance')  # relevance, recent, popular
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 20))
    offset = (page - 1) * limit
    
    # Get current user if authenticated
    current_user_id = None
    try:
        current_user_id = get_jwt_identity()
    except:
        pass
    
    # Track search if user is logged in
    if current_user_id and query:
        track_search(current_user_id, query, search_type)
    
    # Track trending search
    if query:
        track_trending_search(query)
    
    # Build search conditions
    conditions = ['u.is_active = TRUE']
    params = []
    
    # Filter by type
    if search_type != 'all':
        conditions.append('u.user_type = %s')
        params.append(search_type)
    else:
        conditions.append("u.user_type IN ('escort', 'venue')")
    
    # Search query
    if query:
        conditions.append('(u.username LIKE %s OR u.full_name LIKE %s OR u.bio LIKE %s OR u.city LIKE %s OR u.ethnicity LIKE %s)')
        search_term = f'%{query}%'
        params.extend([search_term, search_term, search_term, search_term, search_term])
    
    # Additional filters
    if city:
        conditions.append('u.city = %s')
        params.append(city)
    
    if ethnicity:
        conditions.append('u.ethnicity = %s')
        params.append(ethnicity)
    
    if verified:
        conditions.append('u.is_verified = TRUE')
    
    # Sorting
    order_clause = 'u.created_at DESC'
    if sort_by == 'popular':
        order_clause = 'post_count DESC, u.created_at DESC'
    elif sort_by == 'recent':
        order_clause = 'u.created_at DESC'
    
    where_clause = ' AND '.join(conditions)
    params.extend([limit, offset])
    
    # Execute search
    users = execute_query(
        f'''SELECT u.id, u.username, u.full_name, u.bio, u.ethnicity, u.city, 
                   u.profile_image_url, u.user_type, u.is_verified,
                   (SELECT COUNT(*) FROM posts WHERE user_id = u.id AND is_active = TRUE) as post_count,
                   (SELECT COUNT(*) FROM user_follows WHERE following_id = u.id) as followers_count,
                   EXISTS(SELECT 1 FROM user_follows WHERE follower_id = %s AND following_id = u.id) as is_following
           FROM users u
           WHERE {where_clause}
           ORDER BY {order_clause}
           LIMIT %s OFFSET %s''',
        tuple([current_user_id] + params) if current_user_id else tuple([None] + params),
        fetch=True
    )
    
    # Get total count
    total = execute_query(
        f'SELECT COUNT(*) as count FROM users u WHERE {where_clause}',
        tuple(params[:-2]),
        fetch_one=True
    )
    
    return jsonify({
        'users': users,
        'total': total['count'],
        'page': page,
        'has_more': total['count'] > (page * limit)
    }), 200

@bp.route('/history', methods=['GET'])
@jwt_required()
def get_search_history():
    """Get user's search history"""
    user_id = get_jwt_identity()
    limit = int(request.args.get('limit', 10))
    
    history = execute_query(
        '''SELECT DISTINCT search_query, search_type, MAX(created_at) as last_searched
           FROM search_history
           WHERE user_id = %s
           GROUP BY search_query, search_type
           ORDER BY last_searched DESC
           LIMIT %s''',
        (user_id, limit),
        fetch=True
    )
    
    return jsonify({'history': history}), 200

@bp.route('/history/clear', methods=['DELETE'])
@jwt_required()
def clear_search_history():
    """Clear user's search history"""
    user_id = get_jwt_identity()
    
    execute_query(
        'DELETE FROM search_history WHERE user_id = %s',
        (user_id,)
    )
    
    return jsonify({'message': 'Search history cleared'}), 200

@bp.route('/history/delete', methods=['DELETE'])
@jwt_required()
def delete_search_history_item():
    """Delete specific search history item"""
    user_id = get_jwt_identity()
    query = request.json.get('query')
    
    execute_query(
        'DELETE FROM search_history WHERE user_id = %s AND search_query = %s',
        (user_id, query)
    )
    
    return jsonify({'message': 'Search deleted'}), 200

@bp.route('/trending', methods=['GET'])
def get_trending_searches():
    """Get trending searches for current week"""
    limit = int(request.args.get('limit', 10))
    week_year = datetime.now().strftime('%Y-%U')
    
    trending = execute_query(
        '''SELECT search_query, search_count
           FROM trending_searches
           WHERE week_year = %s
           ORDER BY search_count DESC
           LIMIT %s''',
        (week_year, limit),
        fetch=True
    )
    
    return jsonify({'trending': trending}), 200

@bp.route('/suggested', methods=['GET'])
@jwt_required()
def get_suggested_users():
    """Get suggested users based on follows and interactions"""
    user_id = get_jwt_identity()
    limit = int(request.args.get('limit', 10))
    search_type = request.args.get('type', 'escort')
    
    # Get users followed by people the current user follows
    # but not followed by current user
    suggested = execute_query(
        '''SELECT DISTINCT u.id, u.username, u.full_name, u.bio, u.ethnicity, u.city,
                  u.profile_image_url, u.user_type, u.is_verified,
                  (SELECT COUNT(*) FROM user_follows WHERE following_id = u.id) as followers_count
           FROM users u
           JOIN user_follows uf ON u.id = uf.following_id
           WHERE uf.follower_id IN (
               SELECT following_id FROM user_follows WHERE follower_id = %s
           )
           AND u.id != %s
           AND u.user_type = %s
           AND u.is_active = TRUE
           AND NOT EXISTS (
               SELECT 1 FROM user_follows WHERE follower_id = %s AND following_id = u.id
           )
           ORDER BY followers_count DESC
           LIMIT %s''',
        (user_id, user_id, search_type, user_id, limit),
        fetch=True
    )
    
    # If no suggested users, return popular users
    if not suggested:
        suggested = execute_query(
            '''SELECT u.id, u.username, u.full_name, u.bio, u.ethnicity, u.city,
                      u.profile_image_url, u.user_type, u.is_verified,
                      (SELECT COUNT(*) FROM user_follows WHERE following_id = u.id) as followers_count
               FROM users u
               WHERE u.is_active = TRUE 
               AND u.user_type = %s
               AND u.id != %s
               AND NOT EXISTS (
                   SELECT 1 FROM user_follows WHERE follower_id = %s AND following_id = u.id
               )
               ORDER BY followers_count DESC
               LIMIT %s''',
            (search_type, user_id, user_id, limit),
            fetch=True
        )
    
    return jsonify({'suggested': suggested}), 200

@bp.route('/recent', methods=['GET'])
@jwt_required()
def get_recent_profiles():
    """Get recently viewed profiles"""
    user_id = get_jwt_identity()
    limit = int(request.args.get('limit', 10))
    
    recent = execute_query(
        '''SELECT DISTINCT u.id, u.username, u.full_name, u.bio, u.ethnicity, u.city,
                  u.profile_image_url, u.user_type, u.is_verified,
                  pv.updated_at as last_viewed
           FROM profile_views pv
           JOIN users u ON pv.profile_id = u.id
           WHERE pv.viewer_id = %s AND u.is_active = TRUE
           ORDER BY pv.updated_at DESC
           LIMIT %s''',
        (user_id, limit),
        fetch=True
    )
    
    return jsonify({'recent': recent}), 200

@bp.route('/filters', methods=['GET'])
def get_search_filters():
    """Get all available search filters"""
    
    # Get unique cities
    cities = execute_query(
        '''SELECT DISTINCT city 
           FROM users 
           WHERE city IS NOT NULL AND city != '' AND is_active = TRUE
           ORDER BY city''',
        fetch=True
    )
    
    # Get unique ethnicities
    ethnicities = execute_query(
        '''SELECT DISTINCT ethnicity 
           FROM users 
           WHERE ethnicity IS NOT NULL AND ethnicity != '' AND is_active = TRUE
           ORDER BY ethnicity''',
        fetch=True
    )
    
    filters = {
        'cities': [c['city'] for c in cities],
        'ethnicities': [e['ethnicity'] for e in ethnicities],
        'sort_options': [
            {'value': 'relevance', 'label': 'Most Relevant'},
            {'value': 'recent', 'label': 'Most Recent'},
            {'value': 'popular', 'label': 'Most Popular'}
        ]
    }
    
    return jsonify({'filters': filters}), 200

@bp.route('/quick', methods=['GET'])
def quick_search():
    """Quick search for autocomplete - returns top 5 matches"""
    query = request.args.get('q', '').strip()
    search_type = request.args.get('type', 'escort')
    
    if not query or len(query) < 2:
        return jsonify({'results': []}), 200
    
    conditions = ['u.is_active = TRUE']
    params = []
    
    if search_type != 'all':
        conditions.append('u.user_type = %s')
        params.append(search_type)
    else:
        conditions.append("u.user_type IN ('escort', 'venue')")
    
    conditions.append('(u.username LIKE %s OR u.full_name LIKE %s)')
    search_term = f'{query}%'
    params.extend([search_term, search_term])
    
    where_clause = ' AND '.join(conditions)
    params.append(5)  # Limit to 5 results
    
    results = execute_query(
        f'''SELECT u.id, u.username, u.full_name, u.profile_image_url, u.user_type, u.is_verified
           FROM users u
           WHERE {where_clause}
           ORDER BY 
               CASE WHEN u.username LIKE %s THEN 1 ELSE 2 END,
               u.is_verified DESC,
               u.created_at DESC
           LIMIT %s''',
        tuple(params + [search_term]),
        fetch=True
    )
    
    return jsonify({'results': results}), 200

@bp.route('/preferences/save', methods=['POST'])
@jwt_required()
def save_search_preferences():
    """Save user's search filter preferences"""
    user_id = get_jwt_identity()
    data = request.json
    
    preference_name = data.get('name', 'Default')
    filters = data.get('filters', {})
    is_default = data.get('is_default', False)
    
    # If setting as default, remove default from others
    if is_default:
        execute_query(
            'UPDATE search_preferences SET is_default = FALSE WHERE user_id = %s',
            (user_id,)
        )
    
    execute_query(
        '''INSERT INTO search_preferences (user_id, preference_name, filters, is_default)
           VALUES (%s, %s, %s, %s)
           ON DUPLICATE KEY UPDATE filters = VALUES(filters), is_default = VALUES(is_default)''',
        (user_id, preference_name, str(filters), is_default)
    )
    
    return jsonify({'message': 'Preferences saved'}), 200

@bp.route('/preferences', methods=['GET'])
@jwt_required()
def get_search_preferences():
    """Get user's saved search preferences"""
    user_id = get_jwt_identity()
    
    preferences = execute_query(
        '''SELECT id, preference_name, filters, is_default, created_at
           FROM search_preferences
           WHERE user_id = %s
           ORDER BY is_default DESC, created_at DESC''',
        (user_id,),
        fetch=True
    )
    
    return jsonify({'preferences': preferences}), 200

# Helper functions
def track_search(user_id, query, search_type):
    """Track user search in history"""
    try:
        execute_query(
            '''INSERT INTO search_history (user_id, search_query, search_type)
               VALUES (%s, %s, %s)''',
            (user_id, query, search_type)
        )
    except Exception as e:
        print(f"Error tracking search: {e}")

def track_trending_search(query):
    """Track search in trending"""
    try:
        week_year = datetime.now().strftime('%Y-%U')
        execute_query(
            '''INSERT INTO trending_searches (search_query, search_count, week_year)
               VALUES (%s, 1, %s)
               ON DUPLICATE KEY UPDATE 
                   search_count = search_count + 1,
                   last_searched_at = CURRENT_TIMESTAMP''',
            (query, week_year)
        )
    except Exception as e:
        print(f"Error tracking trending: {e}")
