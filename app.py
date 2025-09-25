from flask import Flask, request, jsonify, render_template, session, redirect, url_for, send_from_directory, send_file, make_response
from flask_cors import CORS
from database import Database
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
import os
from dotenv import load_dotenv
import io
import smtplib
from email.mime.text import MIMEText

try:
    # Optional dependency used for PDF generation
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.lib.styles import getSampleStyleSheet
    REPORTLAB_AVAILABLE = True
except Exception:
    REPORTLAB_AVAILABLE = False

load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY', 'dev-secret-key')
CORS(app)

db = Database()

# ----------------- STATIC FILE ROUTES -----------------
@app.route('/css/<path:filename>')
def serve_css(filename):
    return send_from_directory('css', filename)

@app.route('/js/<path:filename>')
def serve_js(filename):
    return send_from_directory('js', filename)

@app.route('/Assets/<path:filename>')
def serve_assets(filename):
    return send_from_directory('Assets', filename)

# ----------------- MAIN ROUTES -----------------
@app.route('/')
def home():
    return render_template('index.html')

@app.route('/login')
def login_page():
    return render_template('login.html')

@app.route('/resetpassword.html')
def reset_password_page():
    return render_template('resetpassword.html')

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    user_type = data.get('user_type')
    
    if not username or not password:
        return jsonify({'success': False, 'message': 'Username and password are required'})
    
    if user_type == 'student':
        student = db.get_student_by_number(username)
        if student and check_password_hash(student['password'], password):
            session['user_id'] = student['id']
            session['user_type'] = 'student'
            session['student_number'] = student['student_number']
            return jsonify({'success': True, 'redirect': '/dashboard'})
        else:
            return jsonify({'success': False, 'message': 'Invalid student number or password'})
    
    elif user_type == 'admin':
        if username == 'admin@demo.com' and password == 'admin123':
            session['user_id'] = 'admin'
            session['user_type'] = 'admin'
            return jsonify({'success': True, 'redirect': '/admin-dashboard'})
        else:
            return jsonify({'success': False, 'message': 'Invalid admin credentials'})
    
    return jsonify({'success': False, 'message': 'Invalid user type'})

# ----------------- STUDENT DASHBOARD -----------------
@app.route('/dashboard')
def dashboard():
    if 'user_id' not in session or session['user_type'] != 'student':
        return redirect(url_for('login_page'))
    
    student = db.get_student_by_id(session['user_id'])
    applications = db.get_student_applications(session['user_id'])
    
    response = make_response(render_template('Dashboard.html', student=student, applications=applications))
    # Prevent caching of protected pages
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response

# ----------------- ADMIN DASHBOARD -----------------
@app.route('/admin-dashboard')
def admin_dashboard():
    if 'user_id' not in session or session['user_type'] != 'admin':
        return redirect(url_for('login_page'))
    
    response = make_response(render_template('Admin.html'))
    # Prevent caching of protected pages
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response

