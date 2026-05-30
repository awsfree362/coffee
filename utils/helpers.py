import os
import bcrypt
import secrets
from datetime import datetime, timedelta
from PIL import Image
from werkzeug.utils import secure_filename
import qrcode
from io import BytesIO
import base64

ALLOWED_IMAGE_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
ALLOWED_VIDEO_EXTENSIONS = {'mp4', 'mov', 'avi', 'webm'}
ALLOWED_DOCUMENT_EXTENSIONS = {'pdf', 'doc', 'docx'}

def allowed_file(filename, file_type='image'):
    if '.' not in filename:
        return False
    ext = filename.rsplit('.', 1)[1].lower()
    if file_type == 'image':
        return ext in ALLOWED_IMAGE_EXTENSIONS
    elif file_type == 'video':
        return ext in ALLOWED_VIDEO_EXTENSIONS
    elif file_type == 'document':
        return ext in ALLOWED_DOCUMENT_EXTENSIONS
    return False

def save_file(file, folder, max_size=(1920, 1080)):
    if not file:
        return None
    
    filename = secure_filename(file.filename)
    unique_filename = f"{secrets.token_hex(16)}_{filename}"
    filepath = os.path.join('uploads', folder, unique_filename)
    
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    
    if allowed_file(filename, 'image'):
        img = Image.open(file)
        img.thumbnail(max_size, Image.Resampling.LANCZOS)
        img.save(filepath, optimize=True, quality=85)
    else:
        file.save(filepath)
    
    return filepath

def hash_password(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password, hashed):
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def generate_affiliate_code():
    return secrets.token_urlsafe(12)[:12].upper()

def generate_ticket_code():
    return secrets.token_urlsafe(16)

def generate_qr_code(data):
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    
    buffer = BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    
    qr_filename = f"{secrets.token_hex(16)}.png"
    qr_filepath = os.path.join('uploads', 'qrcodes', qr_filename)
    os.makedirs(os.path.dirname(qr_filepath), exist_ok=True)
    
    with open(qr_filepath, 'wb') as f:
        f.write(buffer.getvalue())
    
    return qr_filepath

def calculate_age(birth_date):
    today = datetime.now().date()
    if isinstance(birth_date, str):
        birth_date = datetime.strptime(birth_date, '%Y-%m-%d').date()
    return today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))

def get_month_year():
    return datetime.now().strftime('%Y-%m')

def add_months(date, months):
    month = date.month - 1 + months
    year = date.year + month // 12
    month = month % 12 + 1
    day = min(date.day, [31, 29 if year % 4 == 0 and (year % 100 != 0 or year % 400 == 0) else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1])
    return date.replace(year=year, month=month, day=day)
