from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from database.db import execute_query
from utils.helpers import hash_password, verify_password, generate_affiliate_code, calculate_age, save_file
from datetime import datetime

bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@bp.route('/register', methods=['POST'])
def register():
    data = request.form
    files = request.files
    
    required_fields = ['username', 'email', 'password', 'user_type', 'full_name', 'date_of_birth']
    if not all(field in data for field in required_fields):
        return jsonify({'error': 'Missing required fields'}), 400
    
    # Validate age
    age = calculate_age(data['date_of_birth'])
    if age < 18:
        return jsonify({'error': 'Must be 18 years or older'}), 400
    
    # Check if user exists
    existing_user = execute_query(
        'SELECT id FROM users WHERE email = %s OR username = %s',
        (data['email'], data['username']),
        fetch_one=True
    )
    if existing_user:
        return jsonify({'error': 'User already exists'}), 400
    
    # Handle file uploads
    profile_image_url = save_file(files.get('profile_image'), 'profiles') if 'profile_image' in files else None
    id_document_url = save_file(files.get('id_document'), 'profiles') if 'id_document' in files else None
    
    # Hash password
    password_hash = hash_password(data['password'])
    
    # Generate affiliate code
    affiliate_code = generate_affiliate_code()
    
    # Get referrer if affiliate code provided
    referred_by = None
    if 'referral_code' in data and data['referral_code']:
        referrer = execute_query(
            'SELECT id FROM users WHERE affiliate_code = %s',
            (data['referral_code'],),
            fetch_one=True
        )
        if referrer:
            referred_by = referrer['id']
    
    # Insert user
    user_id = execute_query(
        '''INSERT INTO users (username, email, password_hash, user_type, full_name, phone, 
           address, city, bio, ethnicity, date_of_birth, id_document_url, profile_image_url, 
           affiliate_code, referred_by) 
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)''',
        (data['username'], data['email'], password_hash, data['user_type'], data['full_name'],
         data.get('phone'), data.get('address'), data.get('city'), data.get('bio'), data.get('ethnicity'),
         data['date_of_birth'], id_document_url, profile_image_url, affiliate_code, referred_by)
    )
    
    access_token = create_access_token(identity=user_id)
    
    return jsonify({
        'message': 'Registration successful',
        'access_token': access_token,
        'user_id': user_id,
        'affiliate_code': affiliate_code
    }), 201

@bp.route('/login', methods=['POST'])
def login():
    data = request.json
    
    if not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Email and password required'}), 400
    
    user = execute_query(
        'SELECT * FROM users WHERE email = %s AND is_active = TRUE',
        (data['email'],),
        fetch_one=True
    )
    
    if not user or not verify_password(data['password'], user['password_hash']):
        return jsonify({'error': 'Invalid credentials'}), 401
    
    access_token = create_access_token(identity=user['id'])
    
    return jsonify({
        'access_token': access_token,
        'user': {
            'id': user['id'],
            'username': user['username'],
            'email': user['email'],
            'user_type': user['user_type'],
            'profile_image_url': user['profile_image_url'],
            'affiliate_code': user['affiliate_code']
        }
    }), 200

@bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    user_id = get_jwt_identity()
    
    user = execute_query(
        'SELECT id, username, email, user_type, full_name, phone, bio, ethnicity, profile_image_url, affiliate_code FROM users WHERE id = %s',
        (user_id,),
        fetch_one=True
    )
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify({'user': user}), 200

@bp.route('/verify-age', methods=['POST'])
def verify_age():
    data = request.json
    if not data.get('confirmed'):
        return jsonify({'error': 'Age verification required'}), 403
    return jsonify({'message': 'Age verified'}), 200
