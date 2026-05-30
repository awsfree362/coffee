import os
from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_socketio import SocketIO
from dotenv import load_dotenv
import redis

load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY')
app.config['MAX_CONTENT_LENGTH'] = int(os.getenv('MAX_CONTENT_LENGTH', 52428800))
app.config['UPLOAD_FOLDER'] = os.getenv('UPLOAD_FOLDER', 'uploads')

CORS(app, resources={r"/api/*": {"origins": "*"}})
jwt = JWTManager(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='gevent')

# Redis connection
redis_client = redis.from_url(os.getenv('REDIS_URL'))

# Track online users
online_users = set()

# Import routes after app initialization
from flask import render_template, send_from_directory

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/uploads/<path:filename>')
def serve_upload(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

# Import and register blueprints
try:
    from routes import (auth, users, posts, messages, subscriptions, affiliates, 
                       events, payments, analytics, notifications, admin, search, bookings)
    
    app.register_blueprint(auth.bp)
    app.register_blueprint(users.bp)
    app.register_blueprint(posts.bp)
    app.register_blueprint(messages.bp)
    app.register_blueprint(subscriptions.bp)
    app.register_blueprint(affiliates.bp)
    app.register_blueprint(events.bp)
    app.register_blueprint(payments.bp)
    app.register_blueprint(analytics.bp)
    app.register_blueprint(notifications.bp)
    app.register_blueprint(admin.bp)
    app.register_blueprint(search.bp)
    app.register_blueprint(bookings.bp)
    
    # Register socketio handlers
    messages.register_socketio_handlers(socketio)
except ImportError as e:
    print(f"Warning: Could not import routes: {e}")

if __name__ == '__main__':
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    os.makedirs(os.path.join(app.config['UPLOAD_FOLDER'], 'profiles'), exist_ok=True)
    os.makedirs(os.path.join(app.config['UPLOAD_FOLDER'], 'posts'), exist_ok=True)
    os.makedirs(os.path.join(app.config['UPLOAD_FOLDER'], 'messages'), exist_ok=True)
    os.makedirs(os.path.join(app.config['UPLOAD_FOLDER'], 'events'), exist_ok=True)
    os.makedirs(os.path.join(app.config['UPLOAD_FOLDER'], 'payments'), exist_ok=True)
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)
