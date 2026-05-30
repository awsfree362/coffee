from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database.db import execute_query, redis_client
from datetime import datetime, timedelta
from utils.middleware import subscription_required, cache_response
import json

bp = Blueprint('analytics', __name__, url_prefix='/api/analytics')

@bp.route('/dashboard', methods=['GET'])
@jwt_required()
@subscription_required()
def get_dashboard():
    """Get comprehensive analytics dashboard"""
    user_id = get_jwt_identity()
    
    user = execute_query('SELECT user_type FROM users WHERE id = %s', (user_id,), fetch_one=True)
    
    if user['user_type'] == 'escort':
        return get_escort_analytics(user_id)
    elif user['user_type'] == 'venue':
        return get_venue_analytics(user_id)
    elif user['user_type'] == 'visitor':
        return get_visitor_analytics(user_id)
    
    return jsonify({'error': 'Invalid user type'}), 400

def get_escort_analytics(user_id):
    """Detailed analytics for escorts"""
    
    # Profile views (last 30 days)
    profile_views = execute_query(
        '''SELECT DATE(created_at) as date, COUNT(*) as views
           FROM visitor_interactions
           WHERE target_user_id = %s AND interaction_type = 'contact_view'
           AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
           GROUP BY DATE(created_at)
           ORDER BY date DESC''',
        (user_id,),
        fetch=True
    )
    
    # Post performance
    post_stats = execute_query(
        '''SELECT 
           COUNT(*) as total_posts,
           SUM(views_count) as total_views,
           SUM(likes_count) as total_likes,
           SUM(comments_count) as total_comments,
           AVG(views_count) as avg_views,
           AVG(likes_count) as avg_likes
           FROM posts WHERE user_id = %s AND is_active = TRUE''',
        (user_id,),
        fetch_one=True
    )
    
    # Top performing posts
    top_posts = execute_query(
        '''SELECT id, caption, media_type, views_count, likes_count, comments_count,
           created_at
           FROM posts WHERE user_id = %s AND is_active = TRUE
           ORDER BY (views_count + likes_count * 2 + comments_count * 3) DESC
           LIMIT 5''',
        (user_id,),
        fetch=True
    )
    
    # Message statistics
    message_stats = execute_query(
        '''SELECT 
           COUNT(DISTINCT c.id) as total_conversations,
           COUNT(m.id) as total_messages,
           COUNT(DISTINCT DATE(m.created_at)) as active_days
           FROM conversations c
           LEFT JOIN messages m ON c.id = m.conversation_id
           WHERE (c.user1_id = %s OR c.user2_id = %s)
           AND m.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)''',
        (user_id, user_id),
        fetch_one=True
    )
    
    # Affiliate performance
    affiliate_stats = execute_query(
        '''SELECT 
           COUNT(DISTINCT referred_user_id) as total_referrals,
           SUM(commission_amount) as total_earned,
           SUM(CASE WHEN is_paid = FALSE AND is_used_for_subscription = FALSE 
               THEN commission_amount ELSE 0 END) as available_balance
           FROM affiliate_earnings WHERE affiliate_user_id = %s''',
        (user_id,),
        fetch_one=True
    )
    
    # Engagement rate
    engagement_rate = 0
    if post_stats['total_views'] and post_stats['total_views'] > 0:
        engagement_rate = ((post_stats['total_likes'] + post_stats['total_comments']) / 
                          post_stats['total_views'] * 100)
    
    # Growth metrics (compare to last month)
    last_month_posts = execute_query(
        '''SELECT COUNT(*) as count FROM posts 
           WHERE user_id = %s 
           AND created_at >= DATE_SUB(NOW(), INTERVAL 60 DAY)
           AND created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)''',
        (user_id,),
        fetch_one=True
    )
    
    this_month_posts = execute_query(
        '''SELECT COUNT(*) as count FROM posts 
           WHERE user_id = %s 
           AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)''',
        (user_id,),
        fetch_one=True
    )
    
    growth_rate = 0
    if last_month_posts['count'] > 0:
        growth_rate = ((this_month_posts['count'] - last_month_posts['count']) / 
                      last_month_posts['count'] * 100)
    
    return jsonify({
        'profile_views': profile_views,
        'post_stats': {
            **post_stats,
            'engagement_rate': round(engagement_rate, 2),
            'growth_rate': round(growth_rate, 2)
        },
        'top_posts': top_posts,
        'message_stats': message_stats,
        'affiliate_stats': affiliate_stats,
        'recommendations': generate_recommendations(post_stats, engagement_rate)
    }), 200

