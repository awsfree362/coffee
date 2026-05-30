from functools import wraps
from flask import request, jsonify, g
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
from database.db import execute_query, redis_client
import time
import hashlib
import json
from datetime import datetime, timedelta

# Rate Limiting Middleware
class RateLimiter:
    def __init__(self, max_requests=100, window=60):
        self.max_requests = max_requests
        self.window = window
    
    def __call__(self, f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Get identifier (IP or user_id)
            identifier = request.remote_addr
            try:
                verify_jwt_in_request(optional=True)
                user_id = get_jwt_identity()
                if user_id:
                    identifier = f"user_{user_id}"
            except:
                pass
            
            # Rate limit key
            key = f"rate_limit:{identifier}:{f.__name__}"
            
            # Get current count
            current = redis_client.get(key)
            
            if current and int(current) >= self.max_requests:
                return jsonify({
                    'error': 'Rate limit exceeded',
                    'retry_after': self.window
                }), 429
            
            # Increment counter
            pipe = redis_client.pipeline()
            pipe.incr(key)
            pipe.expire(key, self.window)
            pipe.execute()
            
            return f(*args, **kwargs)
        return decorated_function

# Request Validation Middleware
def validate_request(*required_fields):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if request.method in ['POST', 'PUT', 'PATCH']:
                data = request.get_json() if request.is_json else request.form
                
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    return jsonify({
                        'error': 'Missing required fields',
                        'missing': missing_fields
                    }), 400
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

# Subscription Required Middleware
def subscription_required(user_types=None):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            verify_jwt_in_request()
            user_id = get_jwt_identity()
            
            # Check subscription
            subscription = execute_query(
                '''SELECT s.*, u.user_type FROM subscriptions s
                   JOIN users u ON s.user_id = u.id
                   WHERE s.user_id = %s AND s.is_active = TRUE 
                   AND s.payment_verified = TRUE AND s.end_date > NOW()
                   ORDER BY s.end_date DESC LIMIT 1''',
                (user_id,),
                fetch_one=True
            )
            
            if not subscription:
                return jsonify({
                    'error': 'Active subscription required',
                    'code': 'SUBSCRIPTION_REQUIRED'
                }), 403
            
            # Check user type if specified
            if user_types and subscription['user_type'] not in user_types:
                return jsonify({
                    'error': f'This feature is only for {", ".join(user_types)}',
                    'code': 'INVALID_USER_TYPE'
                }), 403
            
            g.subscription = subscription
            return f(*args, **kwargs)
        return decorated_function
    return decorator

# Request Logging Middleware
def log_request(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        start_time = time.time()
        
        # Log request
        request_id = hashlib.md5(f"{time.time()}{request.remote_addr}".encode()).hexdigest()[:16]
        g.request_id = request_id
        
        # Execute request
        response = f(*args, **kwargs)
        
        # Calculate duration
        duration = time.time() - start_time
        
        # Log to database (async in production)
        try:
            user_id = None
            try:
                verify_jwt_in_request(optional=True)
                user_id = get_jwt_identity()
            except:
                pass
            
            log_data = {
                'request_id': request_id,
                'user_id': user_id,
                'method': request.method,
                'path': request.path,
                'ip': request.remote_addr,
                'user_agent': request.user_agent.string,
                'duration': duration,
                'status': response[1] if isinstance(response, tuple) else 200,
                'timestamp': datetime.now().isoformat()
            }
            
            # Store in Redis for real-time monitoring
            redis_client.lpush('request_logs', json.dumps(log_data))
            redis_client.ltrim('request_logs', 0, 999)  # Keep last 1000 requests
            
        except Exception as e:
            print(f"Logging error: {e}")
        
        return response
    return decorated_function

# Cache Middleware
def cache_response(timeout=300):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Generate cache key
            cache_key = f"cache:{request.path}:{request.query_string.decode()}"
            
            # Try to get from cache
            cached = redis_client.get(cache_key)
            if cached:
                return json.loads(cached)
            
            # Execute function
            response = f(*args, **kwargs)
            
            # Cache response
            if isinstance(response, tuple) and response[1] == 200:
                redis_client.setex(cache_key, timeout, json.dumps(response[0]))
            elif not isinstance(response, tuple):
                redis_client.setex(cache_key, timeout, json.dumps(response))
            
            return response
        return decorated_function
    return decorator

# Permission Checker
def check_permission(permission):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            verify_jwt_in_request()
            user_id = get_jwt_identity()
            
            # Check user permissions
            user = execute_query(
                'SELECT user_type, is_verified FROM users WHERE id = %s',
                (user_id,),
                fetch_one=True
            )
            
            if not user:
                return jsonify({'error': 'User not found'}), 404
            
            # Permission logic
            permissions = {
                'create_post': ['escort', 'venue'],
                'create_event': ['venue'],
                'verify_ticket': ['venue'],
                'view_analytics': ['escort', 'venue'],
                'manage_users': ['admin']
            }
            
            allowed_types = permissions.get(permission, [])
            
            if user['user_type'] not in allowed_types:
                return jsonify({
                    'error': 'Permission denied',
                    'required_permission': permission
                }), 403
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

# Input Sanitization
def sanitize_input(data):
    """Sanitize user input to prevent XSS and injection attacks"""
    if isinstance(data, dict):
        return {k: sanitize_input(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [sanitize_input(item) for item in data]
    elif isinstance(data, str):
        # Remove potentially dangerous characters
        dangerous_chars = ['<', '>', '"', "'", '&', ';', '(', ')', '{', '}']
        for char in dangerous_chars:
            data = data.replace(char, '')
        return data.strip()
    return data

# API Version Middleware
def api_version(version='v1'):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            requested_version = request.headers.get('API-Version', 'v1')
            
            if requested_version != version:
                return jsonify({
                    'error': 'API version mismatch',
                    'requested': requested_version,
                    'supported': version
                }), 400
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

# Webhook Signature Verification
def verify_webhook_signature(secret_key):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            signature = request.headers.get('X-Webhook-Signature')
            
            if not signature:
                return jsonify({'error': 'Missing signature'}), 401
            
            # Verify signature
            payload = request.get_data()
            expected_signature = hashlib.sha256(
                (secret_key + payload.decode()).encode()
            ).hexdigest()
            
            if signature != expected_signature:
                return jsonify({'error': 'Invalid signature'}), 401
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

# Geo-blocking Middleware
def geo_block(blocked_countries=None):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Get country from IP (would use GeoIP service in production)
            ip = request.remote_addr
            
            # For now, just log
            # In production, integrate with MaxMind GeoIP or similar
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

# Request ID Middleware
def add_request_id(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        request_id = request.headers.get('X-Request-ID') or \
                     hashlib.md5(f"{time.time()}{request.remote_addr}".encode()).hexdigest()[:16]
        g.request_id = request_id
        
        response = f(*args, **kwargs)
        
        # Add request ID to response headers
        if isinstance(response, tuple):
            return response[0], response[1], {'X-Request-ID': request_id}
        return response, 200, {'X-Request-ID': request_id}
    
    return decorated_function
