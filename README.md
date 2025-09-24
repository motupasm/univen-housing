# 🏠 Univen Housing Portal

A comprehensive student housing management system for the University of Venda (Univen) that provides transparent, fair, and accessible housing allocation for all students.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [API Endpoints](#api-endpoints)
- [Database Schema](#database-schema)
- [File Structure](#file-structure)
- [Screenshots](#screenshots)
- [Contributing](#contributing)
- [License](#license)

## 🎯 Overview

The Univen Housing Portal is a modern web application designed to streamline the student housing allocation process at the University of Venda. It eliminates chaos, prevents double bookings, and ensures safe accommodation for all students through a transparent and user-friendly system.

### Key Problems Solved:
- **Housing Chaos**: Eliminates confusion in housing allocation
- **Double Bookings**: Prevents multiple students from booking the same space
- **Transparency**: Provides clear visibility into application status
- **Fair Allocation**: Ensures equal opportunity for all students
- **Safety**: Maintains separate male and female accommodations

## ✨ Features

### 🎓 Student Features
- **Easy Registration**: Simple student account creation
- **Residence Selection**: Choose from male, female, or off-campus residences
- **Application Management**: Track application status in real-time
- **Offer Management**: Accept or reject housing offers
- **Mobile Responsive**: Works perfectly on all devices
- **Password Reset**: Secure password recovery with OTP

### 👨‍💼 Admin Features
- **Application Review**: Approve or reject student applications
- **Student Management**: View and manage all registered students
- **Residence Management**: Monitor all available accommodations
- **PDF Reports**: Generate reports for accepted students
- **Email Notifications**: Send automated status updates
- **Real-time Dashboard**: Live statistics and monitoring

### 🏢 System Features
- **Secure Authentication**: Session-based user management
- **Email Integration**: Automated notifications via SMTP
- **PDF Generation**: Dynamic report creation
- **Database Management**: MySQL with connection pooling
- **Responsive Design**: Mobile-first approach
- **Error Handling**: Comprehensive error management

## 🛠️ Technology Stack

### Backend
- **Python 3.8+**
- **Flask 2.3.3** - Web framework
- **MySQL 8.0+** - Database
- **mysql-connector-python 8.1.0** - Database connector
- **Werkzeug 2.3.7** - Security utilities
- **ReportLab 4.2.2** - PDF generation
- **python-dotenv 1.0.0** - Environment management

### Frontend
- **HTML5** - Markup
- **CSS3** - Styling with responsive design
- **JavaScript (ES6+)** - Client-side functionality
- **Font Awesome 6.4.0** - Icons
- **Bootstrap Icons** - Additional icons

### Infrastructure
- **Flask-CORS 4.0.0** - Cross-origin resource sharing
- **SMTP** - Email delivery
- **Connection Pooling** - Database optimization

## 🚀 Installation

### Prerequisites
- Python 3.8 or higher
- MySQL 8.0 or higher
- Git

### Step 1: Clone the Repository
```bash
git clone <repository-url>
cd project-finale2
```

### Step 2: Create Virtual Environment
```bash
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate
```

### Step 3: Install Dependencies
```bash
pip install -r requirements.txt
```

### Step 4: Database Setup
1. Create MySQL database:
```sql
CREATE DATABASE univen_accommodation;
```

2. Initialize database schema:
```bash
python init_db.py
```

### Step 5: Environment Configuration
Create a `.env` file in the root directory:
```env
SECRET_KEY=your-secret-key-here
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your-mysql-password
DB_NAME=univen_accommodation
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=your-email@gmail.com
```

### Step 6: Run the Application
```bash
python app.py
```

The application will be available at `http://localhost:5000`

## ⚙️ Configuration

### Database Configuration
The application uses MySQL with connection pooling for optimal performance:
- **Pool Size**: 32 connections
- **Max Overflow**: 20 additional connections
- **SSL**: Disabled for local development
- **Charset**: UTF-8

### Email Configuration
For Gmail SMTP setup:
1. Enable 2-Step Verification
2. Generate App Password
3. Use App Password in `.env` file

### Security Features
- **Password Hashing**: Werkzeug security
- **Session Management**: Flask sessions
- **CSRF Protection**: Built-in Flask protection
- **Input Validation**: Server-side validation

## 📱 Usage

### For Students

1. **Registration**
   - Visit the homepage
   - Click "Login" → "Student" tab
   - Enter student number and create password

2. **Apply for Housing**
   - Login to dashboard
   - Click "Apply for Housing"
   - Choose On-Campus or Off-Campus
   - Select residences (max 2 on-campus, unlimited off-campus)
   - Submit application

3. **Track Applications**
   - View "My Applications" section
   - See application status (Pending/Approved/Rejected/Accepted)
   - Accept or reject approved offers

### For Administrators

1. **Admin Login**
   - Use admin credentials: `admin@demo.com` / `admin123`

2. **Review Applications**
   - View all student applications
   - Approve or reject applications
   - Send email notifications

3. **Generate Reports**
   - Download PDF reports for accepted students
   - View residence statistics

## 🔌 API Endpoints

### Authentication
- `POST /api/login` - User login
- `GET /logout` - User logout

### Applications
- `POST /api/applications` - Create new application
- `GET /api/applications/me` - Get student applications
- `GET /api/applications` - Get all applications (admin)
- `POST /api/applications/{id}/approve` - Approve application
- `POST /api/applications/{id}/reject` - Reject application
- `POST /api/applications/{id}/accept` - Accept offer
- `POST /api/applications/{id}/reject_offer` - Reject offer

### Students
- `GET /api/students` - Get all students (admin)
- `POST /api/students` - Create student account

### Residences
- `GET /api/residences/stats` - Get residence statistics
- `GET /api/offcampus/{id}/accepted/pdf` - Download PDF report

### Password Reset
- `POST /api/password-reset/request` - Request OTP
- `POST /api/password-reset/verify` - Verify OTP and reset password

### Email
- `POST /api/email/test` - Send test email (admin)

## 🗄️ Database Schema

### Students Table
```sql
CREATE TABLE students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    gender ENUM('Male', 'Female', 'Other'),
    student_number VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Residences Table
```sql
CREATE TABLE residences (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type ENUM('male', 'female', 'off-campus') NOT NULL,
    on_campus BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Applications Table
```sql
CREATE TABLE applications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    residence_id INT NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending',
    apply_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    room_number VARCHAR(50),
    FOREIGN KEY (student_id) REFERENCES students(id),
    FOREIGN KEY (residence_id) REFERENCES residences(id),
    UNIQUE (student_id, residence_id)
);
```

## 📁 File Structure

```
project-finale2/
├── app.py                 # Main Flask application
├── database.py           # Database connection and queries
├── init_db.py           # Database initialization
├── init.sql             # SQL schema file
├── requirements.txt     # Python dependencies
├── .env                 # Environment variables (create this)
├── README.md           # This file
│
├── Assets/             # Static assets
│   ├── univen_logo.png
│   ├── health_science_building.png
│   └── [residence images]
│
├── css/               # Stylesheets
│   ├── index.css
│   ├── login.css
│   ├── Dashboard.css
│   ├── Admin.css
│   ├── maleRes.css
│   ├── femaleRes.css
│   ├── offCampus.css
│   └── resetpassword.css
│
├── js/                # JavaScript files
│   ├── login.js
│   ├── Dashboard.js
│   ├── Admin.js
│   ├── maleRes.js
│   ├── on_off compus.js
│   └── resetpassword.js
│
├── templates/         # HTML templates
│   ├── index.html
│   ├── login.html
│   ├── Dashboard.html
│   ├── Admin.html
│   ├── female.html
│   ├── maleRes.Html
│   ├── OffCampus.html
│   └── resetpassword.html
│
└── venv/             # Virtual environment
```

## 📸 Screenshots

### Homepage
- Clean, modern landing page with university branding
- Responsive design for all devices
- Clear call-to-action buttons

### Student Dashboard
- Application management interface
- Real-time status updates
- Easy navigation between sections

### Admin Panel
- Comprehensive application review system
- Student and residence management
- PDF report generation

### Mobile Experience
- Fully responsive design
- Touch-friendly interface
- Optimized for mobile devices

## 🔧 Development

### Running in Development Mode
```bash
export FLASK_ENV=development
python app.py
```

### Database Migrations
To update the database schema:
1. Modify the SQL in `init.sql`
2. Run `python init_db.py`

### Adding New Features
1. Create new routes in `app.py`
2. Add corresponding database methods in `database.py`
3. Update frontend JavaScript files
4. Add responsive CSS if needed

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Check MySQL service is running
   - Verify database credentials in `.env`
   - Ensure database exists

2. **Email Not Sending**
   - Verify SMTP credentials
   - Check Gmail App Password setup
   - Test with `/api/email/test` endpoint

3. **PDF Generation Error**
   - Ensure ReportLab is installed
   - Check file permissions
   - Verify residence data exists

4. **Mobile Display Issues**
   - Clear browser cache
   - Check viewport meta tag
   - Test on different devices

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support

For support and questions:
- Email: Student.Housing@univen.ac.za
- Phone: +27 15 962 9218

## 🎉 Acknowledgments

- University of Venda for the opportunity
- Flask community for excellent documentation
- Font Awesome for beautiful icons
- All contributors and testers

---

**Built with ❤️ for the University of Venda students**
"# univen-housing" 