def get_venue_analytics(user_id):
    """Detailed analytics for venues"""
    
    # Event statistics
    event_stats = execute_query(
        '''SELECT 
           COUNT(*) as total_events,
           SUM(total_tickets - available_tickets) as tickets_sold,
           SUM((total_tickets - available_tickets) * ticket_price) as total_revenue,
           AVG(total_tickets - available_tickets) as avg_tickets_per_event
           FROM events WHERE venue_id = %s''',
        (user_id,),
        fetch_one=True
    )
    
    # Upcoming events
    upcoming_events = execute_query(
        '''SELECT id, event_name, event_date, ticket_price, 
           total_tickets, available_tickets,
           (total_tickets - available_tickets) as sold_tickets
           FROM events 
           WHERE venue_id = %s AND event_date > NOW() AND is_active = TRUE
           ORDER BY event_date ASC LIMIT 5''',
        (user_id,),
        fetch=True
    )
    
    # Revenue by month
    monthly_revenue = execute_query(
        '''SELECT 
           DATE_FORMAT(e.event_date, '%%Y-%%m') as month,
           SUM((e.total_tickets - e.available_tickets) * e.ticket_price) as revenue,
           COUNT(DISTINCT e.id) as events_count
           FROM events e
           WHERE e.venue_id = %s
           AND e.event_date >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
           GROUP BY DATE_FORMAT(e.event_date, '%%Y-%%m')
           ORDER BY month DESC''',
        (user_id,),
        fetch=True
    )
    
    # Ticket verification stats
    verification_stats = execute_query(
        '''SELECT 
           COUNT(*) as total_tickets_issued,
           SUM(CASE WHEN is_used = TRUE THEN 1 ELSE 0 END) as tickets_verified,
           SUM(CASE WHEN is_used = FALSE THEN 1 ELSE 0 END) as tickets_pending
           FROM event_tickets et
           JOIN events e ON et.event_id = e.id
           WHERE e.venue_id = %s''',
        (user_id,),
        fetch_one=True
    )
    
    return jsonify({
        'event_stats': event_stats,
        'upcoming_events': upcoming_events,
        'monthly_revenue': monthly_revenue,
        'verification_stats': verification_stats
    }), 200

def get_visitor_analytics(user_id):
    """Analytics for visitors"""
    
    # Interaction statistics
    interaction_stats = execute_query(
        '''SELECT 
           interaction_type,
           SUM(interaction_count) as total_count
           FROM visitor_interactions
           WHERE visitor_id = %s
           AND month_year = DATE_FORMAT(NOW(), '%%Y-%%m')
           GROUP BY interaction_type''',
        (user_id,),
        fetch=True
    )
    
    # Favorite profiles (most interacted with)
    favorite_profiles = execute_query(
        '''SELECT 
           u.id, u.username, u.profile_image_url,
           SUM(vi.interaction_count) as total_interactions
           FROM visitor_interactions vi
           JOIN users u ON vi.target_user_id = u.id
           WHERE vi.visitor_id = %s
           GROUP BY u.id, u.username, u.profile_image_url
           ORDER BY total_interactions DESC
           LIMIT 5''',
        (user_id,),
        fetch=True
    )
    
    # Message statistics
    message_stats = execute_query(
        '''SELECT 
           COUNT(DISTINCT c.id) as total_conversations,
           COUNT(m.id) as messages_sent
           FROM conversations c
           JOIN messages m ON c.id = m.conversation_id
           WHERE (c.user1_id = %s OR c.user2_id = %s)
           AND m.sender_id = %s''',
        (user_id, user_id, user_id),
        fetch_one=True
    )
    
    return jsonify({
        'interaction_stats': interaction_stats,
        'favorite_profiles': favorite_profiles,
        'message_stats': message_stats
    }), 200

def generate_recommendations(post_stats, engagement_rate):
    """Generate AI-powered recommendations"""
    recommendations = []
    
    if post_stats['total_posts'] < 5:
        recommendations.append({
            'type': 'content',
            'priority': 'high',
            'message': 'Post more content to increase visibility. Aim for at least 3 posts per week.'
        })
    
    if engagement_rate < 5:
        recommendations.append({
            'type': 'engagement',
            'priority': 'high',
            'message': 'Your engagement rate is low. Try posting at peak times (6-9 PM) and use engaging captions.'
        })
    
    if post_stats['avg_views'] < 100:
        recommendations.append({
            'type': 'visibility',
            'priority': 'medium',
            'message': 'Increase your visibility by engaging with other users and using relevant hashtags.'
        })
    
    return recommendations