@app.route('/api/students', methods=['GET'])
def get_students():
    if 'user_id' not in session or session['user_type'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 401
    students = db.get_all_students()
    return jsonify(students)

# ----------------- APPLICATION ROUTES (legacy UI redirect) -----------------
@app.route('/api/apply', methods=['POST'])
def apply_for_housing():
    if 'user_id' not in session or session['user_type'] != 'student':
        # For form submits, redirect to login; for JSON, return 401
        if request.is_json:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 401
        return redirect(url_for('login_page'))
    
    # Accept both JSON and form posts
    if request.is_json:
        data = request.get_json() or {}
        app_type = data.get('appType')
        gender = data.get('gender')
    else:
        app_type = request.form.get('appType')
        gender = request.form.get('gender')
    
    if not app_type:
        if request.is_json:
            return jsonify({'success': False, 'message': 'Application type is required'})
        # On form submits, send back to dashboard with a simple redirect
        return redirect(url_for('dashboard'))
    
    session['application_type'] = app_type
    session['application_gender'] = gender
    
    if app_type == 'on':
        if gender == 'male':
            if request.is_json:
                return jsonify({'redirect': '/male-residences'})
            return redirect(url_for('male_residences'))
        elif gender == 'female':
            if request.is_json:
                return jsonify({'redirect': '/female-residences'})
            return redirect(url_for('female_residences'))
        else:
            if request.is_json:
                return jsonify({'success': False, 'message': 'Gender is required for on-campus application'})
            return redirect(url_for('dashboard'))
    elif app_type == 'off':
        target = f"/off-campus-residences?gender={gender or ''}"
        if request.is_json:
            return jsonify({'redirect': target})
        return redirect(target)
    
    if request.is_json:
        return jsonify({'success': False, 'message': 'Invalid application type'})
    return redirect(url_for('dashboard'))

@app.route('/male-residences')
def male_residences():
    if 'user_id' not in session or session.get('application_type') != 'on':
        return redirect(url_for('dashboard'))
    
    response = make_response(render_template('maleRes.Html'))
    # Prevent caching of protected pages
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response

@app.route('/female-residences')
def female_residences():
    if 'user_id' not in session or session.get('application_type') != 'on':
        return redirect(url_for('dashboard'))
    
    response = make_response(render_template('female.html'))
    # Prevent caching of protected pages
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response

@app.route('/off-campus-residences')
def off_campus_residences():
    if 'user_id' not in session or session.get('application_type') != 'off':
        return redirect(url_for('dashboard'))
    gender = request.args.get('gender', '')
    
    response = make_response(render_template('OffCampus.html', gender=gender))
    # Prevent caching of protected pages
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response

# ----------------- PUBLIC RESIDENCES API (for selection pages) -----------------
@app.route('/api/residences', methods=['GET'])
def api_residences():
    on_campus = request.args.get('on_campus')
    res_type = request.args.get('type')
    on_campus_bool = None
    if on_campus is not None:
        on_campus_bool = on_campus.lower() in ('1','true','yes','on')
    rows = db.get_residences(on_campus_bool, res_type)
    return jsonify(rows)

@app.route('/api/offcampus/sync', methods=['POST'])
def api_offcampus_sync():
    if 'user_id' not in session or session['user_type'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 401
    data = request.get_json() or {}
    names = data.get('residence_names') or []
    created = []
    for name in names:
        rid = db.upsert_residence(name, '', False, 'offcamp', 10, '')
        if rid:
            created.append(rid)
    return jsonify({'success': True, 'ids': created})

@app.route('/api/applications', methods=['POST'])
def api_create_applications():
    if 'user_id' not in session or session['user_type'] != 'student':
        return jsonify({'error': 'Unauthorized'}), 401
    data = request.get_json() or {}
    student_id = session['user_id']
    selections = data.get('residences') or []
    if not isinstance(selections, list) or len(selections) == 0:
        return jsonify({'error': 'No residences provided'}), 400

    # Normalize selections: accept string like "Name - Block" or dicts
    normalized = []
    for sel in selections:
        if isinstance(sel, dict):
            normalized.append(sel)
        elif isinstance(sel, str):
            parts = [p.strip() for p in sel.split('-')]
            if len(parts) >= 2:
                normalized.append({'residence_name': parts[0], 'block': '-'.join(parts[1:]).strip()})
            else:
                normalized.append({'residence_name': sel.strip(), 'block': ''})
        else:
            return jsonify({'error': 'Invalid residence selection format'}), 400

    success, error, created_ids = db.create_applications_with_validation(student_id, normalized)
    if not success:
        print(f"/api/applications create failed: student={student_id} error={error}")
        return jsonify({'error': error}), 400
    
    # Send application submitted email
    try:
        student = db.get_student_by_id(student_id)
        if student:
            residence_names = [sel.get('residence_name', '') for sel in normalized]
            application_date = datetime.now().strftime('%B %d, %Y')
            send_application_submitted_email(
                f"{student['first_name']} {student['last_name']}", 
                residence_names, 
                application_date, 
                student['email']
            )
    except Exception as e:
        print(f"Failed to send application submitted email: {e}")
    
    print(f"/api/applications created: student={student_id} ids={created_ids}")
    return jsonify({'success': True, 'application_ids': created_ids}), 201

@app.route('/api/applications/<int:student_id>', methods=['GET'])
def api_get_student_applications(student_id):
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    # Students can only view their own; admin can view any
    if session.get('user_type') != 'admin' and session.get('user_id') != student_id:
        return jsonify({'error': 'Forbidden'}), 403
    apps = db.get_student_applications(student_id)
    return jsonify(apps)

@app.route('/api/applications/me', methods=['GET'])
def api_get_my_applications():
    if 'user_id' not in session or session.get('user_type') != 'student':
        return jsonify({'error': 'Unauthorized'}), 401
    apps = db.get_student_applications(session['user_id'])
    return jsonify(apps)

@app.route('/api/applications', methods=['GET'])
def api_get_all_applications():
    if 'user_id' not in session or session['user_type'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 401
    apps = db.get_all_applications()
    return jsonify(apps)

@app.route('/api/applications/<int:app_id>/approve', methods=['POST'])
def api_approve_application(app_id):
    if 'user_id' not in session or session['user_type'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 401
    details = db.get_application_with_details(app_id)
    if not details:
        return jsonify({'error': 'Application not found'}), 404
    updated = db.update_application_status(app_id, 'Approved')
    if not updated:
        return jsonify({'error': 'Failed to update'}), 500
    
    # Send approval email
    try:
        application_date = details['apply_date'].strftime('%B %d, %Y') if details['apply_date'] else 'N/A'
        send_application_approved_email(
            f"{details['first_name']} {details['last_name']}",
            details['residence_name'],
            application_date,
            details['email']
        )
    except Exception as e:
        print(f"Failed to send approval email: {e}")
    
    return jsonify({'success': True})

@app.route('/api/applications/<int:app_id>/reject', methods=['POST'])
def api_reject_application(app_id):
    if 'user_id' not in session or session['user_type'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 401
    details = db.get_application_with_details(app_id)
    if not details:
        return jsonify({'error': 'Application not found'}), 404
    updated = db.update_application_status(app_id, 'Rejected')
    if not updated:
        return jsonify({'error': 'Failed to update'}), 500
    
    # Send rejection email
    try:
        send_application_rejected_email(
            f"{details['first_name']} {details['last_name']}",
            details['residence_name'],
            details['email']
        )
    except Exception as e:
        print(f"Failed to send rejection email: {e}")
    
    return jsonify({'success': True})

@app.route('/api/applications/<int:app_id>/accept', methods=['POST'])
def api_accept_offer(app_id):
    if 'user_id' not in session or session['user_type'] != 'student':
        return jsonify({'error': 'Unauthorized'}), 401
    details = db.get_application_with_details(app_id)
    if not details:
        return jsonify({'error': 'Application not found'}), 404
    # Students can accept only their own offers
    if details['student_id'] != session['user_id']:
        return jsonify({'error': 'Forbidden'}), 403
    if details['status'] != 'Approved':
        return jsonify({'error': 'Offer not approved yet'}), 400

    room_number = None
    if details['on_campus']:
        # Simple room allocation strategy
        room_number = f"{details['block'] or 'Block'}-{int(datetime.now().timestamp()) % 1000}"
    updated = db.update_application_status(app_id, 'Accepted', room_number)
    if not updated:
        return jsonify({'error': 'Failed to update'}), 500
    
    # Send offer accepted email
    try:
        send_offer_accepted_email(
            f"{details['first_name']} {details['last_name']}",
            details['residence_name'],
            room_number or '',
            details['email']
        )
    except Exception as e:
        print(f"Failed to send offer accepted email: {e}")
    
    return jsonify({'success': True, 'room_number': room_number})

@app.route('/api/applications/<int:app_id>/reject_offer', methods=['POST'])
def api_reject_offer(app_id):
    if 'user_id' not in session or session['user_type'] != 'student':
        return jsonify({'error': 'Unauthorized'}), 401
    details = db.get_application_with_details(app_id)
    if not details:
        return jsonify({'error': 'Application not found'}), 404
    if details['student_id'] != session['user_id']:
        return jsonify({'error': 'Forbidden'}), 403
    if details['status'] != 'Approved':
        return jsonify({'error': 'Offer not approved yet'}), 400
    updated = db.update_application_status(app_id, 'Rejected')
    if not updated:
        return jsonify({'error': 'Failed to update'}), 500
    
    # Send offer rejected email
    try:
        send_offer_rejected_email(
            f"{details['first_name']} {details['last_name']}",
            details['residence_name'],
            details['email']
        )
    except Exception as e:
        print(f"Failed to send offer rejected email: {e}")
    
    return jsonify({'success': True})

@app.route('/api/offcampus/<int:residence_id>/accepted/pdf', methods=['GET'])
def api_offcampus_pdf(residence_id):
    if 'user_id' not in session or session['user_type'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 401
    # Lazily import reportlab if it wasn't available at startup
    global REPORTLAB_AVAILABLE, A4, colors, SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, getSampleStyleSheet
    if not REPORTLAB_AVAILABLE:
        try:
            from reportlab.lib.pagesizes import A4 as _A4
            from reportlab.lib import colors as _colors
            from reportlab.platypus import SimpleDocTemplate as _SimpleDocTemplate, Paragraph as _Paragraph, Spacer as _Spacer, Table as _Table, TableStyle as _TableStyle
            from reportlab.lib.styles import getSampleStyleSheet as _getSampleStyleSheet
            A4 = _A4
            colors = _colors
            SimpleDocTemplate = _SimpleDocTemplate
            Paragraph = _Paragraph
            Spacer = _Spacer
            Table = _Table
            TableStyle = _TableStyle
            getSampleStyleSheet = _getSampleStyleSheet
            REPORTLAB_AVAILABLE = True
        except Exception:
            return jsonify({'error': 'PDF generation library not installed'}), 500
    res = db.get_residence_by_id(residence_id)
    if not res or res['on_campus'] != 0:
        return jsonify({'error': 'Residence not found or not off-campus'}), 404
    rows = db.get_accepted_offcampus_students(residence_id)

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    styles = getSampleStyleSheet()
    elements = []
    elements.append(Paragraph(f"Accepted Students - {res['residence_name']}", styles['Title']))
    elements.append(Spacer(1, 12))
    
    if not rows:
        elements.append(Paragraph("No accepted students for this residence yet.", styles['Normal']))
    else:
        data = [["Name", "Student ID", "Email"]]
        for s in rows:
            data.append([f"{s['first_name']} {s['last_name']}", s['student_number'], s['email']])
        table = Table(data, repeatRows=1)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.lightgrey),
            ('GRID', (0,0), (-1,-1), 0.5, colors.grey),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold')
        ]))
        elements.append(table)
    
    doc.build(elements)
    buffer.seek(0)
    return send_file(buffer, mimetype='application/pdf', as_attachment=True, download_name=f"accepted_{res['residence_name'].replace(' ', '_')}.pdf")

@app.route('/api/residences/stats', methods=['GET'])
def api_residences_stats():
    if 'user_id' not in session or session['user_type'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 401
    # Ensure known off-campus residences exist (from OffCampus.html)
    default_off = [
        'M Sherly Sibasa',
        'Muthathe Residence',
        'Simeka Heights',
        'Maphula Residence',
        'Emlanjeni Residence',
        'Grand Royale',
        '589 Residence'
    ]
    for name in default_off:
        db.upsert_residence(name, '', False, 'offcamp', 10, 'none')
    rows = db.get_residences(None, None)
    out = []
    for r in rows:
        accepted = db.count_accepted_for_residence(r['id'])
        out.append({
            'id': r['id'],
            'residence_name': r['residence_name'],
            'block': r['block'],
            'on_campus': r['on_campus'],
            'residence_type': r['residence_type'],
            'available_rooms': r['available_rooms'],
            'restrictions': r['restrictions'],
            'accepted_count': accepted
        })
    return jsonify(out)

def send_email(to_email: str, subject: str, message: str):
    smtp_host = os.getenv('SMTP_HOST')
    smtp_port = int(os.getenv('SMTP_PORT', '587'))
    smtp_user = os.getenv('SMTP_USER')
    smtp_pass = os.getenv('SMTP_PASS')
    smtp_from = os.getenv('SMTP_FROM', smtp_user or 'no-reply@example.com')
    if not smtp_host or not smtp_user or not smtp_pass:
        # Fallback to console if SMTP not configured
        print(f"📧 Email to {to_email}: {subject} -> {message}")
        return
    try:
        msg = MIMEText(message, 'html')  # Use HTML format for better formatting
        msg['Subject'] = subject
        msg['From'] = smtp_from
        msg['To'] = to_email
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.sendmail(smtp_from, [to_email], msg.as_string())
    except Exception as e:
        print(f"❌ Failed to send email to {to_email}: {e}")

def send_application_submitted_email(student_name: str, residence_names: list, application_date: str, to_email: str):
    """Send email when application is successfully submitted"""
    residence_list = ", ".join(residence_names)
    subject = "Your Accommodation Application Has Been Successfully Submitted 🎉"
    
    message = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #2c5aa0;">🎉 Congratulations! Your Accommodation Application Has Been Submitted</h2>
        
        <p>Dear <strong>{student_name}</strong>,</p>
        
        <p>Thank you for applying for accommodation at <strong>University of Venda</strong>! 🎓</p>
        
        <p>We're happy to confirm that your application for <strong>{residence_list}</strong> has been successfully submitted on <strong>{application_date}</strong>.</p>
        
        <h3 style="color: #2c5aa0;">Here's what happens next:</h3>
        <ul>
            <li>Our team will review your application carefully.</li>
            <li>You can track your application status anytime on the "My Applications" page in your student portal.</li>
            <li>We'll notify you via email as soon as a decision has been made.</li>
        </ul>
        
        <p>We appreciate your interest in joining our student housing community and look forward to the possibility of welcoming you soon.</p>
        
        <p>If you have any questions or need help, feel free to reach out to us at <strong>Student.Housing@univen.ac.za</strong> or <strong>+27 15 962 9218</strong>.</p>
        
        <p style="margin-top: 30px;">
            <strong>Warm regards,</strong><br>
            <strong>University Housing Team</strong><br>
            <strong>University of Venda</strong>
        </p>
    </body>
    </html>
    """
    
    send_email(to_email, subject, message)

def send_application_approved_email(student_name: str, residence_name: str, application_date: str, to_email: str):
    """Send email when application is approved"""
    subject = "🎉 Congratulations! Your Accommodation Application Has Been Approved"
    
    message = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #2c5aa0;">🎉 Congratulations! Your Accommodation Application Has Been Approved</h2>
        
        <p>Dear <strong>{student_name}</strong>,</p>
        
        <p>We are delighted to inform you that your application for accommodation at <strong>{residence_name}</strong> has been approved! 🎉</p>
        
        <h3 style="color: #2c5aa0;">Here are the details of your application:</h3>
        <ul>
            <li><strong>Residence:</strong> {residence_name}</li>
            <li><strong>Application Date:</strong> {application_date}</li>
            <li><strong>Status:</strong> <span style="color: green; font-weight: bold;">Approved</span></li>
        </ul>
        
        <h3 style="color: #2c5aa0;">What's next?</h3>
        <ul>
            <li>Please log in to your student portal under "My Applications" to review the details of your offer.</li>
            <li>You will have the option to accept or reject the offer.</li>
            <li>If you accept, you will receive your room number and final move-in instructions.</li>
            <li>If you reject, your spot will be offered to another student on the waiting list.</li>
        </ul>
        
        <p>We are excited to welcome you to our student housing community and look forward to having you as part of the family!</p>
        
        <p>If you have any questions or need assistance, please do not hesitate to reach out to us at <strong>Student.Housing@univen.ac.za</strong> or <strong>+27 15 962 9218</strong>.</p>
        
        <p style="margin-top: 30px;">
            <strong>Warm regards,</strong><br>
            <strong>University Housing Team</strong><br>
            <strong>University of Venda</strong>
        </p>
    </body>
    </html>
    """
    
    send_email(to_email, subject, message)

def send_application_rejected_email(student_name: str, residence_name: str, to_email: str):
    """Send email when application is rejected"""
    subject = "Update on Your Accommodation Application"
    
    message = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #2c5aa0;">Update on Your Accommodation Application</h2>
        
        <p>Dear <strong>{student_name}</strong>,</p>
        
        <p>Thank you for your interest in accommodation at <strong>University of Venda</strong>.</p>
        
        <p>After careful consideration, we regret to inform you that your application for <strong>{residence_name}</strong> has not been successful this time. We understand this may be disappointing, and we want to assure you that this decision was made based on limited availability and high demand for spaces.</p>
        
        <h3 style="color: #2c5aa0;">We encourage you to:</h3>
        <ul>
            <li>Check the student portal for other available residences you may wish to apply for.</li>
            <li>Stay updated on future openings as cancellations and new opportunities may arise.</li>
        </ul>
        
        <p>We truly appreciate your interest and wish you the very best with your studies and housing search. If you have any questions or need assistance exploring other options, please contact us at <strong>Student.Housing@univen.ac.za</strong> or <strong>+27 15 962 9218</strong>.</p>
        
        <p style="margin-top: 30px;">
            <strong>Warm regards,</strong><br>
            <strong>University Housing Team</strong><br>
            <strong>University of Venda</strong>
        </p>
    </body>
    </html>
    """
    
    send_email(to_email, subject, message)

def send_offer_accepted_email(student_name: str, residence_name: str, room_number: str, to_email: str):
    """Send email when student accepts an offer"""
    subject = "Room Assigned" if room_number else "Offer Accepted"
    
    room_info = f"<p><strong>Your room number is: {room_number}</strong></p>" if room_number else ""
    
    message = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #2c5aa0;">🎉 Congratulations! Your Accommodation Offer Has Been Accepted</h2>
        
        <p>Dear <strong>{student_name}</strong>,</p>
        
        <p>We are thrilled to confirm that you have successfully accepted your accommodation offer for <strong>{residence_name}</strong>! 🎉</p>
        
        {room_info}
        
        <h3 style="color: #2c5aa0;">Next Steps:</h3>
        <ul>
            <li>You will receive final move-in instructions via email within the next few days.</li>
            <li>Please ensure all required documentation is ready for your move-in date.</li>
            <li>If you have any questions about your accommodation, please contact us immediately.</li>
        </ul>
        
        <p>Welcome to our student housing community! We look forward to having you as part of our family.</p>
        
        <p>If you have any questions or need assistance, please do not hesitate to reach out to us at <strong>Student.Housing@univen.ac.za</strong> or <strong>+27 15 962 9218</strong>.</p>
        
        <p style="margin-top: 30px;">
            <strong>Warm regards,</strong><br>
            <strong>University Housing Team</strong><br>
            <strong>University of Venda</strong>
        </p>
    </body>
    </html>
    """
    
    send_email(to_email, subject, message)

def send_offer_rejected_email(student_name: str, residence_name: str, to_email: str):
    """Send email when student rejects an offer"""
    subject = "Offer Rejected"
    
    message = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #2c5aa0;">Accommodation Offer Rejected</h2>
        
        <p>Dear <strong>{student_name}</strong>,</p>
        
        <p>We have received your decision to reject the accommodation offer for <strong>{residence_name}</strong>.</p>
        
        <p>We understand that circumstances change and respect your decision. Your spot will now be offered to another student on the waiting list.</p>
        
        <p>If you change your mind or would like to apply for other available residences, please log in to your student portal and submit a new application.</p>
        
        <p>We wish you the best with your studies and housing search.</p>
        
        <p>If you have any questions or need assistance, please do not hesitate to reach out to us at <strong>Student.Housing@univen.ac.za</strong> or <strong>+27 15 962 9218</strong>.</p>
        
        <p style="margin-top: 30px;">
            <strong>Warm regards,</strong><br>
            <strong>University Housing Team</strong><br>
            <strong>University of Venda</strong>
        </p>
    </body>
    </html>
    """
    
    send_email(to_email, subject, message)

@app.route('/api/email/test', methods=['POST'])
def api_email_test():
    if 'user_id' not in session or session.get('user_type') != 'admin':
        return jsonify({'error': 'Unauthorized'}), 401
    payload = request.get_json() or {}
    to_email = payload.get('to') or os.getenv('SMTP_FROM') or 'test@example.com'
    try:
        send_email(to_email, 'SMTP Test', 'This is a test email from Univen Housing Portal.')
        return jsonify({'success': True, 'to': to_email})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ----------------- PASSWORD RESET -----------------
import secrets
import time

# Store OTPs temporarily (in production, use Redis or database)
otp_storage = {}

@app.route('/api/password-reset/request', methods=['POST'])
def request_password_reset():
    data = request.get_json()
    email = data.get('email', '').strip()
    
    if not email:
        return jsonify({'error': 'Email is required'}), 400
    
    # Check if email exists in database
    student = None
    admin_exists = False
    
    # Check if it's a student email format or direct email
    if '@mvula.univen.ac.za' in email:
        # Extract student number and find student
        student_number = email.split('@')[0]
        student = db.get_student_by_number(student_number)
        if student:
            # Use the actual email from database, not the generated one
            email = student['email']
    else:
        # Check if it's a direct email address
        # First check if it's admin
        if email == 'admin@demo.com':
            admin_exists = True
        else:
            # Check if it's a student's actual email
            students = db.get_all_students()
            for s in students:
                if s['email'] == email:
                    student = s
                    break
    
    if not student and not admin_exists:
        return jsonify({'error': 'Email not found in our system'}), 404
    
    # Generate 6-digit OTP
    otp = str(secrets.randbelow(900000) + 100000)
    
    # Store OTP with expiration (5 minutes)
    otp_storage[email] = {
        'otp': otp,
        'expires': time.time() + 300,  # 5 minutes
        'user_type': 'student' if student else 'admin'
    }
    
    # Send OTP via email
    try:
        subject = "Password Reset Verification Code"
        message = f"""
        <html>
        <body>
            <h2>Password Reset Verification</h2>
            <p>You have requested to reset your password. Use the following verification code:</p>
            <h1 style="color: #007bff; font-size: 32px; text-align: center; margin: 20px 0;">{otp}</h1>
            <p>This code will expire in 5 minutes.</p>
            <p>If you did not request this password reset, please ignore this email.</p>
            <p>Best regards,<br>University Housing Team</p>
        </body>
        </html>
        """
        send_email(email, subject, message)
        return jsonify({'success': True, 'message': 'OTP sent to your email', 'actual_email': email})
    except Exception as e:
        print(f"Failed to send password reset email: {e}")
        return jsonify({'error': 'Failed to send email. Please try again.'}), 500

@app.route('/api/password-reset/verify', methods=['POST'])
def verify_password_reset():
    data = request.get_json()
    email = data.get('email', '').strip()
    otp = data.get('otp', '').strip()
    new_password = data.get('new_password', '').strip()
    
    if not email or not otp:
        return jsonify({'error': 'Email and OTP are required'}), 400
    
    # Check if OTP exists and is valid
    if email not in otp_storage:
        return jsonify({'error': 'Invalid or expired OTP'}), 400
    
    stored_data = otp_storage[email]
    
    # Check if OTP has expired
    if time.time() > stored_data['expires']:
        del otp_storage[email]
        return jsonify({'error': 'OTP has expired. Please request a new one.'}), 400
    
    # Verify OTP
    if otp != stored_data['otp']:
        return jsonify({'error': 'Invalid OTP'}), 400
    
    # If new_password is provided, update the password
    if new_password:
        if len(new_password) < 8:
            return jsonify({'error': 'Password must be at least 8 characters'}), 400
        
        try:
            if stored_data['user_type'] == 'student':
                # Find student by email
                students = db.get_all_students()
                student = None
                for s in students:
                    if s['email'] == email:
                        student = s
                        break
                
                if student:
                    hashed_password = generate_password_hash(new_password)
                    db.update_student_password(student['id'], hashed_password)
                    del otp_storage[email]  # Remove OTP after successful password change
                    return jsonify({'success': True, 'message': 'Password updated successfully'})
                else:
                    return jsonify({'error': 'Student not found'}), 404
            else:
                # For admin, we'd need to implement admin password update
                return jsonify({'error': 'Admin password reset not implemented yet'}), 501
        except Exception as e:
            print(f"Error updating password: {e}")
            return jsonify({'error': 'Failed to update password'}), 500
    else:
        # Just verify OTP without changing password
        return jsonify({'success': True, 'message': 'OTP verified successfully'})

# ----------------- LOGOUT -----------------
@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('home'))

# ----------------- MAIN -----------------
if __name__ == '__main__':
    app.run(debug=True, port=5000)