@bp.route('/real-time', methods=['GET'])
@jwt_required()
def get_realtime_stats():
    """Get real-time statistics from Redis"""
    user_id = get_jwt_identity()
    
    # Get real-time data from Redis
    online_users = redis_client.scard('online_users')
    active_conversations = redis_client.get(f'active_conversations:{user_id}') or 0
    pending_notifications = redis_client.llen(f'notifications:{user_id}')
    
    return jsonify({
        'online_users': online_users,
        'active_conversations': int(active_conversations),
        'pending_notifications': pending_notifications,
        'timestamp': datetime.now().isoformat()
    }), 200

@bp.route('/export', methods=['POST'])
@jwt_required()
@subscription_required()
def export_analytics():
    """Export analytics data as CSV/JSON"""
    user_id = get_jwt_identity()
    data = request.json
    
    format_type = data.get('format', 'json')  # json or csv
    date_range = data.get('date_range', 30)  # days
    
    # Get all analytics data
    analytics_data = {
        'user_id': user_id,
        'generated_at': datetime.now().isoformat(),
        'date_range': date_range
    }
    
    # Add relevant data based on user type
    user = execute_query('SELECT user_type FROM users WHERE id = %s', (user_id,), fetch_one=True)
    
    if user['user_type'] == 'escort':
        analytics_data['posts'] = execute_query(
            '''SELECT * FROM posts 
               WHERE user_id = %s 
               AND created_at >= DATE_SUB(NOW(), INTERVAL %s DAY)''',
            (user_id, date_range),
            fetch=True
        )
    
    # Store in Redis for download
    export_key = f"export:{user_id}:{datetime.now().timestamp()}"
    redis_client.setex(export_key, 3600, json.dumps(analytics_data))
    
    return jsonify({
        'message': 'Export ready',
        'download_key': export_key,
        'expires_in': 3600
    }), 200

@bp.route('/heatmap', methods=['GET'])
@jwt_required()
@subscription_required()
def get_activity_heatmap():
    """Get activity heatmap data"""
    user_id = get_jwt_identity()
    
    # Get activity by hour and day of week
    heatmap_data = execute_query(
        '''SELECT 
           DAYOFWEEK(created_at) as day_of_week,
           HOUR(created_at) as hour,
           COUNT(*) as activity_count
           FROM posts
           WHERE user_id = %s
           AND created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)
           GROUP BY DAYOFWEEK(created_at), HOUR(created_at)
           ORDER BY day_of_week, hour''',
        (user_id,),
        fetch=True
    )
    
    return jsonify({'heatmap': heatmap_data}), 200

@bp.route('/competitors', methods=['GET'])
@jwt_required()
@subscription_required()
def get_competitor_analysis():
    """Analyze competitor performance"""
    user_id = get_jwt_identity()
    
    user = execute_query('SELECT user_type, ethnicity FROM users WHERE id = %s', (user_id,), fetch_one=True)
    
    # Find similar profiles
    competitors = execute_query(
        '''SELECT 
           u.id, u.username,
           COUNT(p.id) as post_count,
           AVG(p.views_count) as avg_views,
           AVG(p.likes_count) as avg_likes
           FROM users u
           LEFT JOIN posts p ON u.id = p.user_id
           WHERE u.user_type = %s
           AND u.ethnicity = %s
           AND u.id != %s
           AND u.is_active = TRUE
           GROUP BY u.id, u.username
           ORDER BY avg_views DESC
           LIMIT 10''',
        (user['user_type'], user['ethnicity'], user_id),
        fetch=True
    )
    
    # Get own stats for comparison
    own_stats = execute_query(
        '''SELECT 
           COUNT(id) as post_count,
           AVG(views_count) as avg_views,
           AVG(likes_count) as avg_likes
           FROM posts WHERE user_id = %s''',
        (user_id,),
        fetch_one=True
    )
    
    return jsonify({
        'own_stats': own_stats,
        'competitors': competitors,
        'market_position': calculate_market_position(own_stats, competitors)
    }), 200

def calculate_market_position(own_stats, competitors):
    """Calculate market position percentile"""
    if not competitors:
        return 50
    
    better_than = sum(1 for c in competitors if own_stats['avg_views'] > (c['avg_views'] or 0))
    percentile = (better_than / len(competitors)) * 100
    
    return round(percentile, 2)
